-- ============================================================
-- MIGRACIÓN 08: Storage RLS policies para bucket 'documentos'
--
-- Habilita uploads directos del cliente authenticated al Storage
-- bypasseando Vercel. Sin estas policies, el cliente recibe
-- "new row violates row-level security policy" al intentar subir.
--
-- Modelo: el path siempre arranca con `avaluos/<avaluo_id>/...`,
-- y solo el valuador/solicitante del avaluo puede insertar/leer ahí.
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- Helper: extraer el avaluo_id del storage_path
-- Path típico: 'avaluos/<uuid>/<doc-id>-<timestamp>.<ext>'
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_extraer_avaluo_id_de_path(p_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_partes TEXT[];
BEGIN
  v_partes := string_to_array(p_path, '/');
  IF array_length(v_partes, 1) < 2 OR v_partes[1] != 'avaluos' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN v_partes[2]::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- Policy 1: INSERT — el valuador o solicitante del avalúo puede subir
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_storage_insert_valuador" ON storage.objects;
CREATE POLICY "documentos_storage_insert_valuador"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM avaluos
      WHERE avaluos.id = fn_extraer_avaluo_id_de_path(name)
        AND (avaluos.valuador_id = auth.uid() OR avaluos.solicitante_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────
-- Policy 2: INSERT — el controlador asignado puede subir
-- (necesario para que controlador suba comparables, fotos extra, etc.)
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_storage_insert_controlador" ON storage.objects;
CREATE POLICY "documentos_storage_insert_controlador"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM avaluos
      WHERE avaluos.id = fn_extraer_avaluo_id_de_path(name)
        AND avaluos.controlador_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────
-- Policy 3: SELECT — leer documentos del propio avalúo
-- (valuador, solicitante o controlador asignado)
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_storage_select_propio" ON storage.objects;
CREATE POLICY "documentos_storage_select_propio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM avaluos
      WHERE avaluos.id = fn_extraer_avaluo_id_de_path(name)
        AND (
          avaluos.valuador_id = auth.uid()
          OR avaluos.solicitante_id = auth.uid()
          OR avaluos.controlador_id = auth.uid()
        )
    )
  );

-- ─────────────────────────────────────────────────────────
-- Policy 4: SELECT — admin puede leer todos los documentos
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_storage_select_admin" ON storage.objects;
CREATE POLICY "documentos_storage_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND fn_rol_actual() = 'administrador'
  );

-- ─────────────────────────────────────────────────────────
-- Policy 5: DELETE — el valuador o controlador puede borrar archivos
-- de sus propios avalúos (por si suben uno equivocado y quieren reemplazar)
-- ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_storage_delete_propio" ON storage.objects;
CREATE POLICY "documentos_storage_delete_propio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM avaluos
      WHERE avaluos.id = fn_extraer_avaluo_id_de_path(name)
        AND (
          avaluos.valuador_id = auth.uid()
          OR avaluos.controlador_id = auth.uid()
        )
    )
  );
