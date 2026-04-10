-- ============================================================
-- FIX 06b: RLS bloqueando fn_generar_folio
--
-- Problema: La tabla folios_correlativo se creó sin RLS habilitado
-- (por default Postgres permite todo) PERO al ser tabla nueva en Supabase,
-- el cliente authenticated no tiene grants. El INSERT desde el trigger
-- fallaba con "new row violates row-level security policy".
--
-- Solución: marcar fn_generar_folio como SECURITY DEFINER. Esto hace que
-- la función corra con los permisos del owner (postgres / superuser),
-- bypass de RLS. Es el patrón estándar para counters/secuencias en
-- Supabase.
--
-- Bonus: hacemos lo mismo con fn_asignar_folio_avaluo para consistencia.
-- ============================================================

-- 1. Re-crear fn_generar_folio con SECURITY DEFINER
CREATE OR REPLACE FUNCTION fn_generar_folio(p_tipo_avaluo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anio        INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_prefijo     TEXT;
  v_siguiente   INTEGER;
BEGIN
  IF p_tipo_avaluo = '1.0' THEN
    v_prefijo := 'PE';
  ELSIF p_tipo_avaluo = '2.0' THEN
    v_prefijo := 'CR';
  ELSE
    v_prefijo := 'AV';
  END IF;

  INSERT INTO folios_correlativo (anio, tipo_prefijo, ultimo)
    VALUES (v_anio, v_prefijo, 1)
    ON CONFLICT (anio, tipo_prefijo)
    DO UPDATE SET ultimo = folios_correlativo.ultimo + 1
    RETURNING ultimo INTO v_siguiente;

  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_siguiente::TEXT, 4, '0');
END;
$$;

-- 2. Lo mismo con el trigger (security definer + search_path)
CREATE OR REPLACE FUNCTION fn_asignar_folio_avaluo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := fn_generar_folio(COALESCE(NEW.tipo_avaluo_codigo, '2.0'));
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Habilitar RLS en folios_correlativo (defensa en profundidad —
--    la tabla solo se toca vía la función SECURITY DEFINER, así que
--    bloqueamos cualquier acceso directo del cliente authenticated).
ALTER TABLE folios_correlativo ENABLE ROW LEVEL SECURITY;

-- Sin policies = nadie puede leer ni escribir directamente.
-- La función fn_generar_folio bypassea esto por SECURITY DEFINER.
