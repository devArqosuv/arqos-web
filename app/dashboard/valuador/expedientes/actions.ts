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

    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);
    revalidatePath('/dashboard/valuador/expedientes');

    return { exito: true, mensaje: 'Visita agendada correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// SUBIR FOTOS DE LA VISITA Y MARCAR COMO REALIZADA
// agenda_visita → visita_realizada
// Espera: 1 fachada + 1 portada + 2 entorno + 5 a 8 interior
// ────────────────────────────────────────────────────────────
export async function subirFotosVisitaAction(formData: FormData): Promise<Resultado> {
  try {
    const avaluoId = String(formData.get('avaluoId') || '');
    if (!avaluoId) return { exito: false, mensaje: 'Avalúo no especificado.' };

    const userId = await asegurarPropietarioAvaluo(avaluoId);

    const fachadas = formData.getAll('fachada') as File[];
    const portadas = formData.getAll('portada') as File[];
    const entornos = formData.getAll('entorno') as File[];
    const interiores = formData.getAll('interior') as File[];

    // GPS capturado del navegador — se aplica a todas las fotos de la visita
    const gpsRaw = String(formData.get('gps') || '');
    let gpsParsed: { lat: number; lng: number; accuracy: number } | null = null;
    if (gpsRaw) {
      try {
        const parsed = JSON.parse(gpsRaw);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          gpsParsed = parsed as { lat: number; lng: number; accuracy: number };
        }
      } catch {
        // GPS inválido — no bloqueamos, seguimos sin GPS
      }
    }

    // Verificación de servicios — llega como JSON string, se guarda en columna jsonb
    const serviciosRaw = String(formData.get('servicios') || '');
    let serviciosParsed: Record<string, string> | null = null;
    if (serviciosRaw) {
      try {
        const parsed = JSON.parse(serviciosRaw);
        if (parsed && typeof parsed === 'object') {
          serviciosParsed = parsed as Record<string, string>;
        }
      } catch {
        return { exito: false, mensaje: 'Los servicios enviados no son un JSON válido.' };
      }
    }
    // Validar que los 6 servicios estén presentes
    const SERVICIOS_REQUERIDOS = ['agua', 'luz', 'alumbrado_publico', 'banquetas', 'tipo_calles', 'telefono_internet'];
    const faltantes = SERVICIOS_REQUERIDOS.filter((k) => !serviciosParsed?.[k]);
    if (faltantes.length > 0) {
      return { exito: false, mensaje: `Faltan servicios por llenar: ${faltantes.join(', ')}.` };
    }

    // Validación estricta de cantidades
    if (fachadas.length !== 1) {
      return { exito: false, mensaje: 'Debes subir exactamente 1 foto de fachada.' };
    }
    if (portadas.length !== 1) {
      return { exito: false, mensaje: 'Debes subir exactamente 1 foto de portada.' };
    }
    if (entornos.length !== 2) {
      return { exito: false, mensaje: 'Debes subir exactamente 2 fotos de entorno.' };
    }
    if (interiores.length < 5 || interiores.length > 8) {
      return { exito: false, mensaje: 'Debes subir entre 5 y 8 fotos de interior.' };
    }

    // Validar todos los formatos antes de empezar a subir
    type FotoTask = { file: File; categoria: CategoriaDocumento; etiqueta: string };
    const tareas: FotoTask[] = [
      ...fachadas.map((f) => ({ file: f, categoria: 'fachada' as const, etiqueta: 'Fachada' })),
      ...portadas.map((f) => ({ file: f, categoria: 'portada' as const, etiqueta: 'Portada' })),
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
        // Georreferenciación: se aplica la misma ubicación a todas las fotos
        // de la visita (capturada una sola vez del browser).
        ...(gpsParsed ? {
          latitud:          gpsParsed.lat,
          longitud:         gpsParsed.lng,
          gps_accuracy:     gpsParsed.accuracy,
          gps_capturado_at: new Date().toISOString(),
        } : {}),
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

    // Marcar visita como realizada, guardar servicios y cambiar estado
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({
        fecha_visita_realizada: new Date().toISOString(),
        verificacion_servicios: serviciosParsed,
      })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al actualizar fecha: ${errUpdate.message}` };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'visita_realizada',
      p_usuario_id: userId,
      p_comentario: `Visita realizada y ${tareas.length} fotografías subidas`,
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);
    revalidatePath('/dashboard/valuador/expedientes');

    return { exito: true, mensaje: `Visita registrada y ${tareas.length} fotografías subidas correctamente.` };
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

    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);

    return { exito: true, mensaje: 'Valor enviado al controlador para revisión final.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// APLICAR ANÁLISIS DE FOTOS IA (Claude Vision)
//
// Recibe los campos ya aprobados por el valuador (tras haberlos revisado
// en el modal) y los guarda en la tabla avaluos. Solo se escriben los
// campos que tienen valor (no null / no vacíos).
// ────────────────────────────────────────────────────────────
export async function aplicarAnalisisFotosAction(
  avaluoId: string,
  campos: {
    estado_conservacion?: string | null;
    construccion_predominante?: string | null;
    tipo_zona?: string | null;
    observaciones?: string | null; // se agrega a notas
  },
): Promise<Resultado> {
  try {
    await asegurarPropietarioAvaluo(avaluoId);
    const supabase = await createClient();

    const updates: Record<string, string> = {};
    if (campos.estado_conservacion) updates.estado_conservacion = campos.estado_conservacion;
    if (campos.construccion_predominante) updates.construccion_predominante = campos.construccion_predominante;
    if (campos.tipo_zona) updates.tipo_zona = campos.tipo_zona;

    // Si trae observaciones, agrégalas al campo notas (sin sobrescribir lo previo)
    if (campos.observaciones && campos.observaciones.trim()) {
      const { data: actual } = await supabase
        .from('avaluos')
        .select('notas')
        .eq('id', avaluoId)
        .single();

      const prefijo = actual?.notas ? `${actual.notas}\n\n` : '';
      updates.notas = `${prefijo}[Análisis IA de fotos] ${campos.observaciones.trim()}`;
    }

    if (Object.keys(updates).length === 0) {
      return { exito: false, mensaje: 'No hay campos para aplicar.' };
    }

    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update(updates)
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al guardar: ${errUpdate.message}` };
    }

    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);

    return { exito: true, mensaje: 'Análisis aplicado al expediente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
