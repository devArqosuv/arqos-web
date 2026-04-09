import { redirect } from 'next/navigation';
import { verifySession } from '@/util/supabase/dal';

export default async function RootPage() {
  const { perfil } = await verifySession();
  if (perfil.rol === 'administrador') redirect('/dashboard/admin');
  if (perfil.rol === 'controlador') redirect('/dashboard/controlador');
  redirect('/dashboard/valuador');
}
