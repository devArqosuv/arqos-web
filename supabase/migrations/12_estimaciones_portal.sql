-- =============================================================
-- Migración 12: Tabla de estimaciones del portal ARQOS Data
-- Captura leads + datos de su propiedad + estimación IA
-- =============================================================

CREATE TABLE IF NOT EXISTS estimaciones_portal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Datos del lead
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  -- Datos del inmueble
  direccion TEXT NOT NULL,
  tipo_inmueble TEXT NOT NULL,
  superficie NUMERIC,
  recamaras INTEGER,
  -- Resultado IA
  valor_bajo NUMERIC,
  valor_centro NUMERIC,
  valor_alto NUMERIC,
  precio_m2 NUMERIC,
  ciudad_detectada TEXT,
  zona_detectada TEXT,
  justificacion TEXT,
  factores JSONB,
  -- Refinamiento chat (se actualiza si el usuario usa el chat)
  valor_refinado NUMERIC,
  chat_mensajes JSONB,
  -- Seguimiento
  solicito_avaluo BOOLEAN DEFAULT false,
  atendida BOOLEAN DEFAULT false,
  notas_internas TEXT,
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_estimaciones_email ON estimaciones_portal(email);
CREATE INDEX IF NOT EXISTS idx_estimaciones_created ON estimaciones_portal(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimaciones_atendida ON estimaciones_portal(atendida) WHERE atendida = false;

-- RLS: permitir INSERT desde cualquier usuario (público) pero solo admin lee
ALTER TABLE estimaciones_portal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimaciones_insert_publico" ON estimaciones_portal
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "estimaciones_select_admin" ON estimaciones_portal
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "estimaciones_update_admin" ON estimaciones_portal
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );
