import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import UsuariosClient, { type Usuario } from './UsuariosClient';

export default async function UsuariosPage() {
  const { user } = await requireRole(['administrador']);
  const supabase = await createClient();

  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre, apellidos, email, rol, activo, created_at, avatar_url')
    .order('created_at', { ascending: false });

  const usuarios: Usuario[] = (data ?? []).map((u) => ({
    ...u,
    rol: u.rol as 'administrador' | 'evaluador' | 'controlador',
  }));

  return <UsuariosClient usuarios={usuarios} adminId={user.id} />;
}
