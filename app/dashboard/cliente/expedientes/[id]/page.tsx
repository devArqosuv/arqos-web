import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import ClienteTopbar from '../../ClienteTopbar';

// Vista simplificada del expediente — el cliente solo ve los datos
// del avalúo y su progreso. No tiene controles para editar ni subir
// documentos. Los valuadores se encargan del resto.

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDinero(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${Number(n).toLocaleString('es-MX')} MXN`;
}

// Orden de los estados para mostrar un progreso lineal simple.
const PROGRESO = [
  'solicitud', 'captura', 'agenda_visita', 'visita_realizada',
  'preavaluo', 'revision', 'firma', 'aprobado',
] as const;

const ETIQUETA_ESTADO: Record<string, string> = {
  solicitud: 'Solicitud recibida',
  captura: 'Captura de documentos',
  agenda_visita: 'Agendando visita',
  visita_realizada: 'Visita realizada',
  preavaluo: 'Generando preavalúo',
  revision: 'En revisión',
  firma: 'En firma',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export default async function ClienteExpedienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['cliente']);
  const supabase = await createClient();

  const { data: avaluo } = await supabase
    .from('avaluos')
    .select(`
      id, folio, estado, origen,
      calle, numero_ext, numero_int, colonia, municipio, estado_inmueble, cp,
      tipo_inmueble, superficie_terreno, superficie_construccion, num_recamaras,
      num_banos, num_estacionamientos,
      valor_estimado, valor_uv, valor_valuador,
      fecha_solicitud, fecha_visita_agendada, fecha_visita_realizada, fecha_aprobacion,
      notas
    `)
    .eq('id', id)
    .eq('cliente_id', user.id)
    .single();

  if (!avaluo) notFound();

  const pasoActual = Math.max(0, PROGRESO.indexOf(avaluo.estado as typeof PROGRESO[number]));
  const direccionCompleta = [
    [avaluo.calle, avaluo.numero_ext, avaluo.numero_int && `int ${avaluo.numero_int}`].filter(Boolean).join(' '),
    avaluo.colonia,
    [avaluo.municipio, avaluo.estado_inmueble, avaluo.cp].filter(Boolean).join(', '),
  ].filter(Boolean).join(' — ');

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <ClienteTopbar paginaActiva="Expediente" />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <Link href="/dashboard/cliente" className="text-[10px] font-bold text-sky-600 uppercase tracking-widest hover:underline">
              ← Mis expedientes
            </Link>
            <h1 className="text-xl font-black text-slate-900 mt-1">Expediente {avaluo.folio ?? '—'}</h1>
          </div>
          <span className="inline-block text-[10px] font-black bg-sky-100 text-sky-800 px-3 py-1.5 rounded uppercase">
            {ETIQUETA_ESTADO[avaluo.estado] ?? avaluo.estado}
          </span>
        </div>

        {/* Progreso */}
        <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Progreso</p>
          <div className="flex items-center gap-2 flex-wrap">
            {PROGRESO.map((p, i) => {
              const activo = i <= pasoActual && avaluo.estado !== 'rechazado';
              return (
                <div key={p} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                      activo ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-[11px] font-semibold ${activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {ETIQUETA_ESTADO[p]}
                  </span>
                  {i < PROGRESO.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Datos */}
        <div className="mx-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inmueble</p>
            <h2 className="text-sm font-black text-slate-900 mt-1">{direccionCompleta || '—'}</h2>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Tipo</dt>
                <dd className="text-slate-800 font-bold capitalize">{avaluo.tipo_inmueble}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Superficie construida</dt>
                <dd className="text-slate-800 font-bold">{avaluo.superficie_construccion ?? '—'} m²</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Terreno</dt>
                <dd className="text-slate-800 font-bold">{avaluo.superficie_terreno ?? '—'} m²</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Recámaras</dt>
                <dd className="text-slate-800 font-bold">{avaluo.num_recamaras ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Baños</dt>
                <dd className="text-slate-800 font-bold">{avaluo.num_banos ?? '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valores</p>
            <h2 className="text-sm font-black text-slate-900 mt-1">Estimación y avalúo</h2>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Estimación inicial</dt>
                <dd className="text-slate-800 font-bold">{fmtDinero(avaluo.valor_estimado)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Valor UV</dt>
                <dd className="text-slate-800 font-bold">{fmtDinero(avaluo.valor_uv)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">Valor del valuador</dt>
                <dd className="text-slate-800 font-bold">{fmtDinero(avaluo.valor_valuador)}</dd>
              </div>
            </dl>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fechas</p>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">Solicitud</dt>
                  <dd className="text-slate-800 font-bold">{fmtFecha(avaluo.fecha_solicitud)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">Visita agendada</dt>
                  <dd className="text-slate-800 font-bold">{fmtFecha(avaluo.fecha_visita_agendada)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">Visita realizada</dt>
                  <dd className="text-slate-800 font-bold">{fmtFecha(avaluo.fecha_visita_realizada)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">Aprobación</dt>
                  <dd className="text-slate-800 font-bold">{fmtFecha(avaluo.fecha_aprobacion)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {avaluo.notas && (
          <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Notas</p>
            <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{avaluo.notas}</p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </main>
  );
}
