import Link from 'next/link';
import { requireRole } from '@/util/supabase/dal';
import { createClient } from '@/util/supabase/server';
import ClienteTopbar from './ClienteTopbar';

// Server component — gate por rol 'cliente'. DAL redirige a /login si
// no hay sesión, y al dashboard del rol correspondiente si el rol es otro.
export default async function ClienteExpedientesPage() {
  const { user } = await requireRole(['cliente']);
  const supabase = await createClient();

  const { data: avaluos } = await supabase
    .from('avaluos')
    .select('id, folio, estado, calle, colonia, municipio, tipo_inmueble, valor_estimado, fecha_solicitud, origen')
    .eq('cliente_id', user.id)
    .order('fecha_solicitud', { ascending: false });

  const lista = avaluos ?? [];
  const tieneExpedientes = lista.length > 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <ClienteTopbar paginaActiva="Mis expedientes" />

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Portal cliente</p>
          <h1 className="text-xl font-black text-slate-900 mt-1">Mis expedientes</h1>
        </div>

        <div className="mx-6 mt-6 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
          <p className="text-xs text-sky-900 leading-relaxed">
            Aquí ves el estado de los avalúos que has solicitado a ARQOS.
            Un valuador certificado se pondrá en contacto contigo para
            coordinar la visita y completar el expediente.
          </p>
        </div>

        <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {!tieneExpedientes ? (
            <div className="py-16 text-center px-6">
              <p className="text-slate-400 text-sm font-semibold">
                Aún no tienes expedientes activos.
              </p>
              <Link
                href="/arqos-data"
                className="mt-4 inline-block bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Solicitar mi primer avalúo
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sky-100 border-y border-sky-200">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Folio</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Dirección</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black text-sky-900 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-black text-slate-900">{a.folio ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">{a.calle}</div>
                      <div className="text-[10px] text-slate-400">
                        {[a.colonia, a.municipio].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{a.tipo_inmueble}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-1 rounded uppercase">
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.fecha_solicitud
                        ? new Date(a.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/cliente/expedientes/${a.id}`}
                        className="text-sky-600 hover:text-sky-800 font-bold underline-offset-2 hover:underline"
                      >
                        Ver detalle
                      </Link>
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
