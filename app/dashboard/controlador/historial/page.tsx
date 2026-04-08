'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/util/supabase/client';
import ControladorSidebar from '../ControladorSidebar';
import ControladorTopbar from '../ControladorTopbar';

export default function ControladorHistorial() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('avaluo_historial')
        .select(`
          id, estado_anterior, estado_nuevo, comentario, created_at,
          avaluos!inner(folio, calle, municipio, valor_estimado, controlador_id)
        `)
        .eq('avaluos.controlador_id', user.id)
        .in('estado_nuevo', ['aprobado', 'rechazado', 'captura'])
        .order('created_at', { ascending: false })
        .limit(50);

      setHistorial(data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  const ACCION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    aprobado:  { label: 'Aprobado',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '✓' },
    rechazado: { label: 'Rechazado',   color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: '✗' },
    captura:   { label: 'Correcciones',color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: '✏' },
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <ControladorSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ControladorTopbar />
        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-4xl mx-auto space-y-5">

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mis Decisiones</p>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Historial de Aprobaciones</h1>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-sm">Últimas 50 acciones</h2>
              </div>

              {cargando ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}</div>
              ) : historial.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 text-sm font-semibold">No hay acciones registradas aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {historial.map((h) => {
                    const cfg = ACCION_CONFIG[h.estado_nuevo] || ACCION_CONFIG.aprobado;
                    const avaluo = h.avaluos as any;
                    return (
                      <div key={h.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 border ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{avaluo?.folio || '—'}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                            {avaluo?.calle}, {avaluo?.municipio}
                          </p>
                          {h.comentario && (
                            <p className="text-[10px] text-slate-600 font-semibold mt-1 italic">"{h.comentario}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {new Date(h.created_at).toLocaleDateString('es-MX')}
                          </p>
                          <p className="text-[9px] text-slate-300 font-semibold">
                            {new Date(h.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}