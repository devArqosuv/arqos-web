// Layout pass-through del dashboard.
//
// Su único propósito es aplicar `dynamic = 'force-dynamic'` a TODAS las
// rutas bajo /dashboard/**. Aunque los Server Components ya son dinámicos
// por leer cookies vía @supabase/ssr, marcarlo explícitamente es defensa
// en profundidad contra cualquier cacheo accidental (ISR, Route Cache,
// CDN) que pueda servir HTML de un usuario a otro en producción.
//
// También deshabilitamos el fetch cache por si alguna llamada a Supabase
// se llegara a deduplicar entre requests.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
