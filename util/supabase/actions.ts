'use server'

import { createClient } from '@/util/supabase/server'
import { CrearAvaluoPayload, GuardarAvaluoResult, TipoInmueble, CategoriaDocumento } from '@/types/arqos'

// ============================================================
// ARQUITECTURA DE UPLOADS:
//
// Antes: el cliente mandaba los Files a esta server action y Vercel
// los pasaba por su límite de body de 4.5 MB → request rejected.
//
// Ahora (Direct Upload):
//   1. Cliente llama crearAvaluoVacioAction() → recibe { id, folio }
//   2. Cliente sube los archivos DIRECTO a Supabase Storage usando el
//      browser client (sin pasar por Vercel — bypassea cualquier cap)
//   3. Cliente llama registrarDocumentosAction() con la lista de paths
//      ya subidos para que se registren en la tabla `documentos`
//
// Ventajas: cada request a Vercel pesa <50KB, sin importar cuántos
// PDFs ni cuán pesados.
// ============================================================

interface DocumentoSubido {
  docId: string
  docNombre: string
  storagePath: string
  contentType: string
  tamanio: number
  categoria?: CategoriaDocumento
}

// ============================================================
// ACTION 1: Crear el avalúo vacío (sin documentos todavía)
// Devuelve el id y folio para que el cliente sepa dónde subir los archivos.
// ============================================================
export async function crearAvaluoVacioAction(
  payload: CrearAvaluoPayload,
): Promise<GuardarAvaluoResult> {
  console.log('[crearAvaluoVacio] inicio')
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { exito: false, error: 'No autenticado. Inicia sesión para continuar.' }
  }

  // Notas consolidadas
  const notasConsolidadas = [
    `Tipo de avalúo: ${payload.tipo_avaluo === '1.0' ? '1.0 — Primera Enajenación' : '2.0 — Crédito'}`,
    payload.propietario_nombre ? `Propietario: ${payload.propietario_nombre}` : null,
    payload.clave_catastral ? `Clave catastral: ${payload.clave_catastral}` : null,
    payload.notas ? `Notas de riesgo: ${payload.notas}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const valorNumerico = payload.valor_estimado
    ? Number(String(payload.valor_estimado).replace(/[^0-9.]/g, ''))
    : null

  const tipoInmuebleValido: TipoInmueble = (
    [
      'casa', 'departamento', 'local_comercial', 'oficina',
      'terreno', 'bodega', 'nave_industrial', 'otro',
    ] as TipoInmueble[]
  ).includes(payload.tipo_inmueble as TipoInmueble)
    ? payload.tipo_inmueble
    : 'otro'

  const { data: avaluo, error: insertError } = await supabase
    .from('avaluos')
    .insert({
      calle:                   payload.calle || 'Sin especificar',
      numero_ext:              payload.numero_ext || null,
      numero_int:              payload.numero_int || null,
      colonia:                 payload.colonia || null,
      municipio:               payload.municipio || 'Sin especificar',
      estado_inmueble:         payload.estado_inmueble || 'Sin especificar',
      cp:                      payload.cp || null,
      tipo_inmueble:           tipoInmuebleValido,
      superficie_terreno:      payload.superficie_terreno || null,
      superficie_construccion: payload.superficie_construccion || null,
      valor_estimado:          valorNumerico,
      moneda:                  payload.moneda || 'MXN',
      banco_id:                payload.banco_id || null,
      uso_suelo:               payload.uso_suelo || null,
      uso_suelo_auto:          payload.uso_suelo_auto ?? false,
      tipo_avaluo_codigo:      payload.tipo_avaluo,
      estado:                  'captura',
      valuador_id:             user.id,
      solicitante_id:          user.id,
      created_by:              user.id,
      notas:                   notasConsolidadas || null,
    })
    .select('id, folio')
    .single()

  if (insertError || !avaluo) {
    console.error('[crearAvaluoVacio] Error al insertar avalúo:', insertError)
    return {
      exito: false,
      error: `Error al guardar el avalúo: ${insertError?.message || 'Error desconocido'}`,
    }
  }
  console.log('[crearAvaluoVacio] avalúo creado:', avaluo.id, avaluo.folio)

  return {
    exito: true,
    avaluo_id: avaluo.id,
    folio: avaluo.folio,
  }
}

// ============================================================
// ACTION 2: Registrar los documentos ya subidos al Storage
// El cliente subió los archivos directo a Supabase Storage; aquí solo
// insertamos las filas en la tabla `documentos` (operación liviana).
// ============================================================
export async function registrarDocumentosAction(
  avaluoId: string,
  documentos: DocumentoSubido[],
): Promise<{ exito: boolean; error?: string; insertados: number }> {
  console.log(`[registrarDocumentos] inicio — ${documentos.length} docs para avalúo ${avaluoId}`)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { exito: false, error: 'No autenticado.', insertados: 0 }
  }

  // Validar que el usuario es dueño del avalúo
  const { data: avaluoCheck } = await supabase
    .from('avaluos')
    .select('id, valuador_id, solicitante_id')
    .eq('id', avaluoId)
    .single()

  if (!avaluoCheck || (avaluoCheck.valuador_id !== user.id && avaluoCheck.solicitante_id !== user.id)) {
    return { exito: false, error: 'No tienes permiso sobre este avalúo.', insertados: 0 }
  }

  // Insert masivo
  const filas = documentos.map((d) => ({
    avaluo_id:     avaluoId,
    nombre:        d.docNombre,
    descripcion:   `Documento ${d.docId} del expediente`,
    bucket:        'documentos',
    storage_path:  d.storagePath,
    tipo_mime:     d.contentType,
    tamanio_bytes: d.tamanio,
    categoria:     d.categoria ?? 'documento',
    created_by:    user.id,
  }))

  const { error: insertError, count } = await supabase
    .from('documentos')
    .insert(filas, { count: 'exact' })

  if (insertError) {
    console.error('[registrarDocumentos] error en insert:', insertError)
    return { exito: false, error: insertError.message, insertados: 0 }
  }

  console.log(`[registrarDocumentos] OK — ${count ?? filas.length} filas insertadas`)
  return { exito: true, insertados: count ?? filas.length }
}

// ============================================================
// ACTION (legacy): guardarAvaluo — DEPRECATED
// Mantenida sólo por compatibilidad. NO usar para nuevos flujos
// porque hace pasar los archivos por el body de Vercel y choca con
// el límite de 4.5 MB. Usa crearAvaluoVacioAction + uploads directos
// + registrarDocumentosAction en su lugar.
// ============================================================
export async function guardarAvaluo(
  payload: CrearAvaluoPayload,
  _archivos: unknown[],
): Promise<GuardarAvaluoResult> {
  console.warn('[guardarAvaluo] DEPRECATED — usa crearAvaluoVacioAction + uploads directos')
  return crearAvaluoVacioAction(payload)
}

// ============================================================
// ACTION: Cambiar estado de un avalúo (usa la función de Supabase)
// ============================================================
export async function cambiarEstadoAvaluo(
  avaluoId: string,
  nuevoEstado: 'revision' | 'aprobado' | 'rechazado' | 'captura',
  comentario?: string
): Promise<{ exito: boolean; mensaje: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { exito: false, mensaje: 'No autenticado.' }

  const { data, error } = await supabase.rpc('fn_cambiar_estado_avaluo', {
    p_avaluo_id:    avaluoId,
    p_nuevo_estado: nuevoEstado,
    p_usuario_id:   user.id,
    p_comentario:   comentario || null,
  })

  if (error) return { exito: false, mensaje: error.message }
  return data as { exito: boolean; mensaje: string }
}