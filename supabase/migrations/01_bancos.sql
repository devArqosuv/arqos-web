-- ============================================================
-- MIGRACIÓN: Catálogo de bancos y documentos requeridos
-- Para el selector "Crédito Bancario" en avalúos
-- ============================================================

-- 1. TABLA: bancos
CREATE TABLE bancos (
  id          TEXT PRIMARY KEY,          -- 'bbva', 'santander', 'banorte'...
  nombre      TEXT NOT NULL,
  logo_url    TEXT,
  color_hex   TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_bancos_updated_at
  BEFORE UPDATE ON bancos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 2. TABLA: banco_documentos
CREATE TABLE banco_documentos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco_id     TEXT NOT NULL REFERENCES bancos(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  obligatorio  BOOLEAN DEFAULT TRUE,
  orden        INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banco_documentos_banco ON banco_documentos(banco_id, orden);

-- 3. Referencia en avaluos: qué banco escogió el valuador
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS banco_id TEXT REFERENCES bancos(id) ON DELETE SET NULL;

-- 4. RLS
ALTER TABLE bancos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_documentos ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier autenticado ve catálogo activo
CREATE POLICY "bancos_select_autenticado"
  ON bancos FOR SELECT
  TO authenticated
  USING (activo = TRUE);

CREATE POLICY "banco_documentos_select_autenticado"
  ON banco_documentos FOR SELECT
  TO authenticated
  USING (TRUE);

-- Escritura: solo admin
CREATE POLICY "bancos_write_admin"
  ON bancos FOR ALL
  TO authenticated
  USING (fn_es_admin())
  WITH CHECK (fn_es_admin());

CREATE POLICY "banco_documentos_write_admin"
  ON banco_documentos FOR ALL
  TO authenticated
  USING (fn_es_admin())
  WITH CHECK (fn_es_admin());

-- 5. SEED: BBVA con los 5 documentos del checklist
INSERT INTO bancos (id, nombre, orden) VALUES
  ('bbva', 'BBVA', 1);

INSERT INTO banco_documentos (banco_id, nombre, orden, obligatorio) VALUES
  ('bbva', 'Boleta de Agua con Domicilio (no comprobante de pago)', 1, TRUE),
  ('bbva', 'Boleta Predial con Domicilio (no comprobante de pago)', 2, TRUE),
  ('bbva', 'Escrituras Completas Selladas y Notariadas',            3, TRUE),
  ('bbva', 'Régimen en Condominio Notariado',                       4, TRUE),
  ('bbva', 'Comprobante de Pago',                                   5, TRUE);
