import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import ValuadorSidebar from '../../ValuadorSidebar';
import ValuadorTopbar from '../../ValuadorTopbar';
import AvaluoDetailClient from './AvaluoDetailClient';

export default async function AvaluoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Gate: sólo evaluadores y administradores pueden entrar a detalle
  const { user } = await requireRole(['evaluador', 'administrador']);
  const supabase = await createClient();

  // Cargar el avalúo (con join al valuador)
  const { data: avaluoRaw, error } = await supabase
    .from('avaluos')
    .select(`
      id, folio, estado, calle, colonia, municipio, estado_inmueble,
      valor_estimado, valor_uv, valor_valuador, moneda, notas,
      uso_suelo, uso_suelo_auto,
      fecha_solicitud, fecha_visita_agendada, fecha_visita_realizada,
      firmado_uv, firmado_valuador, fecha_firma_uv, fecha_firma_valuador,
      pdf_oficial_path,
      verificacion_servicios,
      valuador_id, solicitante_id,
      valuador:valuador_id (nombre, apellidos)
    `)
    .eq('id', id)
    .single();

  if (error || !avaluoRaw) notFound();

  // Verificar que el usuario actual sea el valuador o solicitante
  if (avaluoRaw.valuador_id !== user.id && avaluoRaw.solicitante_id !== user.id) {
    redirect('/dashboard/valuador/expedientes');
  }

  // Aplanar el join (Supabase devuelve relaciones como array)
  const valuadorRaw = (avaluoRaw as { valuador: unknown }).valuador;
  const valuador = Array.isArray(valuadorRaw) ? valuadorRaw[0] ?? null : (valuadorRaw as { nombre: string; apellidos: string | null } | null);

  // Contar fotos por categoría (para el resumen del estado visita_realizada)
  const { data: docsCategoria } = await supabase
    .from('documentos')
    .select('categoria')
    .eq('avaluo_id', id);

  const contadores = { fachada: 0, entorno: 0, interior: 0 };
  (docsCategoria ?? []).forEach((d: { categoria: string | null }) => {
    if (d.categoria === 'fachada') contadores.fachada++;
    else if (d.categoria === 'entorno') contadores.entorno++;
    else if (d.categoria === 'interior') contadores.interior++;
  });

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans text-slate-900">
      <ValuadorSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ValuadorTopbar paginaActiva="Expedientes" />
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-4">
            <Link
              href="/dashboard/valuador/expedientes"
              className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition"
            >
              ← Volver a expedientes
            </Link>
          </div>
          <AvaluoDetailClient
            avaluo={{
              id: avaluoRaw.id,
              folio: avaluoRaw.folio,
              estado: avaluoRaw.estado,
              calle: avaluoRaw.calle,
              colonia: avaluoRaw.colonia,
              municipio: avaluoRaw.municipio,
              estado_inmueble: avaluoRaw.estado_inmueble,
              valor_estimado: avaluoRaw.valor_estimado,
              valor_uv: avaluoRaw.valor_uv,
              valor_valuador: avaluoRaw.valor_valuador,
              moneda: avaluoRaw.moneda ?? 'MXN',
              notas: avaluoRaw.notas,
              uso_suelo: avaluoRaw.uso_suelo,
              uso_suelo_auto: avaluoRaw.uso_suelo_auto ?? false,
              fecha_solicitud: avaluoRaw.fecha_solicitud,
              fecha_visita_agendada: avaluoRaw.fecha_visita_agendada,
              fecha_visita_realizada: avaluoRaw.fecha_visita_realizada,
              firmado_uv: avaluoRaw.firmado_uv ?? false,
              firmado_valuador: avaluoRaw.firmado_valuador ?? false,
              fecha_firma_uv: avaluoRaw.fecha_firma_uv,
              fecha_firma_valuador: avaluoRaw.fecha_firma_valuador,
              pdf_oficial_path: avaluoRaw.pdf_oficial_path,
              valuador,
              verificacion_servicios: (avaluoRaw as { verificacion_servicios: unknown }).verificacion_servicios as import('./AvaluoDetailClient').VerificacionServicios | null,
            }}
            contadoresFotos={contadores}
          />
        </div>
      </main>
    </div>
  );
}
