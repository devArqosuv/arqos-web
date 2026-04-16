'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface CostoInput {
  servicio: string;
  plan: string | null;
  costo_mensual: number;
  moneda: string;
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

export async function crearCosto(input: CostoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    if (!input.servicio.trim()) return { ok: false, error: 'Servicio obligatorio' };

    const supabase = await createClient();
    const { error } = await supabase.from('configuracion_costos').insert({
      servicio: input.servicio.trim(),
      plan: input.plan,
      costo_mensual: input.costo_mensual,
      moneda: input.moneda || 'USD',
      notas: input.notas,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/costos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function actualizarCosto(id: string, input: CostoInput): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };

    const supabase = await createClient();
    const { error } = await supabase
      .from('configuracion_costos')
      .update({
        servicio: input.servicio.trim(),
        plan: input.plan,
        costo_mensual: input.costo_mensual,
        moneda: input.moneda || 'USD',
        notas: input.notas,
      })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/costos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function eliminarCosto(id: string): Promise<ActionResult> {
  try {
    if (!(await verificarAdmin())) return { ok: false, error: 'No autorizado' };
    const supabase = await createClient();
    const { error } = await supabase.from('configuracion_costos').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard/admin/costos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
