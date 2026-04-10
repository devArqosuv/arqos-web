-- ============================================================
-- MIGRACIÓN 06: Folio automático por tipo + verificación de servicios
--
-- 1. Folio automático por tipo de avalúo:
--    - 1.0 (Primera Enajenación)  → PE-YYYY-NNNN
--    - 2.0 (Crédito Bancario)     → CR-YYYY-NNNN
--    Trigger BEFORE INSERT que asigna folio si viene null.
--
-- 2. Columna verificacion_servicios (JSONB) para capturar:
--    agua, luz, alumbrado_publico, banquetas, tipo_calles, telefono_internet
--
-- 3. Columna proposito_avaluo (TEXT) para el "Propósito del avalúo"
--    que el diagrama menciona explícitamente en la Fase 1.
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. FOLIO AUTOMÁTICO POR TIPO
-- ─────────────────────────────────────────────────────────

-- Tabla de correlativos anuales por tipo. Así evitamos hacer un
-- COUNT(*) en avaluos cada vez (race condition + lento).
CREATE TABLE IF NOT EXISTS folios_correlativo (
  anio          INTEGER NOT NULL,
  tipo_prefijo  TEXT    NOT NULL,  -- 'PE' | 'CR'
  ultimo        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anio, tipo_prefijo)
);

-- Función que genera el siguiente folio para un tipo dado.
-- Incrementa atómicamente el correlativo (INSERT ... ON CONFLICT DO UPDATE).
CREATE OR REPLACE FUNCTION fn_generar_folio(p_tipo_avaluo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio        INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_prefijo     TEXT;
  v_siguiente   INTEGER;
BEGIN
  -- Mapear tipo_avaluo → prefijo
  IF p_tipo_avaluo = '1.0' THEN
    v_prefijo := 'PE';
  ELSIF p_tipo_avaluo = '2.0' THEN
    v_prefijo := 'CR';
  ELSE
    v_prefijo := 'AV';  -- fallback genérico
  END IF;

  -- Upsert atómico del correlativo: si ya existe, suma 1; si no, arranca en 1.
  INSERT INTO folios_correlativo (anio, tipo_prefijo, ultimo)
    VALUES (v_anio, v_prefijo, 1)
    ON CONFLICT (anio, tipo_prefijo)
    DO UPDATE SET ultimo = folios_correlativo.ultimo + 1
    RETURNING ultimo INTO v_siguiente;

  -- Formato: PE-2025-0001
  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_siguiente::TEXT, 4, '0');
END;
$$;

-- El tipo_avaluo actualmente NO es columna de avaluos — se guarda en `notas`.
-- Para que el trigger pueda saber qué prefijo usar, lo pasamos por un campo
-- nuevo: `tipo_avaluo_codigo` ('1.0' | '2.0'). Lo agregamos.
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS tipo_avaluo_codigo TEXT;

-- Trigger BEFORE INSERT: si no viene folio, lo generamos según el tipo.
CREATE OR REPLACE FUNCTION fn_asignar_folio_avaluo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := fn_generar_folio(COALESCE(NEW.tipo_avaluo_codigo, '2.0'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_folio_avaluo ON avaluos;
CREATE TRIGGER trg_asignar_folio_avaluo
  BEFORE INSERT ON avaluos
  FOR EACH ROW
  EXECUTE FUNCTION fn_asignar_folio_avaluo();

-- ─────────────────────────────────────────────────────────
-- 2. VERIFICACIÓN DE SERVICIOS (Fase 3 del diagrama)
-- ─────────────────────────────────────────────────────────

-- Estructura esperada del JSONB (ejemplo):
-- {
--   "agua":              "municipal" | "pozo" | "pipa" | "no_hay",
--   "luz":               "cfe" | "planta_solar" | "no_hay",
--   "alumbrado_publico": "si" | "no" | "parcial",
--   "banquetas":         "si" | "no" | "parcial",
--   "tipo_calles":       "pavimentada" | "empedrado" | "terraceria" | "concreto",
--   "telefono_internet": "fibra" | "cable" | "inalambrico" | "no_hay"
-- }
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS verificacion_servicios JSONB,
  ADD COLUMN IF NOT EXISTS proposito_avaluo TEXT;

-- ─────────────────────────────────────────────────────────
-- 3. ÍNDICE PARA BÚSQUEDAS POR FOLIO
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_avaluos_folio ON avaluos (folio);

-- ─────────────────────────────────────────────────────────
-- 4. SEED de correlativo: inicializar el del año actual si se quiere
--    continuar desde cierto número. Por defecto arranca en 0 (primer
--    avalúo queda en 0001). Si necesitas empezar desde otro número,
--    descomenta y ajusta:
--
-- INSERT INTO folios_correlativo (anio, tipo_prefijo, ultimo)
--   VALUES (2025, 'PE', 0), (2025, 'CR', 0)
--   ON CONFLICT DO NOTHING;
-- ─────────────────────────────────────────────────────────
