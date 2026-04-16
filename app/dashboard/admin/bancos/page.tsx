import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import BancosClient, { type BancoConDocs } from './BancosClient';

export default async function BancosPage() {
  await requireRole(['administrador']);
  const supabase = await createClient();

  const { data: bancosData } = await supabase
    .from('bancos')
    .select('id, nombre, logo_url, color_hex, activo, orden')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  const { data: documentosData } = await supabase
    .from('banco_documentos')
    .select('id, banco_id, nombre, descripcion, obligatorio, orden')
    .order('orden', { ascending: true });

  const bancos: BancoConDocs[] = (bancosData ?? []).map((b) => ({
    ...b,
    documentos: (documentosData ?? []).filter((d) => d.banco_id === b.id),
  }));

  return <BancosClient bancos={bancos} />;
}
