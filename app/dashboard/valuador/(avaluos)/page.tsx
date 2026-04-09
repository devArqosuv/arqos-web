import { requireRole } from '@/util/supabase/dal';
import AvaluosClient from './AvaluosClient';

// Server Component shell.
//
// Aunque el flujo de creación de avalúos es mayoritariamente client-side
// (formulario interactivo, validación en vivo, llamadas a la IA), el gate
// de autenticación DEBE ocurrir en el servidor antes de renderizar el
// client component. Sin esto, cualquier usuario podía tipear la URL
// /dashboard/valuador y ver el formulario.
export default async function AvaluosPage() {
  // Gate: requiere rol evaluador o administrador
  await requireRole(['evaluador', 'administrador']);

  return <AvaluosClient />;
}
