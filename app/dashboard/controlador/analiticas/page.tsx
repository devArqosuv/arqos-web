'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/util/supabase/client';
import ControladorSidebar from '../ControladorSidebar';
import ControladorTopbar from '../ControladorTopbar';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ControladorAnaliticas() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: avaluos } = await supabase
        .from('avaluos')
        .select('id, estado, valor_estimado, fecha_solicitud, fecha_aprobacion')
        .eq('controlador_id', user.id);

      if (!avaluos) return;

      const aprobados  = avaluos.filter(a => a.estado === 'aprobado');
      const rechazados = avaluos.filter(a => a.estado === 'rechazado');
      const total = avaluos.length;

      const porMesMap: Record<string, { aprobados: number; rechazados: number }> = {};
      avaluos.forEach(a => {
        const fecha = new Date(a.fecha_solicitud);
        const key = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
        if (!porMesMap[key]) porMesMap[key] = { aprobados: 0, rechazados: 0 };
        if (a.estado === 'aprobado') porMesMap[key].aprobados++;
        if (a.estado === 'rechazado') porMesMap[key].rechazados++;
      });

      const porMes = Object.entries(porMesMap).slice(-6).map(([mes, v]) => ({ mes, ...v }));
      const valorTotalAprobado = aprobados.reduce((s, a) => s + (Number(a.valor_estimado) || 0), 0);

      setDatos({
        total, aprobados: aprobados.length, rechazados: rechazados.length,
        tasaAprobacion: total > 0 ? Math.round((aprobados.length / total) * 100) : 0,
        valorTotalAprobado, porMes,
      });
      setCargando(false);
    }
    cargar();
  }, []);

  const maxMes = datos ? Math.max(...datos.porMes.map((m: any) => m.aprobados + m.rechazados), 1) : 1;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <ControladorSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ControladorTopbar />
        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-5xl mx-auto space-y-6">

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mi Desempeño</p>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Analíticas</h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Revisados',    value: datos?.total,           color: 'text-slate-900' },
                { label: 'Aprobados',          value: datos?.aprobados,       color: 'text-emerald-600' },
                { label: 'Rechazados',         value: datos?.rechazados,      color: 'text-red-500' },
                { label: 'Tasa Aprobación',    value: datos ? `${datos.tasaAprobacion}%` : '—', color: datos?.tasaAprobacion >= 70 ? 'text-emerald-600' : 'text-amber-600' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                  {cargando ? <div className="h-8 w-12 bg-slate-100 rounded animate-pulse" /> : (
                    <p className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value ?? 0}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_260px] gap-5">
              {/* Gráfica por mes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-900 text-sm mb-5">Actividad por Mes</h2>
                {cargando ? (
                  <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
                ) : datos?.porMes.length === 0 ? (
                  <div className="h-40 flex items-center justify-center">
                    <p className="text-slate-400 text-xs font-semibold">Sin datos aún</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-3 h-40">
                    {datos!.porMes.map((m: any) => (
                      <div key={m.mes} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-700">{m.aprobados + m.rechazados}</span>
                        <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.max(((m.aprobados + m.rechazados) / maxMes) * 120, 8)}px` }}>
                          <div className="w-full bg-emerald-400 rounded-t-sm flex-1" style={{ flex: m.aprobados }} />
                          {m.rechazados > 0 && <div className="w-full bg-red-400 flex-1" style={{ flex: m.rechazados }} />}
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold truncate w-full text-center">{m.mes}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-[10px] text-slate-500 font-semibold">Aprobados</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-[10px] text-slate-500 font-semibold">Rechazados</span></div>
                </div>
              </div>

              {/* Valor aprobado */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valor Total Aprobado</p>
                  {cargando ? <div className="h-10 w-24 bg-slate-100 rounded animate-pulse" /> : (
                    <>
                      <p className="text-3xl font-extrabold text-slate-900">
                        ${datos ? (datos.valorTotalAprobado / 1_000_000).toFixed(1) : 0}M
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">MXN en avalúos aprobados</p>
                    </>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pendientes ahora</p>
                  {cargando ? <div className="h-6 w-8 bg-slate-100 rounded animate-pulse" /> : (
                    <p className="text-2xl font-extrabold text-violet-600">
                      {datos ? datos.total - datos.aprobados - datos.rechazados : 0}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}