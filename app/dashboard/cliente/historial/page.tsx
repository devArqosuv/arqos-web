import Link from 'next/link';
import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import ClienteTopbar from '../ClienteTopbar';

// Historial de preavalúos que el cliente hizo en ARQOS Data.
// Útil para que revisen estimaciones anteriores y decidan si quieren
// formalizar alguna que aún no solicitaron.

function fmtDinero(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${Number(n).toLocaleString('es-MX')}`;
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function ClienteHistorial() {
  const { user } = await requireRole(['cliente']);
  const supabase = await createClient();

  const { data: estimaciones } = await supabase
    .from('estimaciones_portal')
    .select('id, direccion, tipo_inmueble, superficie, valor_bajo, valor_centro, valor_alto, ciudad_detectada, zona_detectada, solicito_avaluo, avaluo_id, created_at')
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false });

  const lista = estimaciones ?? [];

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <ClienteTopbar paginaActiva="Historial" />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Portal cliente</p>
          <h1 className="text-xl font-black text-slate-900 mt-1">Historial de estimaciones</h1>
        </div>

        <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {lista.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-slate-400 text-sm font-semibold">
                No hay estimaciones registradas con tu cuenta.
              </p>
              <Link
                href="/arqos-data"
                className="mt-4 inline-block bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Hacer una nueva estimación
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sky-100 border-y border-sky-200">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Dirección</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black text-sky-900 uppercase tracking-wider">Rango estimado</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black text-sky-900 uppercase tracking-wider">Avalúo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500">{fmtFecha(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-semibold">{e.direccion}</div>
                      <div className="text-[10px] text-slate-400">
                        {[e.zona_detectada, e.ciudad_detectada].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{e.tipo_inmueble}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-bold">
                      {fmtDinero(e.valor_bajo)} <span className="text-slate-400">—</span> {fmtDinero(e.valor_alto)}
                      <div className="text-[10px] text-slate-400 font-semibold">centro {fmtDinero(e.valor_centro)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.avaluo_id ? (
                        <Link
                          href={`/dashboard/cliente/expedientes/${e.avaluo_id}`}
                          className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-1 rounded uppercase hover:underline"
                        >
                          Ver expediente
                        </Link>
                      ) : e.solicito_avaluo ? (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-1 rounded uppercase">
                          Solicitado
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Solo estimación</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="h-8" />
      </div>
    </main>
  );
}
