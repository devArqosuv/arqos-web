-- =============================================================
-- Migración 11: Firma digital imagen para valuadores y controladores
-- Cada usuario sube su imagen de firma (PNG/JPG) que se incluye en el PDF
-- =============================================================

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS firma_imagen_url TEXT;
