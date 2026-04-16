-- =============================================================
-- Migración 13: Tabla de tarifas y catálogo de costos operativos
-- Tarifas del servicio de avalúos (1.0 y 2.0) configurables por admin
-- Costos operativos mensuales de infraestructura (para dashboard)
-- =============================================================

-- ── Tabla de tarifas (precios del servicio de avalúos) ────────
CREATE TABLE IF NOT EXISTS tarifas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_avaluo_codigo TEXT NOT NULL,      -- '1.0' o '2.0'
  nombre TEXT NOT NULL,                   -- ej. "Primera Enajenación - Vivienda Básica"
  rango_valor_min NUMERIC,
  rango_valor_max NUMERIC,
  precio NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  activa BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarifas_tipo ON tarifas(tipo_avaluo_codigo);
CREATE INDEX IF NOT EXISTS idx_tarifas_activa ON tarifas(activa) WHERE activa = true;

-- ── Tabla de configuración de costos (infraestructura) ────────
CREATE TABLE IF NOT EXISTS configuracion_costos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio TEXT NOT NULL,      -- 'supabase', 'vercel', 'openrouter', 'facturapi', 'mapbox'
  plan TEXT,                   -- 'pro', 'free', 'enterprise'
  costo_mensual NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'USD',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configuracion_costos_servicio ON configuracion_costos(servicio);

-- =============================================================
-- RLS: solo administradores pueden hacer cualquier operación
-- =============================================================

ALTER TABLE tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_costos ENABLE ROW LEVEL SECURITY;

-- tarifas: SELECT/INSERT/UPDATE/DELETE admin
CREATE POLICY "tarifas_select_admin" ON tarifas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "tarifas_insert_admin" ON tarifas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "tarifas_update_admin" ON tarifas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "tarifas_delete_admin" ON tarifas
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- configuracion_costos: SELECT/INSERT/UPDATE/DELETE admin
CREATE POLICY "configuracion_costos_select_admin" ON configuracion_costos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "configuracion_costos_insert_admin" ON configuracion_costos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "configuracion_costos_update_admin" ON configuracion_costos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

CREATE POLICY "configuracion_costos_delete_admin" ON configuracion_costos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );

-- =============================================================
-- Seed inicial
-- =============================================================

INSERT INTO tarifas (tipo_avaluo_codigo, nombre, rango_valor_min, rango_valor_max, precio, moneda, activa, notas)
VALUES
  ('1.0', 'Primera Enajenación - Vivienda Básica', 0, 1500000, 3500, 'MXN', true, 'Vivienda de interés social'),
  ('1.0', 'Primera Enajenación - Vivienda Media', 1500000, 4000000, 5500, 'MXN', true, 'Vivienda media residencial'),
  ('2.0', 'BBVA - Estándar', null, null, 7500, 'MXN', true, 'Avalúo bancario BBVA'),
  ('2.0', 'Banorte - Estándar', null, null, 8500, 'MXN', true, 'Avalúo bancario Banorte')
ON CONFLICT DO NOTHING;

INSERT INTO configuracion_costos (servicio, plan, costo_mensual, moneda, notas)
VALUES
  ('supabase', 'pro', 25, 'USD', 'Supabase Pro plan'),
  ('vercel', 'pro', 20, 'USD', 'Vercel Pro plan'),
  ('openrouter', 'pago-por-uso', 50, 'USD', 'Estimado mensual — extracciones IA'),
  ('facturapi', 'standard', 15, 'USD', 'Facturación electrónica')
ON CONFLICT DO NOTHING;
