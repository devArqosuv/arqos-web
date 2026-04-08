import { redirect } from 'next/navigation';
import { createClient } from '@/util/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  const rol = perfil?.rol || 'evaluador';
  if (rol === 'administrador') redirect('/dashboard/admin');
  if (rol === 'controlador') redirect('/dashboard/controlador');
  redirect('/dashboard/evaluador');
}
