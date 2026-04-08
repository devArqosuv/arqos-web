'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import EvaluadorTopbar from '../EvaluadorTopbar';

export default function ReportesPage() {
  const [avaluos, setAvaluos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('avaluos')
        .select('id, folio, estado, calle, municipio, estado_inmueble, valor_estimado, fecha_solicitud, fecha_aprobacion, tipo_inmueble')
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`)
        .eq('estado', 'aprobado')
        .order('fecha_aprobacion', { ascending: false });

      setAvaluos(data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  const handleGenerarReporte = async (avaluoId: string, folio: string) => {
    setGenerando(avaluoId);
    // TODO: implementar generación de PDF con librería como @react-pdf/renderer
    // Por ahora simulamos el delay
    await new Promise(r => setTimeout(r, 1500));
    alert(`Reporte para ${folio} — próximamente disponible. Se implementará con @react-pdf/renderer.`);
    setGenerando(null);
  };

  return (


      <main className="flex-1 flex flex-col overflow-hidden">
        <EvaluadorTopbar paginaActiva="Reportes" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-5">

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Documentación</p>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reportes</h1>
              </div>
            </div>

            {/* Banner informativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-blue-800">Solo se pueden generar reportes de avalúos aprobados</p>
                <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  Los avalúos en captura o revisión no están disponibles para reporte hasta ser aprobados por el controlador.
                </p>
              </div>
            </div>

            {/* Lista de aprobados */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-sm">Avalúos Aprobados</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{avaluos.length} disponible(s) para reporte</p>
              </div>

              {cargando ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
                </div>
              ) : avaluos.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 text-sm font-semibold">No tienes avalúos aprobados aún</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Los reportes estarán disponibles cuando el controlador apruebe tus expedientes.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {avaluos.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-4">
                        {/* Ícono PDF */}
                        <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{a.folio}</p>
                          <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[280px]">
                            {a.calle}, {a.municipio}, {a.estado_inmueble}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {a.valor_estimado && (
                              <span className="text-[9px] font-bold text-slate-400">
                                ${Number(a.valor_estimado).toLocaleString('es-MX')} MXN
                              </span>
                            )}
                            {a.fecha_aprobacion && (
                              <span className="text-[9px] font-semibold text-emerald-600">
                                ✓ Aprobado {new Date(a.fecha_aprobacion).toLocaleDateString('es-MX')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleGenerarReporte(a.id, a.folio)}
                        disabled={generando === a.id}
                        className="flex items-center gap-2 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-bold px-4 py-2 rounded-xl transition"
                      >
                        {generando === a.id ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            GENERANDO...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            DESCARGAR PDF
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
  );
}