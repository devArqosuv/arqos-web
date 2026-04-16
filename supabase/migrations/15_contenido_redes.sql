-- =============================================================
-- Migración 15: Redes Sociales con IA + Calendario Editorial
-- Tabla para gestionar publicaciones generadas con IA,
-- aprobadas, programadas y publicadas en distintas plataformas.
-- =============================================================

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plataforma_red') THEN
    CREATE TYPE plataforma_red AS ENUM ('linkedin', 'instagram', 'facebook', 'x', 'tiktok');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_publicacion') THEN
    CREATE TYPE estado_publicacion AS ENUM ('borrador', 'en_revision', 'aprobada', 'programada', 'publicada', 'archivada');
  END IF;
END$$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS publicaciones_redes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma plataforma_red NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  hashtags TEXT[],
  imagen_url TEXT,
  estado estado_publicacion NOT NULL DEFAULT 'borrador',
  programada_para TIMESTAMPTZ,
  publicada_at TIMESTAMPTZ,
  generada_con_ia BOOLEAN DEFAULT true,
  prompt_original TEXT,
  notas TEXT,
  aprobada_por UUID REFERENCES auth.users(id),
  aprobada_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_redes_estado ON publicaciones_redes (estado, programada_para);
CREATE INDEX IF NOT EXISTS idx_pub_redes_plataforma ON publicaciones_redes (plataforma, programada_para DESC);

-- =============================================================
-- RLS: solo administradores
-- (Patrón copiado de 10_campos_shf_completo.sql — auth.uid() + subquery sobre perfiles.rol)
-- =============================================================
ALTER TABLE publicaciones_redes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publicaciones_redes_select_admin" ON publicaciones_redes;
CREATE POLICY "publicaciones_redes_select_admin" ON publicaciones_redes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

DROP POLICY IF EXISTS "publicaciones_redes_insert_admin" ON publicaciones_redes;
CREATE POLICY "publicaciones_redes_insert_admin" ON publicaciones_redes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

DROP POLICY IF EXISTS "publicaciones_redes_update_admin" ON publicaciones_redes;
CREATE POLICY "publicaciones_redes_update_admin" ON publicaciones_redes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

DROP POLICY IF EXISTS "publicaciones_redes_delete_admin" ON publicaciones_redes;
CREATE POLICY "publicaciones_redes_delete_admin" ON publicaciones_redes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION trg_publicaciones_redes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS publicaciones_redes_set_updated_at ON publicaciones_redes;
CREATE TRIGGER publicaciones_redes_set_updated_at
  BEFORE UPDATE ON publicaciones_redes
  FOR EACH ROW
  EXECUTE FUNCTION trg_publicaciones_redes_updated_at();
