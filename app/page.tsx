import { redirect } from 'next/navigation';
import { createClient } from '@/util/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // No logueado → landing page pública
    redirect('/landing');
  }

  // Logueado → dashboard según rol
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol === 'administrador') redirect('/dashboard/admin');
  if (perfil?.rol === 'controlador') redirect('/dashboard/controlador');
  if (perfil?.rol === 'cliente') redirect('/dashboard/cliente');
  redirect('/dashboard/valuador');
}
