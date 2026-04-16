'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface TarifaInput {
  tipo_avaluo_codigo: string;
  nombre: string;
  rango_valor_min: number | null;
  rango_valor_max: number | null;
  precio: number;
  moneda: string;
  activa: boolean;
  notas: string | null;
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

export async function crearTarifa(input: TarifaInput): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };

    if (!input.tipo_avaluo_codigo || !input.nombre || !Number.isFinite(input.precio)) {
      return { ok: false, error: 'Faltan campos obligatorios' };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('tarifas').insert({
      tipo_avaluo_codigo: input.tipo_avaluo_codigo,
      nombre: input.nombre,
      rango_valor_min: input.rango_valor_min,
      rango_valor_max: input.rango_valor_max,
      precio: input.precio,
      moneda: input.moneda || 'MXN',
      activa: input.activa,
      notas: input.notas,
    });

    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/tarifas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function actualizarTarifa(id: string, input: TarifaInput): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };

    const supabase = await createClient();
    const { error } = await supabase
      .from('tarifas')
      .update({
        tipo_avaluo_codigo: input.tipo_avaluo_codigo,
        nombre: input.nombre,
        rango_valor_min: input.rango_valor_min,
        rango_valor_max: input.rango_valor_max,
        precio: input.precio,
        moneda: input.moneda || 'MXN',
        activa: input.activa,
        notas: input.notas,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/tarifas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function toggleTarifaActiva(id: string, activa: boolean): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };

    const supabase = await createClient();
    const { error } = await supabase
      .from('tarifas')
      .update({ activa, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/tarifas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function eliminarTarifa(id: string): Promise<ActionResult> {
  try {
    const adminId = await verificarAdmin();
    if (!adminId) return { ok: false, error: 'No autorizado' };

    const supabase = await createClient();
    const { error } = await supabase.from('tarifas').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/tarifas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
