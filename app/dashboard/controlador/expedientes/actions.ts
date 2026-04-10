'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/util/supabase/server';

type Resultado = { exito: boolean; mensaje: string };

// Verifica que el caller sea controlador y tenga acceso al avalúo.
// Si nadie lo tiene asignado y está en un estado que requiere atención,
// se autoasigna al usuario actual.
const ESTADOS_CONTROLADOR = ['visita_realizada', 'preavaluo', 'revision', 'firma', 'aprobado', 'rechazado'];

async function asegurarControlador(avaluoId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  // Validar que el caller sea controlador (o admin)
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

  // Caso 1: ya soy el controlador asignado
  if (avaluo.controlador_id === user.id) return user.id;

  // Caso 2: nadie está asignado y el estado es válido → autoasignar
  if (avaluo.controlador_id == null && ESTADOS_CONTROLADOR.includes(avaluo.estado)) {
    const { error: errAssign } = await supabase
      .from('avaluos')
      .update({ controlador_id: user.id })
      .eq('id', avaluoId);
    if (errAssign) throw new Error(`No se pudo autoasignar el avalúo: ${errAssign.message}`);
    return user.id;
  }

  // Caso 3: alguien más lo tiene
  throw new Error('Este avalúo está asignado a otro controlador.');
}

// ────────────────────────────────────────────────────────────
// AGREGAR COMPARABLE
// ────────────────────────────────────────────────────────────
export async function agregarComparableAction(formData: FormData): Promise<Resultado> {
  try {
    const avaluoId = String(formData.get('avaluoId') || '');
    if (!avaluoId) return { exito: false, mensaje: 'Avalúo no especificado.' };

    const userId = await asegurarControlador(avaluoId);

    // Lectura de campos
    const calle = String(formData.get('calle') || '').trim() || null;
    const colonia = String(formData.get('colonia') || '').trim() || null;
    const municipio = String(formData.get('municipio') || '').trim();
    const estado_inmueble = String(formData.get('estado_inmueble') || '').trim();
    const tipo_inmueble = String(formData.get('tipo_inmueble') || 'otro');
    const tipo = String(formData.get('tipo') || 'venta');           // venta/renta
    const superficie_terreno = parseFloat(String(formData.get('superficie_terreno') || '0')) || null;
    const superficie_construccion = parseFloat(String(formData.get('superficie_construccion') || '0')) || null;
    const precio = parseFloat(String(formData.get('precio') || '0'));
    const moneda = String(formData.get('moneda') || 'MXN');
    const fuente = String(formData.get('fuente') || '').trim() || null;
    const url_fuente = String(formData.get('url_fuente') || '').trim() || null;
    const fechaPub = String(formData.get('fecha_publicacion') || '').trim();
    const fecha_publicacion = fechaPub || null;
    const notas = String(formData.get('notas') || '').trim() || null;

    // Validación mínima
    if (!municipio || !estado_inmueble) {
      return { exito: false, mensaje: 'Municipio y estado son obligatorios.' };
    }
    if (!precio || precio <= 0) {
      return { exito: false, mensaje: 'El precio debe ser mayor a cero.' };
    }
    if (!superficie_construccion || superficie_construccion <= 0) {
      return { exito: false, mensaje: 'La superficie de construcción debe ser mayor a cero (necesaria para el cálculo).' };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('comparables').insert({
      avaluo_id: avaluoId,
      calle,
      colonia,
      municipio,
      estado_inmueble,
      tipo_inmueble,
      tipo,
      superficie_terreno,
      superficie_construccion,
      precio,
      moneda,
      fuente,
      url_fuente,
      fecha_publicacion,
      notas,
      estado: 'aprobado',                  // El controlador lo aprueba al capturarlo
      created_by: userId,
    });

    if (error) {
      return { exito: false, mensaje: `Error al guardar comparable: ${error.message}` };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    return { exito: true, mensaje: 'Comparable agregado correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// ELIMINAR COMPARABLE
// ────────────────────────────────────────────────────────────
export async function eliminarComparableAction(
  avaluoId: string,
  comparableId: string
): Promise<Resultado> {
  try {
    await asegurarControlador(avaluoId);

    const supabase = await createClient();
    const { error } = await supabase
      .from('comparables')
      .delete()
      .eq('id', comparableId)
      .eq('avaluo_id', avaluoId);

    if (error) {
      return { exito: false, mensaje: error.message };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    return { exito: true, mensaje: 'Comparable eliminado.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// GENERAR PREAVALÚO
//   visita_realizada → preavaluo
//   valor_uv = avg(precio_m2 de comparables) × superficie_construccion del inmueble
// ────────────────────────────────────────────────────────────
export async function generarPreavaluoAction(avaluoId: string): Promise<Resultado> {
  try {
    const userId = await asegurarControlador(avaluoId);

    const supabase = await createClient();

    // Cargar el avalúo (necesitamos superficie y estado)
    const { data: avaluo } = await supabase
      .from('avaluos')
      .select('id, estado, superficie_construccion, superficie_terreno')
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { exito: false, mensaje: 'Avalúo no encontrado.' };
    if (avaluo.estado !== 'visita_realizada') {
      return {
        exito: false,
        mensaje: `El avalúo está en estado "${avaluo.estado}". Solo se puede generar preavalúo desde "visita_realizada".`,
      };
    }

    // Cargar comparables aprobados
    const { data: comparables } = await supabase
      .from('comparables')
      .select('id, precio_m2, superficie_construccion, precio')
      .eq('avaluo_id', avaluoId)
      .eq('estado', 'aprobado');

    if (!comparables || comparables.length === 0) {
      return { exito: false, mensaje: 'Necesitas al menos 1 comparable aprobado para generar el preavalúo.' };
    }

    // Calcular promedio de precio_m2
    const valoresM2 = comparables
      .map((c) => Number(c.precio_m2))
      .filter((v) => Number.isFinite(v) && v > 0);

    if (valoresM2.length === 0) {
      return { exito: false, mensaje: 'Los comparables no tienen precio_m2 calculable.' };
    }

    const promedioM2 = valoresM2.reduce((a, b) => a + b, 0) / valoresM2.length;

    // Determinar superficie a usar (preferir construcción, si no terreno)
    const superficie = Number(avaluo.superficie_construccion) || Number(avaluo.superficie_terreno);
    if (!superficie || superficie <= 0) {
      return {
        exito: false,
        mensaje: 'El inmueble no tiene superficie de construcción ni terreno registrada.',
      };
    }

    const valorUV = Math.round(promedioM2 * superficie * 100) / 100;

    // Guardar valor_uv
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({ valor_uv: valorUV })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al guardar valor_uv: ${errUpdate.message}` };
    }

    // Cambiar estado visita_realizada → preavaluo
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'preavaluo',
      p_usuario_id: userId,
      p_comentario: `Preavalúo generado: $${valorUV.toLocaleString('es-MX')} (promedio ${valoresM2.length} comparables)`,
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);

    return {
      exito: true,
      mensaje: `Preavalúo generado: $${valorUV.toLocaleString('es-MX')} MXN. Enviado al valuador para su revisión.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// DEVOLVER A PREAVALUO (controlador rechaza el ajuste y pide re-ajuste)
//   revision → preavaluo
// ────────────────────────────────────────────────────────────
export async function devolverAPrevaluoAction(
  avaluoId: string,
  motivo: string,
): Promise<Resultado> {
  try {
    const userId = await asegurarControlador(avaluoId);

    if (!motivo || motivo.trim().length < 10) {
      return { exito: false, mensaje: 'El motivo debe tener al menos 10 caracteres.' };
    }

    const supabase = await createClient();

    // RPC atómica que valida estado, controlador asignado, guarda motivo
    // y cambia el estado en una sola operación.
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_devolver_a_preavaluo', {
      p_avaluo_id:  avaluoId,
      p_usuario_id: userId,
      p_motivo:     motivo.trim(),
    });

    if (rpcError || !rpcData?.exito) {
      return {
        exito: false,
        mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo devolver el avalúo.',
      };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/valuador/expedientes/${avaluoId}`);
    return { exito: true, mensaje: 'Avalúo devuelto al valuador para re-ajuste.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// PASAR A FIRMA (controlador acepta el valor del valuador)
//   revision → firma
// ────────────────────────────────────────────────────────────
export async function pasarAFirmaAction(avaluoId: string): Promise<Resultado> {
  try {
    const userId = await asegurarControlador(avaluoId);

    const supabase = await createClient();
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'firma',
      p_usuario_id: userId,
      p_comentario: 'Valor confirmado, expediente pasa a firma',
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo cambiar el estado.' };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    return { exito: true, mensaje: 'Expediente pasó a firma.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}
