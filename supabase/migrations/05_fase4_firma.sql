-- ============================================================
-- FASE 4: Firma electrónica y entrega del PDF oficial
--
-- Cambios:
-- 1. Agregar columnas para guardar la ruta y URL del PDF generado
-- 2. La transición firma → aprobado debe ser del controlador o sistema,
--    pero la disparamos cuando ambos firmaron (la migración 03 ya la creó
--    como 'controlador' que está bien).
-- ============================================================

-- 1. Columnas para el PDF oficial generado
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS pdf_oficial_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_oficial_generado_at TIMESTAMPTZ;

-- 2. Permitir que tanto controlador como valuador puedan firmar
--    (ambos hacen UPDATE de firmado_uv / firmado_valuador respectivamente)
--    Las RLS de avaluos ya cubren esto:
--    - "avaluos_controlador_actualizar" permite controlador con estado=revision,
--      pero necesitamos también estado=firma. Lo extendemos.

DROP POLICY IF EXISTS "avaluos_controlador_actualizar" ON avaluos;
CREATE POLICY "avaluos_controlador_actualizar"
  ON avaluos FOR UPDATE
  TO authenticated
  USING (
    fn_rol_actual() = 'controlador'
    AND controlador_id = auth.uid()
    AND estado IN ('revision', 'firma')
  );

-- 3. El valuador necesita poder actualizar firmado_valuador en estado firma
DROP POLICY IF EXISTS "avaluos_valuador_firmar" ON avaluos;
CREATE POLICY "avaluos_valuador_firmar"
  ON avaluos FOR UPDATE
  TO authenticated
  USING (
    fn_rol_actual() = 'evaluador'
    AND (valuador_id = auth.uid() OR solicitante_id = auth.uid())
    AND estado = 'firma'
  );
