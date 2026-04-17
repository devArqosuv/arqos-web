-- ============================================================
-- Migración 18: Auditoría de correcciones humanas sobre campos IA
--
-- Contexto: la IA pre-llena ~28 campos SHF del avalúo desde los
-- documentos subidos. El valuador DEBE revisar y confirmar antes
-- de que se grabe el expediente. Esta tabla registra cada cambio
-- humano sobre un valor sugerido por IA.
--
-- Propósitos:
--  1. Trazabilidad legal: quién cambió qué y cuándo (SHF/CNBV).
--  2. Proteger al valuador: él firma, la IA sólo sugiere.
--  3. Feedback loop para mejorar prompts de IA.
--  4. Evitar que re-analizar con IA pise valores ya corregidos.
-- ============================================================

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS shf_correcciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaluo_id UUID NOT NULL REFERENCES avaluos(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  valor_ia TEXT,
  valor_humano TEXT,
  confianza_ia NUMERIC(4,3),  -- 0.000 a 1.000
  usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  corregido_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shf_correcciones_avaluo
  ON shf_correcciones(avaluo_id);
CREATE INDEX IF NOT EXISTS idx_shf_correcciones_campo
  ON shf_correcciones(campo);

-- Metadata por avalúo: confianza IA y qué campos ya fueron confirmados
-- (JSON para flexibilidad; keys = nombres de campos SHF)
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS ia_confianza JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ia_campos_confirmados JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ia_datos_confirmados_at TIMESTAMPTZ;

COMMENT ON COLUMN avaluos.ia_confianza IS
  'Confianza de la IA por campo (0-1). Ej: {"propietario": 0.95, "superficie": 0.6}';
COMMENT ON COLUMN avaluos.ia_campos_confirmados IS
  'Campos confirmados/corregidos por humano. Ej: {"propietario": "iaValidada", "superficie": "corregida"}';
COMMENT ON COLUMN avaluos.ia_datos_confirmados_at IS
  'Timestamp cuando el valuador pulsó Confirmar y continuar. Bloquea re-sobreescrituras.';

-- RLS
ALTER TABLE shf_correcciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shf_correcciones_select" ON shf_correcciones;
CREATE POLICY "shf_correcciones_select" ON shf_correcciones
  FOR SELECT TO authenticated
  USING (
    fn_es_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = shf_correcciones.avaluo_id
      AND (a.valuador_id = auth.uid() OR a.controlador_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "shf_correcciones_insert" ON shf_correcciones;
CREATE POLICY "shf_correcciones_insert" ON shf_correcciones
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = shf_correcciones.avaluo_id
      AND (a.valuador_id = auth.uid() OR fn_es_admin(auth.uid()))
    )
  );
