'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import ValuadorTopbar from '../ValuadorTopbar';

interface DatosAnalisis {
  porEstado: Record<string, number>;
  porMes: { mes: string; total: number }[];
  valorTotal: number;
  valorPromedio: number;
  tiempoPromedioAprobacion: number;
  totalAprobados: number;
  tasaAprobacion: number;
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function AnaliticasPage() {
  const [datos, setDatos] = useState<DatosAnalisis | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: avaluos } = await supabase
        .from('avaluos')
        .select('id, estado, valor_estimado, fecha_solicitud, fecha_aprobacion')
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`);

      if (!avaluos) return;

      // Por estado
      const porEstado: Record<string, number> = {};
      avaluos.forEach(a => { porEstado[a.estado] = (porEstado[a.estado] || 0) + 1; });

      // Por mes (últimos 6 meses)
      const porMesMap: Record<string, number> = {};
      avaluos.forEach(a => {
        const fecha = new Date(a.fecha_solicitud);
        const key = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
        porMesMap[key] = (porMesMap[key] || 0) + 1;
      });
      const porMes = Object.entries(porMesMap)
        .slice(-6)
        .map(([mes, total]) => ({ mes, total }));

      // Valor total y promedio
      const conValor = avaluos.filter(a => a.valor_estimado);
      const valorTotal = conValor.reduce((s, a) => s + Number(a.valor_estimado), 0);
      const valorPromedio = conValor.length > 0 ? valorTotal / conValor.length : 0;

      // Tasa de aprobación
      const aprobados = avaluos.filter(a => a.estado === 'aprobado');
      const tasaAprobacion = avaluos.length > 0 ? Math.round((aprobados.length / avaluos.length) * 100) : 0;

      setDatos({ porEstado, porMes, valorTotal, valorPromedio, totalAprobados: aprobados.length, tasaAprobacion, tiempoPromedioAprobacion: 0 });
      setCargando(false);
    }
    cargar();
  }, []);

  const maxPorMes = datos ? Math.max(...datos.porMes.map(m => m.total), 1) : 1;

  const ESTADO_COLORES: Record<string, string> = {
    solicitud: 'bg-blue-400', captura: 'bg-amber-400',
    revision: 'bg-violet-400', aprobado: 'bg-emerald-400', rechazado: 'bg-red-400',
  };

  const totalAvaluos = datos ? Object.values(datos.porEstado).reduce((a, b) => a + b, 0) : 0;

  return (


      <main className="flex-1 flex flex-col overflow-hidden">
        <ValuadorTopbar paginaActiva="Analíticas" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mi Desempeño</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analíticas</h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Valor Total Valuado', value: datos ? `$${(datos.valorTotal / 1_000_000).toFixed(1)}M` : '—', sub: 'MXN acumulado', color: 'text-slate-900' },
                { label: 'Valor Promedio', value: datos ? `$${(datos.valorPromedio / 1_000).toFixed(0)}K` : '—', sub: 'por avalúo', color: 'text-slate-900' },
                { label: 'Tasa de Aprobación', value: datos ? `${datos.tasaAprobacion}%` : '—', sub: `${datos?.totalAprobados || 0} aprobados`, color: datos?.tasaAprobacion && datos.tasaAprobacion >= 70 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Total Expedientes', value: cargando ? '—' : totalAvaluos, sub: 'registrados', color: 'text-slate-900' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                  {cargando ? (
                    <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
                  ) : (
                    <>
                      <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{kpi.sub}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_280px] gap-5">

              {/* Gráfica de barras por mes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-900 text-sm mb-5">Avalúos por Mes</h2>
                {cargando ? (
                  <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
                ) : datos?.porMes.length === 0 ? (
                  <div className="h-40 flex items-center justify-center">
                    <p className="text-slate-400 text-xs font-semibold">Sin datos por mes aún</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-3 h-40">
                    {datos!.porMes.map((m) => (
                      <div key={m.mes} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-700">{m.total}</span>
                        <div
                          className="w-full bg-[#0F172A] rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max((m.total / maxPorMes) * 100, 8)}%` }}
                        />
                        <span className="text-[9px] text-slate-400 font-semibold truncate w-full text-center">{m.mes}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distribución por estado */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-900 text-sm mb-5">Por Estado</h2>
                {cargando ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-50 rounded-lg animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(datos?.porEstado || {}).map(([estado, count]) => (
                      <div key={estado}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-600 capitalize">{estado}</span>
                          <span className="text-[10px] font-black text-slate-900">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${ESTADO_COLORES[estado] || 'bg-slate-400'}`}
                            style={{ width: `${totalAvaluos > 0 ? (count / totalAvaluos) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {Object.keys(datos?.porEstado || {}).length === 0 && (
                      <p className="text-xs text-slate-400 font-semibold text-center py-4">Sin datos aún</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
  );
}