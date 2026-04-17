-- ============================================================
-- FIX: Infinite recursion en policy perfiles_cliente_propio
--
-- La policy de SELECT sobre `perfiles` hacía un EXISTS sobre la
-- misma tabla `perfiles` → Postgres detecta recursión y aborta
-- con 42P17, bloqueando el login de TODOS los usuarios.
--
-- Solución: función SECURITY DEFINER que lee perfiles con
-- privilegios elevados (saltándose RLS), y dos policies simples.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_es_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = p_uid AND rol = 'administrador'
  );
$$;

REVOKE ALL ON FUNCTION fn_es_admin(UUID) FROM public;
GRANT EXECUTE ON FUNCTION fn_es_admin(UUID) TO authenticated;

-- Reescribir la policy de perfiles sin recursión
DROP POLICY IF EXISTS "perfiles_cliente_propio" ON perfiles;

CREATE POLICY "perfiles_self_select" ON perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "perfiles_admin_select" ON perfiles
  FOR SELECT TO authenticated
  USING (fn_es_admin(auth.uid()));

-- Reescribir avaluos_select_cliente_propios para evitar el mismo patrón
DROP POLICY IF EXISTS "avaluos_select_cliente_propios" ON avaluos;
CREATE POLICY "avaluos_select_cliente_propios" ON avaluos
  FOR SELECT TO authenticated
  USING (
    cliente_id = auth.uid()
    OR fn_es_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('evaluador','controlador')
    )
  );
