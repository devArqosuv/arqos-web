'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import EvaluadorTopbar from '../EvaluadorTopbar';

const TIPO_ICON: Record<string, string> = {
  casa: '🏠', departamento: '🏢', local_comercial: '🏪',
  oficina: '🏛️', terreno: '🌿', bodega: '📦',
  nave_industrial: '🏭', otro: '📋',
};

export default function InmueblesPage() {
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [vistaGrid, setVistaGrid] = useState(true);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('avaluos')
        .select('id, folio, estado, tipo_inmueble, calle, colonia, municipio, estado_inmueble, cp, superficie_terreno, superficie_construccion, valor_estimado, moneda, fecha_solicitud')
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`)
        .in('estado', ['captura', 'revision', 'aprobado'])
        .order('fecha_solicitud', { ascending: false });

      setInmuebles(data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  const filtrados = inmuebles.filter((i) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      i.calle?.toLowerCase().includes(q) ||
      i.municipio?.toLowerCase().includes(q) ||
      i.colonia?.toLowerCase().includes(q) ||
      i.folio?.toLowerCase().includes(q)
    );
  });

  return (


      <main className="flex-1 flex flex-col overflow-hidden">
        <EvaluadorTopbar paginaActiva="Inmuebles" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mis Inmuebles</p>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inmuebles Valuados</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVistaGrid(true)}
                  className={`p-2 rounded-lg transition ${vistaGrid ? 'bg-[#0F172A] text-white' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  onClick={() => setVistaGrid(false)}
                  className={`p-2 rounded-lg transition ${!vistaGrid ? 'bg-[#0F172A] text-white' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
              </div>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por dirección, colonia, municipio o folio..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Contenido */}
            {cargando ? (
              <div className={vistaGrid ? 'grid grid-cols-3 gap-4' : 'space-y-3'}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
                <p className="text-slate-400 text-sm font-semibold">
                  {busqueda ? 'Sin resultados para esa búsqueda' : 'No tienes inmuebles registrados aún'}
                </p>
              </div>
            ) : vistaGrid ? (
              /* VISTA GRID */
              <div className="grid grid-cols-3 gap-4">
                {filtrados.map((inmueble) => (
                  <div key={inmueble.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
                    {/* Hero */}
                    <div className="h-28 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
                      <span className="text-4xl">{TIPO_ICON[inmueble.tipo_inmueble] || '📋'}</span>
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] font-black text-white/70 bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          {inmueble.folio || 'Sin folio'}
                        </span>
                      </div>
                      {inmueble.estado === 'aprobado' && (
                        <div className="absolute top-3 right-3">
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Aprobado</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-black text-slate-900 truncate">{inmueble.calle}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                        {[inmueble.colonia, inmueble.municipio, inmueble.estado_inmueble].filter(Boolean).join(', ')}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {inmueble.superficie_terreno && (
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Terreno</p>
                            <p className="text-xs font-bold text-slate-700">{inmueble.superficie_terreno} m²</p>
                          </div>
                        )}
                        {inmueble.superficie_construccion && (
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Construcción</p>
                            <p className="text-xs font-bold text-slate-700">{inmueble.superficie_construccion} m²</p>
                          </div>
                        )}
                      </div>

                      {inmueble.valor_estimado && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Estimado</p>
                          <p className="text-sm font-black text-slate-900">
                            ${Number(inmueble.valor_estimado).toLocaleString('es-MX')} <span className="text-[9px] font-semibold text-slate-400">{inmueble.moneda}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* VISTA LISTA */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Tipo', 'Inmueble', 'Municipio', 'Superficie', 'Valor Est.', 'Estado'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtrados.map((inmueble) => (
                      <tr key={inmueble.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-4">
                          <span className="text-xl">{TIPO_ICON[inmueble.tipo_inmueble] || '📋'}</span>
                        </td>
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="text-xs font-bold text-slate-900 truncate">{inmueble.calle}</p>
                          <p className="text-[10px] text-slate-400 truncate">{inmueble.colonia}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-slate-600">{inmueble.municipio}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-slate-600">
                            {inmueble.superficie_terreno ? `${inmueble.superficie_terreno} m²` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-slate-700">
                            {inmueble.valor_estimado ? `$${Number(inmueble.valor_estimado).toLocaleString('es-MX')}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            inmueble.estado === 'aprobado' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            inmueble.estado === 'revision' ? 'bg-violet-50 border-violet-200 text-violet-600' :
                            'bg-amber-50 border-amber-200 text-amber-600'
                          }`}>
                            {inmueble.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center font-semibold">
              {filtrados.length} inmueble(s) · Solo se muestran avalúos en proceso o aprobados
            </p>
          </div>
        </div>
      </main>
  );
}