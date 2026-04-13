import { createBrowserClient } from '@supabase/ssr'

// Cliente del navegador para Supabase.
//
// IMPORTANTE: NO pases `cookieOptions.maxAge: 0`. Eso no crea una session
// cookie — le dice al navegador "bórrala inmediatamente", lo que corrompe
// el estado de auth cada vez que Supabase refresca el token en el cliente.
// Se notaba en producción como "a veces el usuario cambia al navegar entre
// pestañas" con múltiples usuarios.
//
// Usamos los defaults de @supabase/ssr para garantizar que multi-usuario
// sea estable. La UX de "session cookie estricta" (cerrar al cerrar ventana)
// se puede reintroducir más adelante de forma segura.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}