'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';
import type { CategoriaDocumento } from '@/types/arqos';

type Resultado = { exito: boolean; mensaje: string };

const MIME_PERMITIDOS_FOTOS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// Verifica que el avalúo pertenece al valuador autenticado y devuelve el id del usuario
async function asegurarPropietarioAvaluo(avaluoId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { data: avaluo } = await supabase
    .from('avaluos')
    .select('valuador_id, solicitante_id')
    .eq('id', avaluoId)
    .single();

  if (!avaluo) throw new Error('Avalúo no encontrado.');
  if (avaluo.valuador_id !== user.id && avaluo.solicitante_id !== user.id) {
    throw new Error('No tienes permiso para modificar este avalúo.');
  }

  return user.id;
}

// ────────────────────────────────────────────────────────────
// AGENDAR VISITA
// captura → agenda_visita
// ────────────────────────────────────────────────────────────
export async function agendarVisitaAction(
  avaluoId: string,
  fechaIso: string
): Promise<Resultado> {
  try {
    const userId = await asegurarPropietarioAvaluo(avaluoId);

    if (!fechaIso) {
      return { exito: false, mensaje: 'Selecciona una fecha y hora para la visita.' };
    }

    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return { exito: false, mensaje: 'Fecha inválida.' };
    }
    if (fecha.getTime() < Date.now() - 60 * 1000) {
      return { exito: false, mensaje: 'La fecha de visita debe ser futura.' };
    }

    const supabase = await createClient();

    // Guardar fecha agendada
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({ fecha_visita_agendada: fecha.toISOString() })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al guardar fecha: ${errUpdate.message}` };
    }

    // Cambiar estado captura → agenda_visita usando el RPC del SQL
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'agenda_visita',
      p_usuario_id: userId,
      p_comentario: `Visita agendada para ${fecha.toLocaleString('es-MX')}`,
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/evaluador/expedientes/${avaluoId}`);
    revalidatePath('/dashboard/evaluador/expedientes');

    return { exito: true, mensaje: 'Visita agendada correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// SUBIR FOTOS DE LA VISITA Y MARCAR COMO REALIZADA
// agenda_visita → visita_realizada
// Espera EXACTO: 1 fachada + 2 entorno + 8 interior
// ────────────────────────────────────────────────────────────
export async function subirFotosVisitaAction(formData: FormData): Promise<Resultado> {
  try {
    const avaluoId = String(formData.get('avaluoId') || '');
    if (!avaluoId) return { exito: false, mensaje: 'Avalúo no especificado.' };

    const userId = await asegurarPropietarioAvaluo(avaluoId);

    const fachadas = formData.getAll('fachada') as File[];
    const entornos = formData.getAll('entorno') as File[];
    const interiores = formData.getAll('interior') as File[];

    // Validación estricta de cantidades
    if (fachadas.length !== 1) {
      return { exito: false, mensaje: 'Debes subir exactamente 1 foto de fachada.' };
    }
    if (entornos.length !== 2) {
      return { exito: false, mensaje: 'Debes subir exactamente 2 fotos de entorno.' };
    }
    if (interiores.length !== 8) {
      return { exito: false, mensaje: 'Debes subir exactamente 8 fotos de interior.' };
    }

    // Validar todos los formatos antes de empezar a subir
    type FotoTask = { file: File; categoria: CategoriaDocumento; etiqueta: string };
    const tareas: FotoTask[] = [
      ...fachadas.map((f) => ({ file: f, categoria: 'fachada' as const, etiqueta: 'Fachada' })),
      ...entornos.map((f, i) => ({ file: f, categoria: 'entorno' as const, etiqueta: `Entorno ${i + 1}` })),
      ...interiores.map((f, i) => ({ file: f, categoria: 'interior' as const, etiqueta: `Interior ${i + 1}` })),
    ];

    for (const t of tareas) {
      const ext = (t.file.name.split('.').pop() || '').toLowerCase();
      if (!MIME_PERMITIDOS_FOTOS[ext]) {
        return {
          exito: false,
          mensaje: `Foto "${t.etiqueta}" tiene formato inválido. Usa JPG, PNG o WEBP.`,
        };
      }
      if (t.file.size === 0) {
        return { exito: false, mensaje: `Foto "${t.etiqueta}" está vacía.` };
      }
    }

    const supabase = await createClient();

    // Subir todas las fotos al storage y registrar en `documentos`
    const erroresUpload: string[] = [];
    for (const t of tareas) {
      const ext = (t.file.name.split('.').pop() || 'jpg').toLowerCase();
      const contentType = MIME_PERMITIDOS_FOTOS[ext];
      const storagePath = `avaluos/${avaluoId}/visita/${t.categoria}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: errUpload } = await supabase.storage
        .from('documentos')
        .upload(storagePath, t.file, { contentType, upsert: false });

      if (errUpload) {
        erroresUpload.push(`${t.etiqueta}: ${errUpload.message}`);
        continue;
      }

      const { error: errInsert } = await supabase.from('documentos').insert({
        avaluo_id: avaluoId,
        nombre: t.etiqueta,
        descripcion: `Foto ${t.categoria} de la visita`,
        bucket: 'documentos',
        storage_path: storagePath,
        tipo_mime: contentType,
        tamanio_bytes: t.file.size,
        categoria: t.categoria,
        created_by: userId,
      });

      if (errInsert) {
        erroresUpload.push(`${t.etiqueta}: ${errInsert.message}`);
      }
    }

    if (erroresUpload.length > 0) {
      return {
        exito: false,
        mensaje: `Algunas fotos fallaron:\n${erroresUpload.join('\n')}`,
      };
    }

    // Marcar visita como realizada y cambiar estado
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({ fecha_visita_realizada: new Date().toISOString() })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al actualizar fecha: ${errUpdate.message}` };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'visita_realizada',
      p_usuario_id: userId,
      p_comentario: 'Visita realizada y 11 fotografías subidas',
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/evaluador/expedientes/${avaluoId}`);
    revalidatePath('/dashboard/evaluador/expedientes');

    return { exito: true, mensaje: 'Visita registrada y 11 fotografías subidas correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// AJUSTAR VALOR DEL VALUADOR Y ENVIAR A REVISIÓN
// preavaluo → revision
// El valuador escribe su valor (puede ser igual al UV o diferente).
// ────────────────────────────────────────────────────────────
export async function ajustarYEnviarRevisionAction(
  avaluoId: string,
  valorValuador: number
): Promise<Resultado> {
  try {
    const userId = await asegurarPropietarioAvaluo(avaluoId);

    if (!Number.isFinite(valorValuador) || valorValuador <= 0) {
      return { exito: false, mensaje: 'El valor debe ser mayor a cero.' };
    }

    const supabase = await createClient();

    // Validar que el avalúo esté en preavaluo
    const { data: avaluo } = await supabase
      .from('avaluos')
      .select('estado, valor_uv')
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { exito: false, mensaje: 'Avalúo no encontrado.' };
    if (avaluo.estado !== 'preavaluo') {
      return {
        exito: false,
        mensaje: `El avalúo está en "${avaluo.estado}". Solo se puede ajustar desde "preavaluo".`,
      };
    }

    // Guardar el valor del valuador
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({ valor_valuador: valorValuador })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al guardar valor: ${errUpdate.message}` };
    }

    // Calcular comentario con la diferencia
    const valorUV = Number(avaluo.valor_uv) || 0;
    const diff = valorValuador - valorUV;
    const pct = valorUV > 0 ? ((diff / valorUV) * 100).toFixed(2) : '0';
    const comentario = diff === 0
      ? `Valuador acepta el valor UV: $${valorValuador.toLocaleString('es-MX')}`
      : `Valuador ajusta a $${valorValuador.toLocaleString('es-MX')} (${diff >= 0 ? '+' : ''}${pct}% vs UV)`;

    // Cambiar estado preavaluo → revision
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'revision',
      p_usuario_id: userId,
      p_comentario: comentario,
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/evaluador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);

    return { exito: true, mensaje: 'Valor enviado al controlador para revisión final.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
