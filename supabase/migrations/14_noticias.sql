-- =============================================================
-- Migración 14: Sistema de Noticias internas
-- Permite al admin publicar noticias segmentadas por rol.
-- =============================================================

-- Enum para el tipo de noticia (afecta el ícono/color en UI)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_noticia') THEN
    CREATE TYPE tipo_noticia AS ENUM ('info', 'actualizacion', 'alerta', 'mantenimiento');
  END IF;
END$$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  tipo tipo_noticia NOT NULL DEFAULT 'info',
  roles_destinatarios rol_usuario[] NOT NULL DEFAULT ARRAY['administrador','evaluador','controlador']::rol_usuario[],
  activa BOOLEAN NOT NULL DEFAULT true,
  fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consulta rápida de noticias activas ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_noticias_activa_fecha
  ON noticias (activa, fecha_publicacion DESC);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede leer si la noticia está activa
-- y su rol está en roles_destinatarios y (no tiene expiración o no ha expirado).
-- (El filtro fino también se aplica en la query; RLS es la red de seguridad.)
DROP POLICY IF EXISTS "noticias_select_autenticados" ON noticias;
CREATE POLICY "noticias_select_autenticados" ON noticias
  FOR SELECT TO authenticated
  USING (
    activa = true
    AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = ANY (noticias.roles_destinatarios)
    )
  );

-- SELECT total para admin (para el CRUD)
DROP POLICY IF EXISTS "noticias_select_admin" ON noticias;
CREATE POLICY "noticias_select_admin" ON noticias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- INSERT: solo admin
DROP POLICY IF EXISTS "noticias_insert_admin" ON noticias;
CREATE POLICY "noticias_insert_admin" ON noticias
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- UPDATE: solo admin
DROP POLICY IF EXISTS "noticias_update_admin" ON noticias;
CREATE POLICY "noticias_update_admin" ON noticias
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- DELETE: solo admin (aunque el flujo UI prefiere soft-delete marcando activa=false)
DROP POLICY IF EXISTS "noticias_delete_admin" ON noticias;
CREATE POLICY "noticias_delete_admin" ON noticias
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- =============================================================
-- Seed: 3 noticias de ejemplo
-- =============================================================
INSERT INTO noticias (titulo, contenido, tipo, roles_destinatarios, activa)
VALUES
  (
    'Bienvenido a ARQOS',
    'Gracias por usar ARQOS. Aquí verás los anuncios más recientes del equipo: nuevas funciones, mantenimientos programados y recordatorios operativos. Si tienes dudas, consulta la sección de Ayuda desde el menú lateral.',
    'info',
    ARRAY['administrador','evaluador','controlador']::rol_usuario[],
    true
  ),
  (
    'Nuevo: la IA llena campos SHF automáticamente',
    'Al subir documentos al expediente, la IA ahora analiza CURT, escrituras, predial e INE y llena hasta 28 campos del formato SHF por ti. Revísalos siempre antes de firmar — la IA marca en amarillo los que detectó con baja confianza.',
    'actualizacion',
    ARRAY['evaluador','controlador']::rol_usuario[],
    true
  ),
  (
    'Uso correcto del módulo de firma',
    'Antes de firmar un preavalúo verifica que la tabla SHF esté completa y que los comparables sumen al menos 3. Una vez firmado, el PDF queda inmutable y no se puede editar — cualquier cambio requiere rechazar y volver a capturar.',
    'alerta',
    ARRAY['evaluador']::rol_usuario[],
    true
  )
ON CONFLICT DO NOTHING;
