'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

export type PlataformaRed = 'linkedin' | 'instagram' | 'facebook' | 'x' | 'tiktok';
export type EstadoPublicacion =
  | 'borrador'
  | 'en_revision'
  | 'aprobada'
  | 'programada'
  | 'publicada'
  | 'archivada';

export interface PublicacionRedRow {
  id: string;
  plataforma: PlataformaRed;
  titulo: string;
  contenido: string;
  hashtags: string[] | null;
  imagen_url: string | null;
  estado: EstadoPublicacion;
  programada_para: string | null;
  publicada_at: string | null;
  generada_con_ia: boolean | null;
  prompt_original: string | null;
  notas: string | null;
  aprobada_por: string | null;
  aprobada_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type Resultado = { exito: boolean; mensaje: string; id?: string };

const PLATAFORMAS_VALIDAS: PlataformaRed[] = ['linkedin', 'instagram', 'facebook', 'x', 'tiktok'];

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

function refrescar() {
  revalidatePath('/dashboard/admin/redes');
}

function parsePlataforma(v: unknown): PlataformaRed | null {
  const s = String(v ?? '');
  return (PLATAFORMAS_VALIDAS as string[]).includes(s) ? (s as PlataformaRed) : null;
}

function parseHashtags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x: unknown): x is string => typeof x === 'string')
    .map((s) => s.replace(/^#/, '').trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export interface GuardarPublicacionInput {
  id?: string | null;
  plataforma: PlataformaRed;
  titulo: string;
  contenido: string;
  hashtags?: string[];
  imagen_url?: string | null;
  estado?: EstadoPublicacion;
  programada_para?: string | null;
  generada_con_ia?: boolean;
  prompt_original?: string | null;
  notas?: string | null;
}

export async function guardarPublicacion(input: GuardarPublicacionInput): Promise<Resultado> {
  try {
    const adminId = await asegurarAdmin();

    const plataforma = parsePlataforma(input.plataforma);
    const titulo = input.titulo?.trim();
    const contenido = input.contenido?.trim();
    const hashtags = parseHashtags(input.hashtags);

    if (!plataforma) return { exito: false, mensaje: 'Plataforma inválida.' };
    if (!titulo) return { exito: false, mensaje: 'El título es obligatorio.' };
    if (!contenido) return { exito: false, mensaje: 'El contenido es obligatorio.' };

    const supabase = await createClient();

    const payload = {
      plataforma,
      titulo,
      contenido,
      hashtags: hashtags.length > 0 ? hashtags : null,
      imagen_url: input.imagen_url?.trim() || null,
      estado: (input.estado ?? 'borrador') as EstadoPublicacion,
      programada_para: input.programada_para?.trim() || null,
      generada_con_ia: input.generada_con_ia ?? true,
      prompt_original: input.prompt_original?.trim() || null,
      notas: input.notas?.trim() || null,
    };

    if (input.id) {
      const { error } = await supabase
        .from('publicaciones_redes')
        .update(payload)
        .eq('id', input.id);
      if (error) return { exito: false, mensaje: error.message };
      refrescar();
      return { exito: true, mensaje: 'Publicación actualizada.', id: input.id };
    }

    const { data, error } = await supabase
      .from('publicaciones_redes')
      .insert({ ...payload, created_by: adminId })
      .select('id')
      .single();
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Borrador guardado.', id: data?.id };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function aprobarPublicacion(id: string): Promise<Resultado> {
  try {
    const adminId = await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('publicaciones_redes')
      .update({
        estado: 'aprobada' satisfies EstadoPublicacion,
        aprobada_por: adminId,
        aprobada_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('estado', ['borrador', 'en_revision']);
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Publicación aprobada.' };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function programarPublicacion(id: string, fecha: string): Promise<Resultado> {
  try {
    await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };
    const f = fecha?.trim();
    if (!f) return { exito: false, mensaje: 'Fecha inválida.' };
    const ts = new Date(f);
    if (Number.isNaN(ts.getTime())) {
      return { exito: false, mensaje: 'Fecha inválida.' };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('publicaciones_redes')
      .update({
        estado: 'programada' satisfies EstadoPublicacion,
        programada_para: ts.toISOString(),
      })
      .eq('id', id);
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Publicación programada.' };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function marcarComoPublicada(id: string): Promise<Resultado> {
  try {
    await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('publicaciones_redes')
      .update({
        estado: 'publicada' satisfies EstadoPublicacion,
        publicada_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Marcada como publicada.' };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function archivarPublicacion(id: string): Promise<Resultado> {
  try {
    await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('publicaciones_redes')
      .update({ estado: 'archivada' satisfies EstadoPublicacion })
      .eq('id', id);
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Archivada.' };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// Solo permite eliminar borradores para evitar perder historial.
export async function eliminarPublicacion(id: string): Promise<Resultado> {
  try {
    await asegurarAdmin();
    if (!id) return { exito: false, mensaje: 'ID inválido.' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('publicaciones_redes')
      .delete()
      .eq('id', id)
      .eq('estado', 'borrador');
    if (error) return { exito: false, mensaje: error.message };
    refrescar();
    return { exito: true, mensaje: 'Borrador eliminado.' };
  } catch (e) {
    return { exito: false, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
