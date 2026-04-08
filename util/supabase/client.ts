import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Cookie de sesión: maxAge en 0 hace que el navegador la trate
        // como session cookie (se borra al cerrar la ventana)
        maxAge: 0,
      },
    }
  )
}