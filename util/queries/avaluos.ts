import { createClient } from '@/util/supabase/server'
import { AvaluoDashboard, Documento } from '@/types/arqos'

// ============================================================
// QUERIES del servidor — usar en Server Components
// ============================================================

// Obtener avalúos del dashboard (usa la vista vw_avaluos_dashboard)
export async function getAvaluosDashboard(filtros?: {
  estado?: string
  valuador_id?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('vw_avaluos_dashboard')
    .select('*')
    .order('fecha_solicitud', { ascending: false })
    .limit(filtros?.limit || 20)

  if (filtros?.estado) query = query.eq('estado', filtros.estado)
  if (filtros?.valuador_id) query = query.eq('valuador_id', filtros.valuador_id) // no existe en la vista, filtrar por joins si se necesita

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener avalúos:', error)
    return []
  }

  return data as AvaluoDashboard[]
}

// Obtener un avalúo por ID con sus documentos e historial
export async function getAvaluo(id: string) {
  const supabase = await createClient()

  const [avaluoRes, documentosRes, historialRes] = await Promise.all([
    supabase
      .from('vw_avaluos_dashboard')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
      .from('documentos')
      .select('*')
      .eq('avaluo_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('avaluo_historial')
      .select('*, perfiles(nombre, apellidos)')
      .eq('avaluo_id', id)
      .order('created_at', { ascending: true }),
  ])

  return {
    avaluo: avaluoRes.data as AvaluoDashboard | null,
    documentos: (documentosRes.data || []) as Documento[],
    historial: historialRes.data || [],
  }
}

// Obtener perfil del usuario actual
export async function getPerfilActual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

// Obtener URL firmada de un documento en Storage
export async function getUrlDocumento(storagePath: string) {
  const supabase = await createClient()

  const { data } = await supabase.storage
    .from('documentos')
    .createSignedUrl(storagePath, 60 * 60) // 1 hora

  return data?.signedUrl || null
}

// Obtener notificaciones no leídas del usuario actual
export async function getNotificacionesSinLeer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', user.id)
    .eq('leida', false)
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

// Estadísticas rápidas para el dashboard del controlador
export async function getEstadisticasControl() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('avaluos')
    .select('estado')

  if (!data) return { flujos_activos: 0, pendientes_aprobacion: 0, completados: 0 }

  return {
    flujos_activos:        data.filter(a => ['captura', 'revision'].includes(a.estado)).length,
    pendientes_aprobacion: data.filter(a => a.estado === 'revision').length,
    completados:           data.filter(a => a.estado === 'aprobado').length,
  }
}