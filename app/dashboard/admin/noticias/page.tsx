import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import NoticiasAdminClient, { type NoticiaRow } from './NoticiasAdminClient';

export default async function NoticiasAdminPage() {
  await requireRole(['administrador']);

  const supabase = await createClient();
  const { data } = await supabase
    .from('noticias')
    .select('id, titulo, contenido, tipo, roles_destinatarios, activa, fecha_publicacion, fecha_expiracion, created_at')
    .order('fecha_publicacion', { ascending: false });

  const noticias = (data ?? []) as NoticiaRow[];

  return <NoticiasAdminClient noticias={noticias} />;
}
