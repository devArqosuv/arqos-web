import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import ControladorAvaluoClient from '@/app/dashboard/controlador/expedientes/[id]/ControladorAvaluoClient';

export default async function AdminAvaluoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(['administrador']);
  const supabase = await createClient();

  const { data: avaluo, error } = await supabase
    .from('avaluos')
    .select(`
      id, folio, estado, calle, colonia, municipio, estado_inmueble,
      valor_estimado, valor_uv, valor_valuador, moneda, notas,
      uso_suelo, uso_suelo_auto,
      superficie_terreno, superficie_construccion,
      fecha_solicitud, fecha_visita_agendada, fecha_visita_realizada,
      firmado_uv, firmado_valuador, fecha_firma_uv, fecha_firma_valuador,
      pdf_oficial_path,
      motivo_devolucion, devuelto_at, devoluciones_count,
      controlador_id
    `)
    .eq('id', id)
    .single();

  if (error || !avaluo) notFound();

  const { data: comparablesRaw } = await supabase
    .from('comparables')
    .select(`
      id, calle, colonia, municipio, estado_inmueble,
      tipo_inmueble, tipo, superficie_terreno, superficie_construccion,
      precio, precio_m2, moneda, fuente, url_fuente, fecha_publicacion, notas, created_at
    `)
    .eq('avaluo_id', id)
    .order('created_at', { ascending: false });

  const { data: docsCategoria } = await supabase
    .from('documentos')
    .select('categoria')
    .eq('avaluo_id', id);

  const contadores = { fachada: 0, entorno: 0, interior: 0, documento: 0 };
  (docsCategoria ?? []).forEach((d: { categoria: string | null }) => {
    if (d.categoria === 'fachada') contadores.fachada++;
    else if (d.categoria === 'entorno') contadores.entorno++;
    else if (d.categoria === 'interior') contadores.interior++;
    else if (d.categoria === 'documento') contadores.documento++;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4">
          <Link
            href="/dashboard/admin"
            className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition"
          >
            ← Volver al panel admin
          </Link>
        </div>
        <ControladorAvaluoClient
          avaluo={{
            id: avaluo.id,
            folio: avaluo.folio,
            estado: avaluo.estado,
            calle: avaluo.calle,
            colonia: avaluo.colonia,
            municipio: avaluo.municipio,
            estado_inmueble: avaluo.estado_inmueble,
            valor_estimado: avaluo.valor_estimado,
            valor_uv: avaluo.valor_uv,
            valor_valuador: avaluo.valor_valuador,
            moneda: avaluo.moneda ?? 'MXN',
            notas: avaluo.notas,
            uso_suelo: avaluo.uso_suelo,
            uso_suelo_auto: avaluo.uso_suelo_auto ?? false,
            superficie_terreno: avaluo.superficie_terreno,
            superficie_construccion: avaluo.superficie_construccion,
            fecha_solicitud: avaluo.fecha_solicitud,
            fecha_visita_agendada: avaluo.fecha_visita_agendada,
            fecha_visita_realizada: avaluo.fecha_visita_realizada,
            firmado_uv: avaluo.firmado_uv ?? false,
            firmado_valuador: avaluo.firmado_valuador ?? false,
            fecha_firma_uv: avaluo.fecha_firma_uv,
            fecha_firma_valuador: avaluo.fecha_firma_valuador,
            pdf_oficial_path: avaluo.pdf_oficial_path,
            motivo_devolucion: (avaluo as { motivo_devolucion: string | null }).motivo_devolucion ?? null,
            devuelto_at: (avaluo as { devuelto_at: string | null }).devuelto_at ?? null,
            devoluciones_count: (avaluo as { devoluciones_count: number | null }).devoluciones_count ?? 0,
          }}
          comparables={comparablesRaw ?? []}
          contadoresFotos={contadores}
        />
      </div>
    </div>
  );
}
