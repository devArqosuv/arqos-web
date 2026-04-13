-- ============================================================
-- SEED: Usuarios de pruebas
--   admin@prueba.com        / 12345  → administrador
--   valuadores@prueba.com   / 12345  → evaluador
--   controladores@prueba.com/ 12345  → controlador
--
-- Inserta directamente en auth.users con crypt() (pgcrypto).
-- El trigger fn_crear_perfil_usuario creará los perfiles,
-- pero también los reafirmamos abajo por seguridad.
--
-- IMPORTANTE: La contraseña '12345' es insegura, solo para pruebas.
-- ============================================================

-- pgcrypto suele estar habilitado por defecto en Supabase.
-- Si no lo estuviera, descomenta la línea siguiente:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Helper: crear usuario en auth.users si no existe
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_seed_usuario(
  p_email    TEXT,
  p_password TEXT,
  p_nombre   TEXT,
  p_rol      rol_usuario
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Si ya existe el usuario en auth, reutilizamos su id
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', p_nombre, 'rol', p_rol::text),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Identity asociada (requerida por Supabase Auth v2)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Reafirmar perfil (por si el trigger no corrió o se creó con rol por defecto)
  INSERT INTO perfiles (id, email, nombre, rol, activo)
  VALUES (v_user_id, p_email, p_nombre, p_rol, TRUE)
  ON CONFLICT (id) DO UPDATE
    SET rol    = EXCLUDED.rol,
        nombre = EXCLUDED.nombre,
        email  = EXCLUDED.email,
        activo = TRUE;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Crear los tres usuarios de prueba
-- ------------------------------------------------------------
SELECT fn_seed_usuario('admin@prueba.com',         '12345', 'Administrador', 'administrador');
SELECT fn_seed_usuario('valuadores@prueba.com',    '12345', 'Valuador',      'evaluador');
SELECT fn_seed_usuario('controladores@prueba.com', '12345', 'Controlador',   'controlador');

-- Limpieza: la función solo se usa para el seed
DROP FUNCTION fn_seed_usuario(TEXT, TEXT, TEXT, rol_usuario);
