'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';
import type { RolUsuario } from '@/types/arqos';

type Resultado = { exito: boolean; mensaje: string };

export type TipoNoticia = 'info' | 'actualizacion' | 'alerta' | 'mantenimiento';

const TIPOS_VALIDOS: TipoNoticia[] = ['info', 'actualizacion', 'alerta', 'mantenimiento'];
const ROLES_VALIDOS: RolUsuario[] = ['administrador', 'evaluador', 'controlador'];

async function asegurarAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

function parseRoles(input: unknown): RolUsuario[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => String(r))
    .filter((r): r is RolUsuario => ROLES_VALIDOS.includes(r as RolUsuario));
}

function parseTipo(input: unknown): TipoNoticia {
  const v = String(input ?? '');
  return (TIPOS_VALIDOS.includes(v as TipoNoticia) ? v : 'info') as TipoNoticia;
}

export interface CrearNoticiaInput {
  titulo: string;
  contenido: string;
  tipo: TipoNoticia;
  roles_destinatarios: RolUsuario[];
  fecha_expiracion?: string | null;
}

export async function crearNoticia(input: CrearNoticiaInput): Promise<Resultado> {
  try {
    const adminId = await asegurarAdmin();

    const titulo = input.titulo?.trim();
    const contenido = input.contenido?.trim();
    const tipo = parseTipo(input.tipo);
    const roles = parseRoles(input.roles_destinatarios);
    const fechaExp = input.fecha_expiracion?.trim() || null;

    if (!titulo) return { exito: false, mensaje: 'El título es obligatorio.' };
    if (!contenido) return { exito: false, mensaje: 'El contenido es obligatorio.' };
    if (roles.length === 0) {
      return { exito: false, mensaje: 'Selecciona al menos un rol destinatario.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('noticias').insert({
      titulo,
      contenido,
      tipo,
      roles_destinatarios: roles,
      fecha_expiracion: fechaExp,
      created_by: adminId,
      activa: true,
    });

    if (error) return { exito: false, mensaje: error.message };

    revalidatePath('/dashboard/admin/noticias');
    revalidatePath('/dashboard/valuador/inicio');
    revalidatePath('/dashboard/controlador');
    return { exito: true, mensaje: 'Noticia publicada.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

export interface EditarNoticiaInput {
  id: string;
  titulo: string;
  contenido: string;
  tipo: TipoNoticia;
  roles_destinatarios: RolUsuario[];
  fecha_expiracion?: string | null;
  activa: boolean;
}

export async function editarNoticia(input: EditarNoticiaInput): Promise<Resultado> {
  try {
    await asegurarAdmin();

    if (!input.id) return { exito: false, mensaje: 'ID inválido.' };

    const titulo = input.titulo?.trim();
    const contenido = input.contenido?.trim();
    const tipo = parseTipo(input.tipo);
    const roles = parseRoles(input.roles_destinatarios);
    const fechaExp = input.fecha_expiracion?.trim() || null;

    if (!titulo) return { exito: false, mensaje: 'El título es obligatorio.' };
    if (!contenido) return { exito: false, mensaje: 'El contenido es obligatorio.' };
    if (roles.length === 0) {
      return { exito: false, mensaje: 'Selecciona al menos un rol destinatario.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('noticias')
      .update({
        titulo,
        contenido,
        tipo,
        roles_destinatarios: roles,
        fecha_expiracion: fechaExp,
        activa: input.activa,
      })
      .eq('id', input.id);

    if (error) return { exito: false, mensaje: error.message };

    revalidatePath('/dashboard/admin/noticias');
    revalidatePath('/dashboard/valuador/inicio');
    revalidatePath('/dashboard/controlador');
    return { exito: true, mensaje: 'Noticia actualizada.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// Soft delete: marca activa=false para preservar el historial.
export async function eliminarNoticia(id: string): Promise<Resultado> {
  try {
    await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };

    const supabase = await createClient();
    const { error } = await supabase
      .from('noticias')
      .update({ activa: false })
      .eq('id', id);

    if (error) return { exito: false, mensaje: error.message };

    revalidatePath('/dashboard/admin/noticias');
    revalidatePath('/dashboard/valuador/inicio');
    revalidatePath('/dashboard/controlador');
    return { exito: true, mensaje: 'Noticia archivada.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
