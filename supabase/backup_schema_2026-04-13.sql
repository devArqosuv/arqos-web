-- =============================================================
-- ARQOS Database Schema Backup — 2026-04-13
-- Branch: dev/funcional (commit 8c5b81d)
-- Supabase Project: oeoopbqndgnxrlldyzeu
-- =============================================================
-- Este archivo es SOLO referencia/backup. NO ejecutar directamente.
-- Las migraciones oficiales estan en supabase/migrations/
-- =============================================================

-- ===================== ENUMS =====================

CREATE TYPE estado_avaluo AS ENUM (
  'solicitud', 'captura', 'agenda_visita', 'visita_realizada',
  'preavaluo', 'revision', 'firma', 'aprobado', 'rechazado'
);

CREATE TYPE rol_usuario AS ENUM (
  'administrador', 'evaluador', 'controlador'
);

CREATE TYPE tipo_inmueble AS ENUM (
  'casa', 'departamento', 'local_comercial', 'oficina',
  'terreno', 'bodega', 'nave_industrial', 'otro'
);

CREATE TYPE tipo_comparable AS ENUM (
  -- valores exactos por confirmar, tabla comparables usa este tipo
  'venta', 'renta'  -- inferido del contexto
);

CREATE TYPE estado_comparable AS ENUM (
  'pendiente', 'aprobado', 'rechazado'  -- inferido
);

CREATE TYPE tipo_accion_log AS ENUM (
  'crear', 'actualizar', 'eliminar'  -- inferido de audit_logs
);

-- ===================== TABLES =====================

-- 1. audit_logs — Registro de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID,
  accion tipo_accion_log NOT NULL,
  tabla TEXT NOT NULL,
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. perfiles — Usuarios del sistema (linked a auth.users)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY,  -- = auth.users.id
  cuenta_id UUID REFERENCES cuentas(id),
  nombre TEXT NOT NULL,
  apellidos TEXT,
  email TEXT NOT NULL,
  telefono TEXT,
  rol rol_usuario NOT NULL DEFAULT 'evaluador',
  activo BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. cuentas — Empresas/organizaciones
CREATE TABLE cuentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  razon_social TEXT,
  calle TEXT,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  municipio TEXT,
  estado TEXT,
  cp TEXT,
  pais TEXT DEFAULT 'México',
  contacto_nombre TEXT,
  contacto_email TEXT,
  contacto_tel TEXT,
  activa BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. bancos — Catálogo de bancos para avalúos tipo 2.0
CREATE TABLE bancos (
  id TEXT PRIMARY KEY,  -- 'bbva', 'santander', etc.
  nombre TEXT NOT NULL,
  logo_url TEXT,
  color_hex TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. banco_documentos — Documentos requeridos por banco
CREATE TABLE banco_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco_id TEXT NOT NULL REFERENCES bancos(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  obligatorio BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. avaluos — Tabla principal de avalúos
CREATE TABLE avaluos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT,  -- auto-generado por trigger: PE-2025-0001
  cuenta_id UUID REFERENCES cuentas(id),
  -- Dirección
  calle TEXT NOT NULL,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  municipio TEXT NOT NULL,
  estado_inmueble TEXT NOT NULL,
  cp TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  -- Inmueble
  tipo_inmueble tipo_inmueble NOT NULL,
  superficie_terreno NUMERIC,
  superficie_construccion NUMERIC,
  num_recamaras INTEGER,
  num_banos INTEGER,
  num_estacionamientos INTEGER,
  edad_inmueble INTEGER,
  -- Valores
  valor_estimado NUMERIC,
  valor_terreno NUMERIC,
  valor_construccion NUMERIC,
  moneda TEXT DEFAULT 'MXN',
  -- Workflow
  estado estado_avaluo NOT NULL DEFAULT 'solicitud',
  -- Usuarios
  solicitante_id UUID REFERENCES perfiles(id),
  valuador_id UUID REFERENCES perfiles(id),
  controlador_id UUID REFERENCES perfiles(id),
  notas TEXT,
  fecha_solicitud TIMESTAMPTZ DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  -- Banco (tipo 2.0)
  banco_id TEXT REFERENCES bancos(id),
  -- Visita
  fecha_visita_agendada TIMESTAMPTZ,
  fecha_visita_realizada TIMESTAMPTZ,
  -- Preavalúo/Firma
  valor_uv NUMERIC,
  valor_valuador NUMERIC,
  firmado_uv BOOLEAN DEFAULT false,
  firmado_valuador BOOLEAN DEFAULT false,
  fecha_firma_uv TIMESTAMPTZ,
  fecha_firma_valuador TIMESTAMPTZ,
  -- Uso de suelo
  uso_suelo TEXT,
  uso_suelo_auto BOOLEAN DEFAULT false,
  -- PDF
  pdf_oficial_path TEXT,
  pdf_oficial_generado_at TIMESTAMPTZ,
  -- Tipo y servicios
  tipo_avaluo_codigo TEXT,  -- '1.0' o '2.0'
  verificacion_servicios JSONB,
  proposito_avaluo TEXT,
  -- Devolución
  motivo_devolucion TEXT,
  devuelto_at TIMESTAMPTZ,
  devoluciones_count INTEGER NOT NULL DEFAULT 0
);

-- 7. documentos — Archivos subidos (PDFs, fotos, etc.)
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaluo_id UUID NOT NULL REFERENCES avaluos(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  bucket TEXT NOT NULL DEFAULT 'documentos',
  storage_path TEXT NOT NULL,
  tipo_mime TEXT,
  tamanio_bytes BIGINT,
  firmado BOOLEAN DEFAULT false,
  fecha_firma TIMESTAMPTZ,
  firmado_por UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Categoría (migración 03)
  categoria TEXT DEFAULT 'documento',  -- documento|fachada|portada|entorno|interior|uso_suelo|otro
  -- GPS (migración 07)
  latitud NUMERIC,
  longitud NUMERIC,
  gps_accuracy NUMERIC,
  gps_capturado_at TIMESTAMPTZ
);

-- 8. comparables — Comparables de mercado para preavalúo
CREATE TABLE comparables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaluo_id UUID REFERENCES avaluos(id),
  calle TEXT,
  colonia TEXT,
  municipio TEXT NOT NULL,
  estado_inmueble TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  tipo_inmueble tipo_inmueble NOT NULL,
  tipo tipo_comparable NOT NULL,
  superficie_terreno NUMERIC,
  superficie_construccion NUMERIC,
  precio NUMERIC NOT NULL,
  precio_m2 NUMERIC,
  moneda TEXT DEFAULT 'MXN',
  fuente TEXT,
  url_fuente TEXT,
  fecha_publicacion DATE,
  estado estado_comparable DEFAULT 'pendiente',
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. avaluo_historial — Historial de cambios de estado
CREATE TABLE avaluo_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaluo_id UUID NOT NULL REFERENCES avaluos(id),
  estado_anterior estado_avaluo,
  estado_nuevo estado_avaluo NOT NULL,
  usuario_id UUID,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. evaluaciones — Evaluaciones de desempeño
CREATE TABLE evaluaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaluo_id UUID REFERENCES avaluos(id),
  evaluado_id UUID NOT NULL,
  evaluador_id UUID NOT NULL,
  puntaje INTEGER NOT NULL,
  comentarios TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. folios — Generador de folios legacy
CREATE TABLE folios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefijo TEXT NOT NULL DEFAULT 'ARQ',
  siguiente BIGINT NOT NULL DEFAULT 1,
  ultimo_folio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. folios_correlativo — Contador anual de folios (migración 06)
CREATE TABLE folios_correlativo (
  anio INTEGER NOT NULL,
  tipo_prefijo TEXT NOT NULL,  -- 'PE' o 'CR'
  ultimo INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anio, tipo_prefijo)
);

