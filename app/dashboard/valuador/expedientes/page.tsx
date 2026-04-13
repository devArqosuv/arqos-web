import { requireRole } from '@/util/supabase/dal';
import ExpedientesClient from './ExpedientesClient';

// Server Component shell.
// Gate de autenticación server-side antes de renderizar el listado
// (que es un client component con estado local y filtros).
export default async function ExpedientesPage() {
  await requireRole(['evaluador', 'administrador']);
  return <ExpedientesClient />;
}
