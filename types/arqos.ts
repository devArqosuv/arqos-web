// ============================================================
// ARQOS — Tipos TypeScript derivados del esquema de Supabase
// ============================================================

export type RolUsuario = 'administrador' | 'evaluador' | 'controlador'
export type EstadoAvaluo = 'solicitud' | 'captura' | 'revision' | 'aprobado' | 'rechazado'
export type TipoInmueble =
  | 'casa'
  | 'departamento'
  | 'local_comercial'
  | 'oficina'
  | 'terreno'
  | 'bodega'
  | 'nave_industrial'
  | 'otro'

// ── Perfil de usuario ──────────────────────────────────────
export interface Perfil {
  id: string
  cuenta_id: string | null
  nombre: string
  apellidos: string | null
  email: string
  telefono: string | null
  rol: RolUsuario
  activo: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── Avalúo ─────────────────────────────────────────────────
export interface Avaluo {
  id: string
  folio: string | null
  cuenta_id: string | null
  // Dirección
  calle: string
  numero_ext: string | null
  numero_int: string | null
  colonia: string | null
  municipio: string
  estado_inmueble: string
  cp: string | null
  lat: number | null
  lng: number | null
  // Características
  tipo_inmueble: TipoInmueble
  superficie_terreno: number | null
  superficie_construccion: number | null
  num_recamaras: number | null
  num_banos: number | null
  num_estacionamientos: number | null
  edad_inmueble: number | null
  // Valuación
  valor_estimado: number | null
  valor_terreno: number | null
  valor_construccion: number | null
  moneda: string
  // Workflow
  estado: EstadoAvaluo
  // Usuarios
  solicitante_id: string | null
  valuador_id: string | null
  controlador_id: string | null
  updated_by: string | null
  created_by: string | null
  // Metadata
  notas: string | null
  fecha_solicitud: string
  fecha_aprobacion: string | null
  created_at: string
  updated_at: string
}

// ── Payload para crear un avalúo ───────────────────────────
// Solo los campos que el evaluador puede escribir desde el panel
export interface CrearAvaluoPayload {
  // Tipo de avalúo (1.0 o 2.0 — se guarda en notas como metadato)
  tipo_avaluo: '1.0' | '2.0'
  // Dirección extraída por la IA
  calle: string
  numero_ext?: string
  numero_int?: string
  colonia?: string
  municipio: string
  estado_inmueble: string
  cp?: string
  // Características del inmueble
  tipo_inmueble: TipoInmueble
  superficie_terreno?: number
  superficie_construccion?: number
  // Valuación
  valor_estimado?: number
  moneda?: string
  // Metadatos del expediente
  propietario_nombre?: string  // Para referencia interna
  clave_catastral?: string     // Se guarda en notas
  notas?: string               // Notas de riesgo del evaluador
}

// ── Documento ──────────────────────────────────────────────
export interface Documento {
  id: string
  avaluo_id: string
  nombre: string
  descripcion: string | null
  bucket: string
  storage_path: string
  tipo_mime: string | null
  tamanio_bytes: number | null
  firmado: boolean
  fecha_firma: string | null
  firmado_por: string | null
  created_by: string | null
  created_at: string
}

// ── Vista del dashboard ────────────────────────────────────
export interface AvaluoDashboard {
  id: string
  folio: string | null
  estado: EstadoAvaluo
  tipo_inmueble: TipoInmueble
  direccion_completa: string
  valor_estimado: number | null
  moneda: string
  fecha_solicitud: string
  fecha_aprobacion: string | null
  cuenta_nombre: string | null
  cuenta_rfc: string | null
  valuador_nombre: string | null
  valuador_email: string | null
  controlador_nombre: string | null
  estado_color: string
  estado_orden: number
  num_documentos: number
  num_comparables: number
  num_errores: number
}

// ── Resultado de guardar avalúo ────────────────────────────
export interface GuardarAvaluoResult {
  exito: boolean
  avaluo_id?: string
  folio?: string
  error?: string
}