-- 13. modulos — Catálogo de módulos del sistema
CREATE TABLE modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT
);

-- 14. permisos — Permisos por perfil y módulo
CREATE TABLE permisos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id),
  modulo_id UUID NOT NULL REFERENCES modulos(id),
  puede_ver BOOLEAN DEFAULT false,
  puede_crear BOOLEAN DEFAULT false,
  puede_editar BOOLEAN DEFAULT false,
  puede_eliminar BOOLEAN DEFAULT false,
  puede_aprobar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. notificaciones — Sistema de notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT DEFAULT 'info',
  leida BOOLEAN DEFAULT false,
  leida_at TIMESTAMPTZ,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. usos_suelo_qro — Catálogo usos de suelo Querétaro
CREATE TABLE usos_suelo_qro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. validaciones — Validaciones de documentos
CREATE TABLE validaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaluo_id UUID NOT NULL REFERENCES avaluos(id),
  tipo TEXT NOT NULL,
  codigo TEXT,
  mensaje TEXT NOT NULL,
  campo TEXT,
  resuelto BOOLEAN DEFAULT false,
  resuelto_por UUID,
  resuelto_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. workflow_estados — Catálogo de estados del workflow
CREATE TABLE workflow_estados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave estado_avaluo NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  color_hex TEXT DEFAULT '#6B7280',
  orden INTEGER NOT NULL,
  es_final BOOLEAN DEFAULT false
);

-- 19. workflow_transiciones — Transiciones válidas entre estados
CREATE TABLE workflow_transiciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estado_origen estado_avaluo NOT NULL,
  estado_destino estado_avaluo NOT NULL,
  rol_requerido rol_usuario,
  requiere_docs BOOLEAN DEFAULT false,
  descripcion TEXT
);

-- ===================== VIEWS =====================

-- 20. vw_avaluos_dashboard (columnas)
-- id, folio, estado, tipo_inmueble, direccion_completa, valor_estimado,
-- moneda, fecha_solicitud, fecha_aprobacion, cuenta_nombre, cuenta_rfc,
-- valuador_nombre, valuador_email, controlador_nombre, estado_color,
-- estado_orden, num_documentos, num_comparables, num_errores

-- 21. vw_estadisticas_evaluadores (columnas)
-- id, nombre_completo, email, total_avaluos, aprobados, rechazados,
-- en_revision, puntaje_promedio

-- ===================== STORAGE =====================
-- Bucket: 'documentos'
-- Paths: temp/{tempId}/... y avaluos/{avaluoId}/...
