-- =============================================================
-- Migración 16: Rol "cliente" + flujo "Solicitar informe formal"
--
-- Agrega el rol 'cliente' al enum rol_usuario y los campos
-- necesarios para enlazar una estimación de ARQOS Data con un
-- perfil recién creado y un expediente en `avaluos` de origen
-- "cliente_portal".
-- =============================================================

-- 1. Agregar 'cliente' al enum rol_usuario
-- Postgres exige que ADD VALUE corra fuera de un DO si el enum
-- se usa en la misma migración, por eso queda suelto.
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Link entre estimacion_portal y perfil cliente creado al solicitar
ALTER TABLE estimaciones_portal
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES perfiles(id);

-- 3. Link entre estimacion_portal y avaluo creado tras la solicitud
ALTER TABLE estimaciones_portal
  ADD COLUMN IF NOT EXISTS avaluo_id UUID REFERENCES avaluos(id);

-- 4. Nuevos campos en avaluos para identificar el origen del expediente
ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'interno';  -- 'interno' | 'cliente_portal'

ALTER TABLE avaluos
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES perfiles(id);

-- Índice para el dashboard del cliente
CREATE INDEX IF NOT EXISTS idx_avaluos_cliente_id ON avaluos(cliente_id) WHERE cliente_id IS NOT NULL;

-- =============================================================
-- RLS
--
-- Política para que los clientes solo vean sus propios
-- expedientes. Admin/evaluador/controlador mantienen el acceso
-- que ya tenían por otras políticas.
-- =============================================================

DROP POLICY IF EXISTS "avaluos_select_cliente_propios" ON avaluos;
CREATE POLICY "avaluos_select_cliente_propios" ON avaluos
  FOR SELECT TO authenticated
  USING (
    cliente_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('administrador','evaluador','controlador')
    )
  );

-- El cliente debe poder leer su propio perfil (para el dashboard).
DROP POLICY IF EXISTS "perfiles_cliente_propio" ON perfiles;
CREATE POLICY "perfiles_cliente_propio" ON perfiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
  );

-- El cliente debe poder leer sus propias estimaciones (para el historial).
DROP POLICY IF EXISTS "estimaciones_select_cliente_propio" ON estimaciones_portal;
CREATE POLICY "estimaciones_select_cliente_propio" ON estimaciones_portal
  FOR SELECT TO authenticated
  USING (
    cliente_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'administrador'
    )
  );
