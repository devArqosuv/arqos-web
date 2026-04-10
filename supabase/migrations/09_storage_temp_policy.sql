-- ============================================================
-- MIGRACIÓN 09: Storage RLS policy para carpeta temp/
--
-- Permite a usuarios autenticados subir archivos a temp/
-- para el análisis de IA antes de crear el avalúo.
-- Los archivos se mueven a avaluos/{id}/ al guardar.
-- ============================================================

-- Policy: cualquier usuario autenticado puede subir a temp/
DROP POLICY IF EXISTS "documentos_storage_insert_temp" ON storage.objects;
CREATE POLICY "documentos_storage_insert_temp"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'temp'
  );

-- Policy: cualquier usuario autenticado puede leer de temp/
DROP POLICY IF EXISTS "documentos_storage_select_temp" ON storage.objects;
CREATE POLICY "documentos_storage_select_temp"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'temp'
  );

-- Policy: cualquier usuario autenticado puede borrar de temp/
DROP POLICY IF EXISTS "documentos_storage_delete_temp" ON storage.objects;
CREATE POLICY "documentos_storage_delete_temp"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'temp'
  );
