'use server'

import { createClient } from '@/util/supabase/server'
import { CrearAvaluoPayload, GuardarAvaluoResult, TipoInmueble } from '@/types/arqos'

// ============================================================
// ACTION: Guardar avalúo completo con sus documentos
// ============================================================
export async function guardarAvaluo(
  payload: CrearAvaluoPayload,
  archivos: { docId: string; docNombre: string; file: File }[]
): Promise<GuardarAvaluoResult> {
  const supabase = await createClient()

  // 1. Verificar sesión activa
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { exito: false, error: 'No autenticado. Inicia sesión para continuar.' }
  }

  // 2. Construir las notas consolidadas (tipo de avalúo + datos extra de la IA)
  const notasConsolidadas = [
    `Tipo de avalúo: ${payload.tipo_avaluo === '1.0' ? '1.0 — Primera Enajenación' : '2.0 — Crédito'}`,
    payload.propietario_nombre ? `Propietario: ${payload.propietario_nombre}` : null,
    payload.clave_catastral ? `Clave catastral: ${payload.clave_catastral}` : null,
    payload.notas ? `Notas de riesgo: ${payload.notas}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  // 3. Parsear valor estimado a número
  const valorNumerico = payload.valor_estimado
    ? Number(String(payload.valor_estimado).replace(/[^0-9.]/g, ''))
    : null

  // 4. Determinar tipo_inmueble — si la IA no lo detectó, usar 'otro'
  const tipoInmuebleValido: TipoInmueble = (
    [
      'casa', 'departamento', 'local_comercial', 'oficina',
      'terreno', 'bodega', 'nave_industrial', 'otro',
    ] as TipoInmueble[]
  ).includes(payload.tipo_inmueble as TipoInmueble)
    ? payload.tipo_inmueble
    : 'otro'

  // 5. Insertar el avalúo en la tabla principal
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
      estado:                  'captura',           // Empieza en captura al guardarse
      valuador_id:             user.id,             // El evaluador actual es el valuador
      solicitante_id:          user.id,
      created_by:              user.id,
      notas:                   notasConsolidadas || null,
    })
    .select('id, folio')
    .single()

  if (insertError || !avaluo) {
    console.error('Error al insertar avalúo:', insertError)
    return {
      exito: false,
      error: `Error al guardar el avalúo: ${insertError?.message || 'Error desconocido'}`,
    }
  }

  // 6. Subir los archivos PDF al Storage de Supabase
  const erroresDocumentos: string[] = []

  for (const archivo of archivos) {
    const extension = archivo.file.name.split('.').pop() || 'pdf'
    const storagePath = `avaluos/${avaluo.id}/${archivo.docId}-${Date.now()}.${extension}`

    // Subir el archivo al bucket 'documentos'
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, archivo.file, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      erroresDocumentos.push(`No se pudo subir ${archivo.docNombre}: ${uploadError.message}`)
      continue
    }

    // Registrar el documento en la tabla documentos
    const { error: docInsertError } = await supabase
      .from('documentos')
      .insert({
        avaluo_id:     avaluo.id,
        nombre:        archivo.docNombre,
        descripcion:   `Documento ${archivo.docId} del expediente`,
        bucket:        'documentos',
        storage_path:  storagePath,
        tipo_mime:     'application/pdf',
        tamanio_bytes: archivo.file.size,
        created_by:    user.id,
      })

    if (docInsertError) {
      erroresDocumentos.push(`Error al registrar ${archivo.docNombre}: ${docInsertError.message}`)
    }
  }

  // 7. Si hubo errores en documentos, los reportamos pero el avalúo ya quedó guardado
  if (erroresDocumentos.length > 0) {
    return {
      exito: true,
      avaluo_id: avaluo.id,
      folio: avaluo.folio,
      error: `Avalúo guardado (${avaluo.folio}), pero algunos documentos fallaron:\n${erroresDocumentos.join('\n')}`,
    }
  }

  return {
    exito: true,
    avaluo_id: avaluo.id,
    folio: avaluo.folio,
  }
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