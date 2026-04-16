import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/util/supabase/server';

// ─────────────────────────────────────────────────────────────
// Data Access Layer (DAL)
//
// Centraliza las verificaciones de sesión y rol. Usa React cache() para
// memoizar durante un mismo render pass — si múltiples Server Components
// llaman verifySession() en la misma request, sólo se hace UNA llamada a
// Supabase.
//
// Patrón recomendado por la guía oficial de Next 16:
//   node_modules/next/dist/docs/01-app/02-guides/authentication.md
//   ("Creating a Data Access Layer (DAL)")
//
// USO TÍPICO en una page.tsx:
//
//   const { user, perfil } = await requireRole(['administrador']);
//
// Si no hay sesión o el rol no está permitido, redirige automáticamente
// (nunca retorna null — el llamador puede asumir que los datos existen).
// ─────────────────────────────────────────────────────────────

export type Rol = 'administrador' | 'controlador' | 'evaluador' | 'cliente';

export interface SesionVerificada {
  user: {
    id: string;
    email: string | null;
  };
  perfil: {
    id: string;
    nombre: string;
    apellidos: string | null;
    email: string;
    rol: Rol;
    activo: boolean;
  };
}

// Verifica que haya una sesión activa y que el perfil exista.
// Si no, redirige a /login. Memoizada por render pass con React cache().
export const verifySession = cache(async (): Promise<SesionVerificada> => {
  const supabase = await createClient();
  const { data: { user }, error: errUser } = await supabase.auth.getUser();

  if (errUser || !user) {
    redirect('/login');
  }

  const { data: perfil, error: errPerfil } = await supabase
    .from('perfiles')
    .select('id, nombre, apellidos, email, rol, activo')
    .eq('id', user.id)
    .single();

  if (errPerfil || !perfil) {
    // Sesión válida pero perfil inexistente → estado inconsistente,
    // mejor forzar re-login para evitar páginas rotas.
    redirect('/login?error=perfil');
  }

  if (!perfil.activo) {
    // Usuario desactivado por un admin — no debe poder operar.
    redirect('/login?error=inactivo');
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    perfil: perfil as SesionVerificada['perfil'],
  };
});

// Verifica sesión + rol en una sola llamada. Si el rol no está en la lista
// permitida, redirige al dashboard correspondiente (o a /login si no se
// puede determinar).
export async function requireRole(rolesPermitidos: Rol[]): Promise<SesionVerificada> {
  const sesion = await verifySession();
  if (!rolesPermitidos.includes(sesion.perfil.rol)) {
    // Redirigir al dashboard del rol que SÍ tiene, no dejar pantalla rota.
    const destinoPorRol: Record<Rol, string> = {
      administrador: '/dashboard/admin',
      controlador: '/dashboard/controlador',
      evaluador: '/dashboard/valuador',
      cliente: '/dashboard/cliente',
    };
    redirect(destinoPorRol[sesion.perfil.rol] ?? '/login');
  }
  return sesion;
}
