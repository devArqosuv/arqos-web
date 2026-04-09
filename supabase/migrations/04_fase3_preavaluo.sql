-- ============================================================
-- FASE 3: Preavalúo, comparables y comparativa UV vs Valuador
--
-- Cambios:
-- 1. La transición visita_realizada → preavaluo debe ser del CONTROLADOR
--    (la migración 03 la dejó como 'evaluador', la corregimos)
-- 2. La transición preavaluo → revision la hace el VALUADOR cuando ajusta
-- 3. RLS extra: el controlador puede leer/escribir comparables del avalúo
--    que tiene asignado (la política actual solo permite al creador o admin)
-- ============================================================

-- 1. Corregir transición visita_realizada → preavaluo (debe ser controlador)
DELETE FROM workflow_transiciones
  WHERE estado_origen = 'visita_realizada' AND estado_destino = 'preavaluo';

INSERT INTO workflow_transiciones (estado_origen, estado_destino, rol_requerido, requiere_docs, descripcion)
VALUES
  ('visita_realizada', 'preavaluo', 'controlador', FALSE, 'Controlador (UV) genera preavalúo con homologación de comparables');

-- 2. Permitir que el controlador lea comparables de los avalúos que tiene asignados
DROP POLICY IF EXISTS "comparables_select_controlador_asignado" ON comparables;
CREATE POLICY "comparables_select_controlador_asignado"
  ON comparables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = comparables.avaluo_id
        AND a.controlador_id = auth.uid()
    )
  );

-- 3. Permitir que el controlador escriba comparables (insert/update/delete)
--    de los avalúos que tiene asignados
DROP POLICY IF EXISTS "comparables_write_controlador_asignado" ON comparables;
CREATE POLICY "comparables_write_controlador_asignado"
  ON comparables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = comparables.avaluo_id
        AND a.controlador_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = comparables.avaluo_id
        AND a.controlador_id = auth.uid()
    )
  );

-- 4. El valuador también necesita leer los comparables del controlador
--    para ver el preavalúo antes de ajustar su valor
DROP POLICY IF EXISTS "comparables_select_valuador_asignado" ON comparables;
CREATE POLICY "comparables_select_valuador_asignado"
  ON comparables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avaluos a
      WHERE a.id = comparables.avaluo_id
        AND (a.valuador_id = auth.uid() OR a.solicitante_id = auth.uid())
    )
  );
