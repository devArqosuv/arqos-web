-- ============================================================
-- MIGRACIÓN: Flujo de avalúo bancario 1ª enajenación
--   - Documentos correctos del flujo (reemplaza seed de BBVA)
--   - Categoría en documentos (para fotos clasificadas)
--   - Estados nuevos del workflow (visita, preavalúo, firma)
--   - Catálogo de usos de suelo de Querétaro (vacío)
--   - Campos nuevos en avaluos (visita, valor UV/Valuador, firma, uso de suelo)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Categoría en documentos: distingue PDFs de fotos clasificadas
-- ------------------------------------------------------------
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS categoria TEXT
    CHECK (categoria IN (
      'documento',     -- PDFs/JPGs del expediente
      'fachada',       -- foto de fachada (1 requerida)
      'entorno',       -- foto de entorno (2 requeridas)
      'interior',      -- foto de interior (8 requeridas)
      'uso_suelo',     -- imagen de uso de suelo (cuando NO es Qro)
      'otro'
    ))
    DEFAULT 'documento';

CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos(avaluo_id, categoria);

-- ------------------------------------------------------------
-- 2. Estados nuevos del workflow
-- Postgres no permite ADD VALUE dentro de una transacción si el enum se usa
-- en la misma migración, así que los agregamos uno por uno fuera del DO.
-- ------------------------------------------------------------
ALTER TYPE estado_avaluo ADD VALUE IF NOT EXISTS 'agenda_visita';
ALTER TYPE estado_avaluo ADD VALUE IF NOT EXISTS 'visita_realizada';
ALTER TYPE estado_avaluo ADD VALUE IF NOT EXISTS 'preavaluo';
ALTER TYPE estado_avaluo ADD VALUE IF NOT EXISTS 'firma';

-- ------------------------------------------------------------
-- 3. Campos nuevos en `avaluos` para soportar el flujo completo
-- ------------------------------------------------------------
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS fecha_visita_agendada  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_visita_realizada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_uv               NUMERIC(18,2),  -- valor calculado por la UV (preavalúo)
  ADD COLUMN IF NOT EXISTS valor_valuador         NUMERIC(18,2),  -- valor ajustado por el valuador
  ADD COLUMN IF NOT EXISTS firmado_uv             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS firmado_valuador       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_firma_uv         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_firma_valuador   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uso_suelo              TEXT,           -- uso de suelo asignado
  ADD COLUMN IF NOT EXISTS uso_suelo_auto         BOOLEAN DEFAULT FALSE; -- true si lo puso el sistema (Qro), false si lo subió el valuador

-- ------------------------------------------------------------
-- 4. Catálogo de usos de suelo de Querétaro
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usos_suelo_qro (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave       TEXT UNIQUE NOT NULL,         -- 'H1', 'H2', 'C1', 'M', etc.
  nombre      TEXT NOT NULL,                -- 'Habitacional densidad baja'
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usos_suelo_qro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usos_suelo_select_autenticado"
  ON usos_suelo_qro FOR SELECT
  TO authenticated
  USING (activo = TRUE);

CREATE POLICY "usos_suelo_write_admin"
  ON usos_suelo_qro FOR ALL
  TO authenticated
  USING (fn_es_admin())
  WITH CHECK (fn_es_admin());

-- Tabla intencionalmente vacía: el admin la llenará desde el panel
-- o con un INSERT manual cuando tenga el catálogo oficial de Qro.

-- ------------------------------------------------------------
-- 5. REEMPLAZAR los documentos del banco BBVA con los del flujo
--    Los 5 documentos del diagrama "1ª Enajenación":
--      1. Título de Propiedad completo
--      2. Boleta Predial / Cédula Catastral
--      3. Identificación oficial del propietario
--      4. Identificación oficial del solicitante
--      5. Acreditación de uso de suelo
-- ------------------------------------------------------------
DELETE FROM banco_documentos WHERE banco_id = 'bbva';

INSERT INTO banco_documentos (banco_id, nombre, orden, obligatorio) VALUES
  ('bbva', 'Título de Propiedad completo',                  1, TRUE),
  ('bbva', 'Boleta Predial / Cédula Catastral',             2, TRUE),
  ('bbva', 'Identificación oficial del propietario',        3, TRUE),
  ('bbva', 'Identificación oficial del solicitante',        4, TRUE),
  ('bbva', 'Acreditación de uso de suelo',                  5, TRUE);

-- ------------------------------------------------------------
-- 6. Workflow: registrar transiciones nuevas para los estados nuevos
-- ------------------------------------------------------------
INSERT INTO workflow_transiciones (estado_origen, estado_destino, rol_requerido, requiere_docs, descripcion)
VALUES
  ('captura',          'agenda_visita',    'evaluador',   TRUE,  'Documentación validada, agendar visita al inmueble'),
  ('agenda_visita',    'visita_realizada', 'evaluador',   FALSE, 'Marcar la visita como realizada y subir fotografías'),
  ('visita_realizada', 'preavaluo',        'evaluador',   FALSE, 'Generar preavalúo (UV)'),
  ('preavaluo',        'revision',         'evaluador',   FALSE, 'Enviar preavalúo a revisión por controlador'),
  ('revision',         'firma',            'controlador', FALSE, 'Aprobar valor y pasar a firma'),
  ('firma',            'aprobado',         'controlador', FALSE, 'Firma electrónica completa, expediente entregado')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- ------------------------------------------------------------
-- 7. Workflow_estados: agregar etiquetas amigables para los nuevos estados
-- ------------------------------------------------------------
INSERT INTO workflow_estados (clave, nombre, descripcion, color_hex, orden, es_final) VALUES
  ('agenda_visita',    'Agenda Visita',    'Documentación validada, pendiente de visita',    '#FB923C', 6, FALSE),
  ('visita_realizada', 'Visita Realizada', 'Visita y fotografías subidas',                   '#A855F7', 7, FALSE),
  ('preavaluo',        'Preavalúo',        'UV genera preavalúo con homologación',           '#06B6D4', 8, FALSE),
  ('firma',            'Firma',            'Pendiente de firma electrónica del controlador', '#0EA5E9', 9, FALSE)
ON CONFLICT (clave) DO NOTHING;
