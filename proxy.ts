import { NextResponse, type NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────
// Proxy (ex-middleware en Next 16)
//
// Responsabilidad ÚNICA: optimistic auth check.
// Lee las cookies de Supabase. Si no existen y la ruta es privada,
// redirige a /login. NO llama a getUser ni a la DB — eso lo hace
// cada Server Component en su propio chequeo (defensa en profundidad).
//
// Esto previene que un usuario no autenticado pueda tipear una URL
// como /dashboard/evaluador y renderizar páginas cliente sin sesión.
//
// Referencia: node_modules/next/dist/docs/01-app/02-guides/authentication.md
// ("Optimistic checks with Proxy")
// ─────────────────────────────────────────────────────────────

// Prefijos de rutas que requieren sesión
const PROTECTED_PREFIXES = ['/dashboard'];

// Rutas siempre públicas (aunque encajen en un prefijo protegido)
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/auth/signout',
]);

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

// @supabase/ssr escribe la sesión en una cookie con nombre
// sb-<project-ref>-auth-token (a veces chunked en .0, .1, …)
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  const cookies = req.cookies.getAll();
  return cookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token'),
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isProtectedPath(pathname) && !hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Guardamos a dónde quería ir para redirigir post-login
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Matcher: corre en todas las rutas EXCEPTO assets estáticos y favicon
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-arqos.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
