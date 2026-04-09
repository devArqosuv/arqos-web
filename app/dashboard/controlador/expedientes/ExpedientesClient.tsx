'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/util/supabase/client';
import ControladorSidebar from '../ControladorSidebar';
import ControladorTopbar from '../ControladorTopbar';

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  captura:          { label: 'En Captura',       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  agenda_visita:    { label: 'Agenda Visita',    color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  visita_realizada: { label: 'Visita Realizada', color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200' },
  preavaluo:        { label: 'Preavalúo',        color: 'text-cyan-600',    bg: 'bg-cyan-50 border-cyan-200' },
  revision:         { label: 'En Revisión',      color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
  firma:            { label: 'Firma',            color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200' },
  aprobado:         { label: 'Aprobado',         color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  rechazado:        { label: 'Rechazado',        color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
};

export default function ControladorExpedientes() {
  const [avaluos, setAvaluos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // El controlador ve:
      //  - Todos los avalúos en estados que requieren su atención (sin asignar todavía)
      //  - + los avalúos que ya tiene asignados explícitamente
      let query = supabase
        .from('avaluos')
        .select('id, folio, estado, calle, colonia, municipio, estado_inmueble, valor_estimado, valor_uv, valor_valuador, fecha_solicitud, tipo_inmueble, controlador_id')
        .or(`controlador_id.eq.${user.id},estado.in.(visita_realizada,preavaluo,revision,firma,aprobado,rechazado)`)
        .order('fecha_solicitud', { ascending: false });

      if (filtro !== 'todos') query = query.eq('estado', filtro);

      const { data } = await query;
      setAvaluos(data || []);
      setCargando(false);
    }
    cargar();
  }, [filtro]);

  const filtrados = avaluos.filter((a) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return a.folio?.toLowerCase().includes(q) || a.calle?.toLowerCase().includes(q) || a.municipio?.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <ControladorSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ControladorTopbar />
        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-6xl mx-auto space-y-5">

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mis Asignaciones</p>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expedientes</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 gap-0.5">
                {['todos', 'visita_realizada', 'preavaluo', 'revision', 'firma', 'aprobado', 'rechazado'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${
                      filtro === f ? 'bg-[#0F172A] text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.label || f}
                  </button>
                ))}
              </div>
              <div className="flex-1 relative min-w-[200px]">
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por folio, calle o municipio..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {cargando ? (
                <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}</div>
              ) : filtrados.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 text-sm font-semibold">No hay expedientes en este estado</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Folio', 'Inmueble', 'Municipio', 'Valor', 'Estado', 'Fecha', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtrados.map((a) => {
                      const est = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.revision;
                      const valorMostrar = a.valor_valuador ?? a.valor_uv ?? a.valor_estimado;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition group">
                          <td className="px-5 py-4"><span className="text-xs font-black text-slate-900">{a.folio || '—'}</span></td>
                          <td className="px-5 py-4 max-w-[180px]">
                            <p className="text-xs font-semibold text-slate-700 truncate">{a.calle}</p>
                            {a.colonia && <p className="text-[10px] text-slate-400 truncate">{a.colonia}</p>}
                          </td>
                          <td className="px-5 py-4"><p className="text-xs font-semibold text-slate-600">{a.municipio}</p></td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-slate-700">
                              {valorMostrar ? `$${Number(valorMostrar).toLocaleString('es-MX')}` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${est.bg} ${est.color}`}>{est.label}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(a.fecha_solicitud).toLocaleDateString('es-MX')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/dashboard/controlador/expedientes/${a.id}`}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition"
                            >
                              Ver →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!cargando && filtrados.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400">{filtrados.length} expediente(s)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}