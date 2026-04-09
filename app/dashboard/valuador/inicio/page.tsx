'use client';

import Link from 'next/link';
import ValuadorTopbar from '../ValuadorTopbar';
import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';

interface Metricas {
  total: number;
  captura: number;
  revision: number;
  aprobados: number;
  rechazados: number;
  recientes: any[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  solicitud:  { label: 'Solicitud',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  captura:    { label: 'Captura',    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  revision:   { label: 'Revisión',   color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  aprobado:   { label: 'Aprobado',   color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  rechazado:  { label: 'Rechazado',  color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
};

export default function ValuadorInicio() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('avaluos')
        .select('id, folio, estado, tipo_inmueble, calle, municipio, valor_estimado, fecha_solicitud')
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`)
        .order('fecha_solicitud', { ascending: false });

      if (!data) return;

      setMetricas({
        total:     data.length,
        captura:   data.filter((a: any) => a.estado === 'captura').length,
        revision:  data.filter((a: any) => a.estado === 'revision').length,
        aprobados: data.filter((a: any) => a.estado === 'aprobado').length,
        rechazados:data.filter((a: any) => a.estado === 'rechazado').length,
        recientes: data.slice(0, 5),
      });
      setCargando(false);
    }
    cargar();
  }, []);

  return (


      <main className="flex-1 flex flex-col overflow-hidden">
        <ValuadorTopbar paginaActiva="Valuaciones" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mi Panel</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Avalúos',  value: metricas?.total,     icon: '📋', color: 'text-slate-900' },
                { label: 'En Captura',     value: metricas?.captura,   icon: '✏️',  color: 'text-amber-600' },
                { label: 'En Revisión',    value: metricas?.revision,  icon: '🔍', color: 'text-violet-600' },
                { label: 'Aprobados',      value: metricas?.aprobados, icon: '✅', color: 'text-emerald-600' },
              ].map((m) => (
                <div key={m.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                    <span className="text-lg">{m.icon}</span>
                  </div>
                  {cargando ? (
                    <div className="h-8 w-12 bg-slate-100 rounded-lg animate-pulse" />
                  ) : (
                    <p className={`text-3xl font-black ${m.color}`}>{m.value ?? 0}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Avalúos recientes */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-sm">Avalúos Recientes</h2>
                <Link href="/dashboard/valuador/expedientes" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition uppercase tracking-widest">
                  Ver todos →
                </Link>
              </div>

              {cargando ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : metricas?.recientes.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-400 text-sm font-semibold">No tienes avalúos registrados aún</p>
                  <Link href="/dashboard/valuador" className="mt-3 inline-block bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-lg">
                    + Crear primer avalúo
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Folio', 'Inmueble', 'Estado', 'Valor Est.', 'Fecha'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {metricas?.recientes.map((a) => {
                      const est = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.solicitud;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-slate-900">{a.folio || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{a.calle}, {a.municipio}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${est.bg} ${est.color}`}>
                              {est.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-700">
                              {a.valor_estimado ? `$${Number(a.valor_estimado).toLocaleString('es-MX')}` : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400 font-semibold">
                              {new Date(a.fecha_solicitud).toLocaleDateString('es-MX')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rechazados si hay */}
            {metricas && metricas.rechazados > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-red-700">⚠ Tienes {metricas.rechazados} avalúo(s) rechazado(s)</p>
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">Revisa los comentarios del controlador y corrígelos.</p>
                </div>
                <Link href="/dashboard/valuador/expedientes?estado=rechazado" className="text-[10px] font-black text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                  Ver rechazados
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
  );
}