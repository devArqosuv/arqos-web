'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

type Resultado = { exito: boolean; mensaje: string };

const ESTADOS_CONTROLADOR = [
  'visita_realizada',
  'preavaluo',
  'revision',
  'firma',
  'aprobado',
  'rechazado',
];

// ────────────────────────────────────────────────────────────
// Payload de los 3 enfoques SHF + conciliación + declaraciones
// ────────────────────────────────────────────────────────────
export interface EnfoquesSHFPayload {
  // Enfoque físico / costos
  valor_unitario: number | null;
  valor_construcciones: number | null;
  depreciacion: number | null;
  valor_fisico_total: number | null;

  // Enfoque de mercado
  investigacion_mercado: string | null;
  rango_valores: string | null;
  homologacion: string | null;
  resultado_mercado: number | null;

  // Homologación por comparable (JSON almacenado en la columna `homologacion` legible)
  factores_por_comparable: ComparableHomologacion[];

  // Enfoque de ingresos
  aplica_ingresos: boolean;
  cap_ingresos: number | null;
  cap_tasa: number | null;
  cap_valor: number | null;

  // Conciliación
  conciliacion_comparacion: string | null;
  conciliacion_ponderacion: {
    fisico: number;
    mercado: number;
    ingresos: number;
  } | null;
  conciliacion_justificacion: string | null;

  // Declaraciones
  declaracion_alcance: string | null;
  declaracion_supuestos: string | null;
  declaracion_limitaciones: string | null;
}

export interface ComparableHomologacion {
  comparable_id: string;
  factor_ubicacion: number;
  factor_superficie: number;
  factor_edad: number;
  factor_conservacion: number;
}

// ────────────────────────────────────────────────────────────
// Asegura que el caller sea controlador y tenga acceso al avalúo
// ────────────────────────────────────────────────────────────
async function asegurarControlador(avaluoId: string): Promise<string> {
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

  if (perfil?.rol !== 'controlador' && perfil?.rol !== 'administrador') {
    throw new Error('Esta acción requiere rol controlador.');
  }

  const { data: avaluo } = await supabase
    .from('avaluos')
    .select('controlador_id, estado')
    .eq('id', avaluoId)
    .single();

  if (!avaluo) throw new Error('Avalúo no encontrado.');

  if (avaluo.controlador_id === user.id) return user.id;
  if (
    avaluo.controlador_id == null &&
    ESTADOS_CONTROLADOR.includes(avaluo.estado)
  ) {
    const { error: errAssign } = await supabase
      .from('avaluos')
      .update({ controlador_id: user.id })
      .eq('id', avaluoId);
    if (errAssign)
      throw new Error(`No se pudo autoasignar el avalúo: ${errAssign.message}`);
    return user.id;
  }

  throw new Error('Este avalúo está asignado a otro controlador.');
}

// ────────────────────────────────────────────────────────────
// Serializa el payload a columnas de la tabla `avaluos`
// ────────────────────────────────────────────────────────────
function serializarPayload(payload: EnfoquesSHFPayload): Record<string, unknown> {
  // La columna `homologacion` es TEXT. Guardamos el JSON de factores junto con
  // la justificación humana para mantener compatibilidad sin cambiar esquema.
  const homologacionTexto = payload.homologacion?.trim() ?? '';
  const factoresJson = JSON.stringify(payload.factores_por_comparable ?? []);
  const homologacionCombinada = `${homologacionTexto}\n---FACTORES_JSON---\n${factoresJson}`;

  const ponderacion = payload.conciliacion_ponderacion
    ? JSON.stringify(payload.conciliacion_ponderacion)
    : null;

  return {
    // Enfoque físico
    valor_unitario: payload.valor_unitario,
    valor_construcciones: payload.valor_construcciones,
    depreciacion: payload.depreciacion,
    valor_fisico_total: payload.valor_fisico_total,
    // Enfoque de mercado
    investigacion_mercado: payload.investigacion_mercado,
    rango_valores: payload.rango_valores,
    homologacion: homologacionCombinada,
    resultado_mercado:
      payload.resultado_mercado != null ? String(payload.resultado_mercado) : null,
    // Enfoque de ingresos
    cap_ingresos: payload.aplica_ingresos ? payload.cap_ingresos : null,
    cap_tasa: payload.aplica_ingresos ? payload.cap_tasa : null,
    cap_valor: payload.aplica_ingresos ? payload.cap_valor : null,
    // Conciliación
    conciliacion_comparacion: payload.conciliacion_comparacion,
    conciliacion_ponderacion: ponderacion,
    conciliacion_justificacion: payload.conciliacion_justificacion,
    // Declaraciones
    declaracion_alcance: payload.declaracion_alcance,
    declaracion_supuestos: payload.declaracion_supuestos,
    declaracion_limitaciones: payload.declaracion_limitaciones,
  };
}

