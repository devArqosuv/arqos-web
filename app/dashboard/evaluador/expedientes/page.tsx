'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/util/supabase/client';
import EvaluadorTopbar from '../EvaluadorTopbar';

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  solicitud:  { label: 'Solicitud',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  captura:    { label: 'Captura',    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  revision:   { label: 'Revisión',   color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  aprobado:   { label: 'Aprobado',   color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  rechazado:  { label: 'Rechazado',  color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
};

const ESTADOS = ['todos', 'captura', 'revision', 'aprobado', 'rechazado'];

function ExpedientesPageInner() {
  const searchParams = useSearchParams();
  const estadoFiltro = searchParams.get('estado') || 'todos';

  const [avaluos, setAvaluos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState(estadoFiltro);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('avaluos')
        .select('id, folio, estado, tipo_inmueble, calle, colonia, municipio, estado_inmueble, valor_estimado, fecha_solicitud, notas')
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`)
        .order('fecha_solicitud', { ascending: false });

      if (filtroActivo !== 'todos') {
        query = query.eq('estado', filtroActivo);
      }

      const { data } = await query;
      setAvaluos(data || []);
      setCargando(false);
    }
    cargar();
  }, [filtroActivo]);

  const avaluosFiltrados = avaluos.filter((a) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      a.folio?.toLowerCase().includes(q) ||
      a.calle?.toLowerCase().includes(q) ||
      a.municipio?.toLowerCase().includes(q)
    );
  });

  return (


      <main className="flex-1 flex flex-col overflow-hidden">
        <EvaluadorTopbar paginaActiva="Expedientes" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mis Avalúos</p>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expedientes</h1>
              </div>
              <Link
                href="/dashboard/evaluador"
                className="bg-[#0F172A] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition"
              >
                <span className="text-base leading-none">+</span> Nueva Valuación
              </Link>
            </div>

            {/* Filtros + búsqueda */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tabs de estado */}
              <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 gap-0.5">
                {ESTADOS.map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFiltroActivo(estado)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${
                      filtroActivo === estado
                        ? 'bg-[#0F172A] text-white'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {estado === 'todos' ? 'Todos' : ESTADO_CONFIG[estado].label}
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
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

            {/* Tabla */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {cargando ? (
                <div className="p-8 space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : avaluosFiltrados.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 text-sm font-semibold">
                    {busqueda ? 'No se encontraron resultados' : 'No hay expedientes en este estado'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Folio', 'Inmueble', 'Municipio', 'Tipo', 'Valor Est.', 'Estado', 'Fecha', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {avaluosFiltrados.map((a) => {
                      const est = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.solicitud;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition group">
                          <td className="px-5 py-4">
                            <span className="text-xs font-black text-slate-900">{a.folio || '—'}</span>
                          </td>
                          <td className="px-5 py-4 max-w-[180px]">
                            <p className="text-xs font-semibold text-slate-700 truncate">{a.calle}</p>
                            {a.colonia && <p className="text-[10px] text-slate-400 truncate">{a.colonia}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-600 font-semibold">{a.municipio}</p>
                            <p className="text-[10px] text-slate-400">{a.estado_inmueble}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg capitalize">
                              {a.tipo_inmueble?.replace('_', ' ') || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-slate-700">
                              {a.valor_estimado
                                ? `$${Number(a.valor_estimado).toLocaleString('es-MX')}`
                                : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${est.bg} ${est.color}`}>
                              {est.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(a.fecha_solicitud).toLocaleDateString('es-MX')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition">
                              Ver →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Footer con conteo */}
              {!cargando && avaluosFiltrados.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400">
                    {avaluosFiltrados.length} expediente(s) encontrado(s)
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
  );
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex flex-col overflow-hidden" />}>
      <ExpedientesPageInner />
    </Suspense>
  );
}