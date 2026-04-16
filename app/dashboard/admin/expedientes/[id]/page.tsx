import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import ControladorAvaluoClient from '@/app/dashboard/controlador/expedientes/[id]/ControladorAvaluoClient';
import ValidacionSHFPanel from './ValidacionSHFPanel';

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
      controlador_id,
      valor_unitario, valor_construcciones, depreciacion, valor_fisico_total,
      investigacion_mercado, rango_valores, homologacion, resultado_mercado,
      cap_ingresos, cap_tasa, cap_valor,
      conciliacion_comparacion, conciliacion_ponderacion, conciliacion_justificacion,
      declaracion_alcance, declaracion_supuestos, declaracion_limitaciones
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

  // Cargar documentos completos con signed URLs
  const { data: documentosRaw } = await supabase
    .from('documentos')
    .select('id, nombre, categoria, storage_path, tipo_mime, tamanio_bytes, created_at')
    .eq('avaluo_id', id)
    .order('created_at', { ascending: true });

  const documentos = await Promise.all(
    (documentosRaw ?? []).map(async (doc) => {
      const { data } = await supabase.storage
        .from('documentos')
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, url: data?.signedUrl ?? null };
    })
  );

  const contadores = { fachada: 0, entorno: 0, interior: 0, documento: 0 };
  documentos.forEach((d) => {
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
        <ValidacionSHFPanel avaluoId={avaluo.id} estado={avaluo.estado} />
        <ControladorAvaluoClient
          documentos={documentos}
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
            // Enfoques SHF
            valor_unitario: (avaluo as { valor_unitario: number | null }).valor_unitario ?? null,
            valor_construcciones: (avaluo as { valor_construcciones: number | null }).valor_construcciones ?? null,
            depreciacion: (avaluo as { depreciacion: number | null }).depreciacion ?? null,
            valor_fisico_total: (avaluo as { valor_fisico_total: number | null }).valor_fisico_total ?? null,
            investigacion_mercado: (avaluo as { investigacion_mercado: string | null }).investigacion_mercado ?? null,
            rango_valores: (avaluo as { rango_valores: string | null }).rango_valores ?? null,
            homologacion: (avaluo as { homologacion: string | null }).homologacion ?? null,
            resultado_mercado: (avaluo as { resultado_mercado: string | number | null }).resultado_mercado != null
              ? Number((avaluo as { resultado_mercado: string | number | null }).resultado_mercado)
              : null,
            cap_ingresos: (avaluo as { cap_ingresos: number | null }).cap_ingresos ?? null,
            cap_tasa: (avaluo as { cap_tasa: number | null }).cap_tasa ?? null,
            cap_valor: (avaluo as { cap_valor: number | null }).cap_valor ?? null,
            conciliacion_comparacion: (avaluo as { conciliacion_comparacion: string | null }).conciliacion_comparacion ?? null,
            conciliacion_ponderacion: (avaluo as { conciliacion_ponderacion: string | null }).conciliacion_ponderacion ?? null,
            conciliacion_justificacion: (avaluo as { conciliacion_justificacion: string | null }).conciliacion_justificacion ?? null,
            declaracion_alcance: (avaluo as { declaracion_alcance: string | null }).declaracion_alcance ?? null,
            declaracion_supuestos: (avaluo as { declaracion_supuestos: string | null }).declaracion_supuestos ?? null,
            declaracion_limitaciones: (avaluo as { declaracion_limitaciones: string | null }).declaracion_limitaciones ?? null,
          }}
          comparables={comparablesRaw ?? []}
          contadoresFotos={contadores}
        />
      </div>
    </div>
  );
}
