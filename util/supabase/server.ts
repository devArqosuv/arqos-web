import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Cookie de sesión: sin maxAge ni expires → el navegador la borra al cerrarse
              const sessionOptions = { ...options, maxAge: undefined, expires: undefined }
              cookieStore.set(name, value, sessionOptions)
            })
          } catch {
            // Esto evita errores si intentas setear cookies desde un Server Component
          }
        },
      },
    }
  )
}