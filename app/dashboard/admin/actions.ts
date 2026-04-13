'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';
import { createAdminClient } from '@/util/supabase/admin';
import type { RolUsuario } from '@/types/arqos';

type Resultado = { exito: boolean; mensaje: string };

// Verifica que quien ejecuta la action es administrador.
// Si no lo es, lanza error para cortar la operación.
async function asegurarAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol !== 'administrador') {
    throw new Error('Acceso denegado: se requiere rol administrador.');
  }

  return user.id;
}

// ────────────────────────────────────────────────────────────
// CREAR USUARIO
// ────────────────────────────────────────────────────────────
export async function crearUsuarioAction(formData: FormData): Promise<Resultado> {
  try {
    await asegurarAdmin();

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const nombre = String(formData.get('nombre') || '').trim();
    const apellidos = String(formData.get('apellidos') || '').trim();
    const rol = String(formData.get('rol') || '') as RolUsuario;

    if (!email || !password || !nombre || !rol) {
      return { exito: false, mensaje: 'Faltan campos obligatorios.' };
    }
    if (password.length < 5) {
      return { exito: false, mensaje: 'La contraseña debe tener al menos 5 caracteres.' };
    }
    if (!['administrador', 'controlador', 'evaluador'].includes(rol)) {
      return { exito: false, mensaje: 'Rol inválido.' };
    }

    const admin = createAdminClient();

    // Crear usuario en auth.users (el trigger fn_crear_perfil_usuario crea el perfil)
    const { data: nuevo, error: errorAuth } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol },
    });

    if (errorAuth || !nuevo.user) {
      return { exito: false, mensaje: errorAuth?.message || 'No se pudo crear el usuario.' };
    }

    // Reafirmar el perfil (por si el trigger no aplicó el rol correcto)
    await admin
      .from('perfiles')
      .upsert({
        id: nuevo.user.id,
        email,
        nombre,
        apellidos: apellidos || null,
        rol,
        activo: true,
      }, { onConflict: 'id' });

    revalidatePath('/dashboard/admin');
    return { exito: true, mensaje: `Usuario ${email} creado correctamente.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// ACTUALIZAR USUARIO (email, contraseña, nombre, rol, estado)
// ────────────────────────────────────────────────────────────
export async function actualizarUsuarioAction(formData: FormData): Promise<Resultado> {
  try {
    await asegurarAdmin();

    const id = String(formData.get('id') || '');
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const nombre = String(formData.get('nombre') || '').trim();
    const apellidos = String(formData.get('apellidos') || '').trim();
    const rol = String(formData.get('rol') || '') as RolUsuario;
    const activo = formData.get('activo') === 'true';

    if (!id || !email || !nombre || !rol) {
      return { exito: false, mensaje: 'Faltan campos obligatorios.' };
    }
    if (password && password.length < 5) {
      return { exito: false, mensaje: 'La contraseña debe tener al menos 5 caracteres.' };
    }

    const admin = createAdminClient();

    // Actualizar auth.users (email y password si se proporcionó)
    const authPayload: { email?: string; password?: string } = { email };
    if (password) authPayload.password = password;

    const { error: errorAuth } = await admin.auth.admin.updateUserById(id, authPayload);
    if (errorAuth) {
      return { exito: false, mensaje: `Error en Auth: ${errorAuth.message}` };
    }

    // Actualizar perfil
    const { error: errorPerfil } = await admin
      .from('perfiles')
      .update({
        email,
        nombre,
        apellidos: apellidos || null,
        rol,
        activo,
      })
      .eq('id', id);

    if (errorPerfil) {
      return { exito: false, mensaje: `Error en perfil: ${errorPerfil.message}` };
    }

    revalidatePath('/dashboard/admin');
    return { exito: true, mensaje: 'Usuario actualizado correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// ELIMINAR USUARIO
// ────────────────────────────────────────────────────────────
export async function eliminarUsuarioAction(id: string): Promise<Resultado> {
  try {
    const adminId = await asegurarAdmin();

    if (id === adminId) {
      return { exito: false, mensaje: 'No puedes eliminar tu propia cuenta.' };
    }

    const admin = createAdminClient();

    // Borrar de auth.users (cascade borra el perfil por la FK ON DELETE CASCADE)
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return { exito: false, mensaje: error.message };
    }

    revalidatePath('/dashboard/admin');
    return { exito: true, mensaje: 'Usuario eliminado correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
