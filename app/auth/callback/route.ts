import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Cookie de sesión: sin maxAge ni expires → se borra al cerrar el navegador
              const sessionOptions = { ...options, maxAge: undefined, expires: undefined }
              cookieStore.set(name, value, sessionOptions)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Obtener rol para redirigir al dashboard correcto
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', user.id)
          .single()

        const rol = perfil?.rol || 'evaluador'
        const destino = rol === 'administrador'
          ? '/dashboard/admin'
          : rol === 'controlador'
          ? '/dashboard/controlador'
          : '/dashboard/evaluador'

        return NextResponse.redirect(new URL(destino, origin))
      }
    }
  }

  // Si algo falla, redirigir al login con error
  return NextResponse.redirect(new URL('/login?error=auth', origin))
}