'use server'

import { createClient } from '@/util/supabase/server'
import { CrearAvaluoPayload, GuardarAvaluoResult, TipoInmueble, CategoriaDocumento } from '@/types/arqos'

// MIME types permitidos al subir documentos del expediente
const MIME_PERMITIDOS: Record<string, string> = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
}

interface ArchivoExpediente {
  docId: string
  docNombre: string
  file: File
  categoria?: CategoriaDocumento
}

// ============================================================
// ACTION: Guardar avalúo completo con sus documentos
// ============================================================
export async function guardarAvaluo(
  payload: CrearAvaluoPayload,
  archivos: ArchivoExpediente[]
): Promise<GuardarAvaluoResult> {
  console.log(`[guardarAvaluo] inicio — ${archivos.length} archivos`)
  const supabase = await createClient()

  // 1. Verificar sesión activa
  console.log('[guardarAvaluo] paso 1: getUser')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[guardarAvaluo] sin sesión:', authError)
    return { exito: false, error: 'No autenticado. Inicia sesión para continuar.' }
  }
  console.log('[guardarAvaluo] usuario:', user.id)

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
  console.log('[guardarAvaluo] paso 5: insertando en tabla avaluos')
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
      estado:                  'captura',           // Empieza en captura al guardarse
      valuador_id:             user.id,             // El evaluador actual es el valuador
      solicitante_id:          user.id,
      created_by:              user.id,
      notas:                   notasConsolidadas || null,
    })
    .select('id, folio')
    .single()

  if (insertError || !avaluo) {
    console.error('[guardarAvaluo] Error al insertar avalúo:', insertError)
    return {
      exito: false,
      error: `Error al guardar el avalúo: ${insertError?.message || 'Error desconocido'}`,
    }
  }
  console.log('[guardarAvaluo] avalúo creado:', avaluo.id, avaluo.folio)

  // 6. Subir los archivos en PARALELO (Promise.all) para fitear en el timeout
  // de 10s del plan Hobby de Vercel. Subir 5 PDFs en serie facilmente rebasa
  // 10s; en paralelo se hace en el tiempo del upload mas lento (~2-3s).
  console.log(`[guardarAvaluo] paso 6: subiendo ${archivos.length} archivos al Storage en paralelo`)

  const resultadosUpload = await Promise.all(
    archivos.map(async (archivo, i) => {
      const tag = `[guardarAvaluo] archivo ${i + 1}/${archivos.length}`
      const extension = (archivo.file.name.split('.').pop() || '').toLowerCase()
      const contentType = MIME_PERMITIDOS[extension] ?? archivo.file.type ?? 'application/octet-stream'

      if (!MIME_PERMITIDOS[extension]) {
        console.warn(`${tag} formato rechazado: ${extension}`)
        return { ok: false, error: `Formato no permitido en ${archivo.docNombre}: solo PDF, JPG o PNG` }
      }

      const storagePath = `avaluos/${avaluo.id}/${archivo.docId}-${Date.now()}.${extension}`

      // Upload al Storage
      try {
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(storagePath, archivo.file, { contentType, upsert: false })

        if (uploadError) {
          console.error(`${tag} upload falló:`, uploadError)
          return { ok: false, error: `No se pudo subir ${archivo.docNombre}: ${uploadError.message}` }
        }
      } catch (uploadCrash) {
        console.error(`${tag} excepción durante upload:`, uploadCrash)
        const msg = uploadCrash instanceof Error ? uploadCrash.message : 'Error desconocido'
        return { ok: false, error: `Excepción al subir ${archivo.docNombre}: ${msg}` }
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
          tipo_mime:     contentType,
          tamanio_bytes: archivo.file.size,
          categoria:     archivo.categoria ?? 'documento',
          created_by:    user.id,
        })

      if (docInsertError) {
        console.error(`${tag} insert documentos falló:`, docInsertError)
        return { ok: false, error: `Error al registrar ${archivo.docNombre}: ${docInsertError.message}` }
      }

      console.log(`${tag} OK: ${archivo.docNombre}`)
      return { ok: true as const }
    })
  )

  const erroresDocumentos = resultadosUpload
    .filter((r): r is { ok: false; error: string } => !r.ok)
    .map((r) => r.error)
  console.log(`[guardarAvaluo] paso 6 completo. errores=${erroresDocumentos.length}`)

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