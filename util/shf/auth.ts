// =============================================================
// Auth + rate limit compartidos entre endpoints /api/shf/*
// =============================================================

import { createClient } from '@/util/supabase/server';
import { createRateLimiter } from '@/util/rate-limit';

// Un solo limitador compartido por todos los endpoints SHF. La llave
// es el user_id cuando hay sesión, y el IP cuando no.
const rateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 60 * 1000, // 1h
});

export interface SesionSHF {
  userId: string;
  rol: 'administrador' | 'controlador' | 'evaluador';
  email: string | null;
}

export type ResultadoAuth =
  | { ok: true; sesion: SesionSHF }
  | { ok: false; status: 401 | 403; mensaje: string };

// Verifica que hay sesión y que el rol es admin o controlador.
export async function requireAdminOControlador(): Promise<ResultadoAuth> {
  const supabase = await createClient();
  const { data: { user }, error: errUser } = await supabase.auth.getUser();

  if (errUser || !user) {
    return { ok: false, status: 401, mensaje: 'Sesión requerida.' };
  }

  const { data: perfil, error: errPerfil } = await supabase
    .from('perfiles')
    .select('id, rol, activo')
    .eq('id', user.id)
    .single();

  if (errPerfil || !perfil) {
    return { ok: false, status: 401, mensaje: 'Perfil no encontrado.' };
  }
  if (!perfil.activo) {
    return { ok: false, status: 403, mensaje: 'Usuario inactivo.' };
  }
  if (perfil.rol !== 'administrador' && perfil.rol !== 'controlador') {
    return { ok: false, status: 403, mensaje: 'Requiere rol admin o controlador.' };
  }

  return {
    ok: true,
    sesion: {
      userId: user.id,
      rol: perfil.rol as SesionSHF['rol'],
      email: user.email ?? null,
    },
  };
}

export function checkRateLimit(userId: string) {
  return rateLimiter(`shf:${userId}`);
}
