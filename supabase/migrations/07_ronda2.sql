-- ============================================================
-- MIGRACIÓN 07: Ronda 2 — ciclo de ajustes + GPS de fotos
--
-- 1. Transición revision → preavaluo (controlador devuelve al valuador)
-- 2. Columnas latitud/longitud/gps_accuracy en documentos
-- 3. Columna motivo_devolucion en avaluos (último motivo del controlador)
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. CICLO DE AJUSTES — controlador puede regresar a preavaluo
-- ─────────────────────────────────────────────────────────
INSERT INTO workflow_transiciones (estado_origen, estado_destino, rol_requerido, requiere_docs, descripcion)
VALUES
  ('revision', 'preavaluo', 'controlador', FALSE, 'El controlador rechaza el ajuste del valuador y solicita un re-ajuste')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- También permitir que controlador y valuador hagan UPDATE en estado revision
-- (esto ya debería estar, pero lo reforzamos por defensa en profundidad)
DROP POLICY IF EXISTS "avaluos_controlador_devolver" ON avaluos;
CREATE POLICY "avaluos_controlador_devolver"
  ON avaluos FOR UPDATE
  TO authenticated
  USING (
    fn_rol_actual() = 'controlador'
    AND controlador_id = auth.uid()
    AND estado IN ('revision', 'preavaluo')
  );

-- ─────────────────────────────────────────────────────────
-- 2. GEORREFERENCIACIÓN DE FOTOS
-- ─────────────────────────────────────────────────────────
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS latitud       NUMERIC(10, 7),  -- ej: 20.5887999
  ADD COLUMN IF NOT EXISTS longitud      NUMERIC(10, 7),  -- ej: -100.3898881
  ADD COLUMN IF NOT EXISTS gps_accuracy  NUMERIC(8, 2),   -- precisión en metros
  ADD COLUMN IF NOT EXISTS gps_capturado_at TIMESTAMPTZ;

-- Índice por categoría+gps para queries de "fotos sin georreferencia"
CREATE INDEX IF NOT EXISTS idx_documentos_categoria_gps
  ON documentos (categoria) WHERE latitud IS NULL;

-- ─────────────────────────────────────────────────────────
-- 3. MOTIVO DE DEVOLUCIÓN (último mensaje del controlador al valuador)
-- ─────────────────────────────────────────────────────────
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS motivo_devolucion TEXT,
  ADD COLUMN IF NOT EXISTS devuelto_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devoluciones_count INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────
-- 4. FUNCIÓN HELPER: devolver avalúo a preavalúo
--    Hace todo en una sola operación atómica
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_devolver_a_preavaluo(
  p_avaluo_id UUID,
  p_usuario_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_actual TEXT;
  v_controlador   UUID;
  v_rpc_resultado JSONB;
BEGIN
  -- 1. Validar que el avalúo existe y está en estado revision
  SELECT estado, controlador_id INTO v_estado_actual, v_controlador
    FROM avaluos WHERE id = p_avaluo_id;

  IF v_estado_actual IS NULL THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'Avalúo no encontrado');
  END IF;
  IF v_estado_actual != 'revision' THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'El avalúo no está en estado revisión');
  END IF;
  IF v_controlador != p_usuario_id THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'No eres el controlador asignado');
  END IF;
  IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 10 THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'El motivo debe tener al menos 10 caracteres');
  END IF;

  -- 2. Guardar motivo y contador
  UPDATE avaluos SET
    motivo_devolucion  = p_motivo,
    devuelto_at        = NOW(),
    devoluciones_count = devoluciones_count + 1
  WHERE id = p_avaluo_id;

  -- 3. Cambiar estado usando la RPC existente
  SELECT fn_cambiar_estado_avaluo(
    p_avaluo_id,
    'preavaluo',
    p_usuario_id,
    'Controlador solicitó re-ajuste: ' || LEFT(p_motivo, 200)
  ) INTO v_rpc_resultado;

  RETURN v_rpc_resultado;
END;
$$;
