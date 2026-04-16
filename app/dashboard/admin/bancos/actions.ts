'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface BancoInput {
  nombre: string;
  logo_url: string | null;
  color_hex: string | null;
  activo: boolean;
  orden: number;
}

export interface BancoDocumentoInput {
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  orden: number;
}

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

// ─────── BANCOS ───────
export async function crearBanco(input: BancoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    if (!input.nombre.trim()) return { ok: false, error: 'El nombre es obligatorio' };

    const supabase = await createClient();
    const { error } = await supabase.from('bancos').insert({
      nombre: input.nombre.trim(),
      logo_url: input.logo_url,
      color_hex: input.color_hex,
      activo: input.activo,
      orden: input.orden,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function actualizarBanco(id: string, input: BancoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('bancos')
      .update({
        nombre: input.nombre.trim(),
        logo_url: input.logo_url,
        color_hex: input.color_hex,
        activo: input.activo,
        orden: input.orden,
      })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function eliminarBanco(id: string): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    const supabase = await createClient();
    const { error } = await supabase.from('bancos').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// ─────── DOCUMENTOS POR BANCO ───────
export async function crearBancoDocumento(bancoId: string, input: BancoDocumentoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    if (!input.nombre.trim()) return { ok: false, error: 'El nombre es obligatorio' };

    const supabase = await createClient();
    const { error } = await supabase.from('banco_documentos').insert({
      banco_id: bancoId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion,
      obligatorio: input.obligatorio,
      orden: input.orden,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function actualizarBancoDocumento(id: string, input: BancoDocumentoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('banco_documentos')
      .update({
        nombre: input.nombre.trim(),
        descripcion: input.descripcion,
        obligatorio: input.obligatorio,
        orden: input.orden,
      })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function eliminarBancoDocumento(id: string): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    const supabase = await createClient();
    const { error } = await supabase.from('banco_documentos').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/bancos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
