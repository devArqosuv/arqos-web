'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type RolUsuario = 'administrador' | 'evaluador' | 'controlador';

async function verificarAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();
  if (perfil?.rol !== 'administrador') return null;
  return user.id;
}

export async function toggleUsuarioActivo(id: string, activo: boolean): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };
    if (id === adminId && !activo) {
      return { ok: false, error: 'No puedes desactivar tu propia cuenta' };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('perfiles')
      .update({ activo })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function cambiarRolUsuario(id: string, rol: RolUsuario): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };
    if (!['administrador', 'evaluador', 'controlador'].includes(rol)) {
      return { ok: false, error: 'Rol inválido' };
    }
    if (id === adminId && rol !== 'administrador') {
      return { ok: false, error: 'No puedes degradar tu propio rol' };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('perfiles')
      .update({ rol })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
