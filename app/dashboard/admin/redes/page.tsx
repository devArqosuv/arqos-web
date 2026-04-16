import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import RedesClient from './RedesClient';
import type { PublicacionRedRow } from './actions';

export default async function RedesAdminPage() {
  await requireRole(['administrador']);

  const supabase = await createClient();
  const { data } = await supabase
    .from('publicaciones_redes')
    .select(
      'id, plataforma, titulo, contenido, hashtags, imagen_url, estado, programada_para, publicada_at, generada_con_ia, prompt_original, notas, aprobada_por, aprobada_at, created_by, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const publicaciones = (data ?? []) as PublicacionRedRow[];

  return <RedesClient publicaciones={publicaciones} />;
}
