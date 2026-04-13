import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import TablaAvaluosClient from './TablaAvaluosClient';

export default async function TablaAvaluosPage() {
  await requireRole(['administrador']);
  const supabase = await createClient();

  // Cargar todos los avalúos con campos SHF + joins
  const { data: avaluosRaw } = await supabase
    .from('avaluos')
    .select(`
      *,
      valuador:valuador_id (nombre, apellidos, email),
      controlador:controlador_id (nombre, apellidos, email)
    `)
    .order('created_at', { ascending: false });

  // Cargar documentos agrupados por avalúo
  const { data: documentosRaw } = await supabase
    .from('documentos')
    .select('id, avaluo_id, nombre, categoria, storage_path, tipo_mime')
    .order('created_at', { ascending: true });

  // Generar signed URLs para documentos
  const documentosConUrl = await Promise.all(
    (documentosRaw ?? []).map(async (doc) => {
      const { data } = await supabase.storage
        .from('documentos')
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, url: data?.signedUrl ?? null };
    })
  );

  // Agrupar documentos por avaluo_id
  const docsPorAvaluo: Record<string, typeof documentosConUrl> = {};
  documentosConUrl.forEach((doc) => {
    if (!docsPorAvaluo[doc.avaluo_id]) docsPorAvaluo[doc.avaluo_id] = [];
    docsPorAvaluo[doc.avaluo_id].push(doc);
  });

  // Aplanar joins
  const avaluos = (avaluosRaw ?? []).map((a) => {
    const v = Array.isArray(a.valuador) ? a.valuador[0] : a.valuador;
    const c = Array.isArray(a.controlador) ? a.controlador[0] : a.controlador;
    return {
      ...a,
      valuador_nombre: v ? `${v.nombre} ${v.apellidos ?? ''}`.trim() : null,
      controlador_nombre: c ? `${c.nombre} ${c.apellidos ?? ''}`.trim() : null,
      documentos: docsPorAvaluo[a.id] ?? [],
    };
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TablaAvaluosClient avaluos={avaluos} />
    </div>
  );
}
