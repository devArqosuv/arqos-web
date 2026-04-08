import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Cookie de sesión: sin maxAge ni expires → se borra al cerrar el navegador
            const sessionOptions = { ...options, maxAge: undefined, expires: undefined };
            response.cookies.set(name, value, sessionOptions);
          });
        },
      },
    }
  );

  // Refresca el token si es necesario y lee el usuario
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Rutas públicas: login y callbacks de auth. Todo lo demás requiere sesión.
  const esRutaPublica =
    pathname === '/login' ||
    pathname.startsWith('/auth/');

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon, logo, imágenes públicas
     * - api routes (se protegen por su cuenta)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-arqos.png|api).*)',
  ],
};