// ────────────────────────────────────────────────────────────
// GUARDAR BORRADOR — actualiza los campos sin cambiar estado
// ────────────────────────────────────────────────────────────
export async function guardarEnfoquesSHFAction(
  avaluoId: string,
  payload: EnfoquesSHFPayload,
): Promise<Resultado> {
  try {
    await asegurarControlador(avaluoId);
    const supabase = await createClient();

    const actualizaciones = serializarPayload(payload);

    const { error } = await supabase
      .from('avaluos')
      .update(actualizaciones)
      .eq('id', avaluoId);

    if (error) {
      return { exito: false, mensaje: `Error al guardar: ${error.message}` };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    return { exito: true, mensaje: 'Borrador guardado correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// Calcula el valor conciliado a partir de los 3 enfoques y pesos
// ────────────────────────────────────────────────────────────
function calcularValorConciliado(payload: EnfoquesSHFPayload): number | null {
  const pesos = payload.conciliacion_ponderacion;
  if (!pesos) return null;

  const fisico = Number(payload.valor_fisico_total ?? 0);
  const mercado = Number(payload.resultado_mercado ?? 0);
  const ingresos = payload.aplica_ingresos ? Number(payload.cap_valor ?? 0) : 0;

  const pesoF = Number(pesos.fisico ?? 0) / 100;
  const pesoM = Number(pesos.mercado ?? 0) / 100;
  const pesoI = payload.aplica_ingresos ? Number(pesos.ingresos ?? 0) / 100 : 0;

  const resultado = fisico * pesoF + mercado * pesoM + ingresos * pesoI;
  if (!Number.isFinite(resultado) || resultado <= 0) return null;
  return Math.round(resultado * 100) / 100;
}

// ────────────────────────────────────────────────────────────
// GENERAR PREAVALÚO SHF — valida, calcula, cambia estado
// ────────────────────────────────────────────────────────────
export async function generarPreavaluoSHFAction(
  avaluoId: string,
  payload: EnfoquesSHFPayload,
): Promise<Resultado> {
  try {
    const userId = await asegurarControlador(avaluoId);
    const supabase = await createClient();

    // ── Validaciones ──
    if (
      payload.valor_fisico_total == null ||
      payload.valor_fisico_total <= 0
    ) {
      return {
        exito: false,
        mensaje: 'Completa el enfoque físico (valor físico total > 0).',
      };
    }

    if (payload.resultado_mercado == null || payload.resultado_mercado <= 0) {
      return {
        exito: false,
        mensaje: 'Completa el enfoque de mercado (resultado > 0).',
      };
    }

    if (payload.aplica_ingresos) {
      if (payload.cap_valor == null || payload.cap_valor <= 0) {
        return {
          exito: false,
          mensaje:
            'Marcaste que aplica el enfoque de ingresos: captura ingresos y tasa > 0.',
        };
      }
    }

    const pesos = payload.conciliacion_ponderacion;
    if (!pesos) {
      return {
        exito: false,
        mensaje: 'Captura los pesos de conciliación (suma debe ser 100%).',
      };
    }

    const sumaPesos =
      Number(pesos.fisico ?? 0) +
      Number(pesos.mercado ?? 0) +
      (payload.aplica_ingresos ? Number(pesos.ingresos ?? 0) : 0);
    if (Math.abs(sumaPesos - 100) > 0.01) {
      return {
        exito: false,
        mensaje: `Los pesos de conciliación deben sumar 100% (actual: ${sumaPesos.toFixed(2)}%).`,
      };
    }

    if (
      !payload.conciliacion_justificacion ||
      payload.conciliacion_justificacion.trim().length < 10
    ) {
      return {
        exito: false,
        mensaje: 'La justificación de la conciliación debe tener al menos 10 caracteres.',
      };
    }

    const valorConciliado = calcularValorConciliado(payload);
    if (!valorConciliado) {
      return {
        exito: false,
        mensaje: 'No se pudo calcular el valor conciliado. Revisa los valores.',
      };
    }

    // ── Verificar estado ──
    const { data: avaluo } = await supabase
      .from('avaluos')
      .select('estado')
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { exito: false, mensaje: 'Avalúo no encontrado.' };
    if (!['visita_realizada', 'preavaluo'].includes(avaluo.estado)) {
      return {
        exito: false,
        mensaje: `El avalúo está en estado "${avaluo.estado}". Solo se puede generar preavalúo desde "visita_realizada" o "preavaluo".`,
      };
    }

    // ── Persistir ──
    const actualizaciones = {
      ...serializarPayload(payload),
      valor_uv: valorConciliado,
    };

    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update(actualizaciones)
      .eq('id', avaluoId);

    if (errUpdate) {
      return {
        exito: false,
        mensaje: `Error al guardar enfoques: ${errUpdate.message}`,
      };
    }

    // Si ya estaba en "preavaluo" no cambiamos estado (solo recalculamos)
    if (avaluo.estado === 'visita_realizada') {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'fn_cambiar_estado_avaluo',
        {
          p_avaluo_id: avaluoId,
          p_nuevo_estado: 'preavaluo',
          p_usuario_id: userId,
          p_comentario: `Preavalúo SHF generado: $${valorConciliado.toLocaleString('es-MX')} MXN (3 enfoques + conciliación)`,
        },
      );

      if (rpcError || !rpcData?.exito) {
        return {
          exito: false,
          mensaje:
            rpcData?.mensaje ||
            rpcError?.message ||
            'No se pudo cambiar el estado.',
        };
      }
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);

    return {
      exito: true,
      mensaje: `Preavalúo SHF generado: $${valorConciliado.toLocaleString('es-MX')} MXN.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
