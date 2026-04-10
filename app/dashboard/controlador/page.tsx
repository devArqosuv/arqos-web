'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/util/supabase/client';
import ControladorSidebar from './ControladorSidebar';
import ControladorTopbar from './ControladorTopbar';
import TablaResumenBanco, { type AvaluoParaTabla } from '@/app/components/TablaResumenBanco';

type AccionTipo = 'aprobar' | 'rechazar' | 'correcciones' | null;

interface Avaluo {
  id: string;
  folio: string | null;
  estado: string;
  calle: string;
  colonia: string | null;
  municipio: string;
  estado_inmueble: string;
  valor_estimado: number | null;
  fecha_solicitud: string;
  notas: string | null;
}

export default function ControladorDashboard() {
  const [avaluos, setAvaluos] = useState<Avaluo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [avaluoSeleccionado, setAvaluoSeleccionado] = useState<Avaluo | null>(null);
  const [accion, setAccion] = useState<AccionTipo>(null);
  const [nota, setNota] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  // Tabla resumen por banco (solo avalúos asignados al controlador)
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear());
  const [avaluosResumen, setAvaluosResumen] = useState<AvaluoParaTabla[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function cargarResumen() {
      setCargandoResumen(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelado) return;
      const inicio = new Date(anioResumen, 0, 1).toISOString();
      const fin = new Date(anioResumen + 1, 0, 1).toISOString();
      const { data } = await supabase
        .from('avaluos')
        .select('id, estado, banco_id, banco:banco_id (nombre)')
        .eq('controlador_id', user.id)
        .gte('fecha_solicitud', inicio)
        .lt('fecha_solicitud', fin);
      if (cancelado) return;
      const aplanados = ((data ?? []) as Array<Omit<AvaluoParaTabla, 'banco'> & { banco: { nombre: string }[] | { nombre: string } | null }>).map((a) => ({
        ...a,
        banco: Array.isArray(a.banco) ? a.banco[0] ?? null : a.banco,
      }));
      setAvaluosResumen(aplanados);
      setCargandoResumen(false);
    }
    cargarResumen();
    return () => { cancelado = true; };
  }, [anioResumen]);

  const cargarPendientes = async () => {
    setCargando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCargando(false); return; }

    const { data } = await supabase
      .from('avaluos')
      .select('id, folio, estado, calle, colonia, municipio, estado_inmueble, valor_estimado, fecha_solicitud, notas')
      .eq('controlador_id', user.id)
      .eq('estado', 'revision')
      .order('fecha_solicitud', { ascending: true });

    setAvaluos((data || []) as Avaluo[]);
    setCargando(false);
  };

  useEffect(() => { cargarPendientes(); }, []);

  const handleAccion = async () => {
    if (!avaluoSeleccionado || !accion) return;
    if ((accion === 'rechazar' || accion === 'correcciones') && !nota.trim()) {
      setMensaje({ texto: 'Escribe el motivo antes de continuar.', tipo: 'error' });
      return;
    }
    setProcesando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : accion === 'rechazar' ? 'rechazado' : 'captura';
    const comentario = accion === 'aprobar'
      ? `Aprobado.${nota ? ' ' + nota : ''}`
      : accion === 'rechazar'
      ? `Rechazado: ${nota}`
      : `Correcciones solicitadas: ${nota}`;

    const { data, error } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoSeleccionado.id,
      p_nuevo_estado: nuevoEstado,
      p_usuario_id: user.id,
      p_comentario: comentario,
    });

    setProcesando(false);

    if (error || !data?.exito) {
      setMensaje({ texto: data?.mensaje || 'Error al procesar.', tipo: 'error' });
      return;
    }

    setMensaje({
      texto: accion === 'aprobar'
        ? `✓ ${avaluoSeleccionado.folio} aprobado.`
        : accion === 'rechazar'
        ? `${avaluoSeleccionado.folio} rechazado.`
        : `Correcciones enviadas al valuador.`,
      tipo: 'exito',
    });

    cerrarModal();
    cargarPendientes();
  };

  const cerrarModal = () => {
    setAvaluoSeleccionado(null);
    setAccion(null);
    setNota('');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <ControladorSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ControladorTopbar />

        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-6xl mx-auto space-y-6">

            <div>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Panel de Control Ejecutivo</p>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Supervisión de Flujos</h2>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Pendientes Revisión</p>
                {cargando ? <div className="h-8 w-10 bg-slate-100 rounded animate-pulse" /> : (
                  <p className="text-4xl font-extrabold text-violet-600">{avaluos.length}</p>
                )}
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Requieren tu revisión</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Más Antiguo</p>
                {cargando ? <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" /> : (
                  <p className="text-lg font-extrabold text-slate-900">
                    {avaluos.length > 0
                      ? new Date(avaluos[0].fecha_solicitud).toLocaleDateString('es-MX')
                      : '—'}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Fecha del más antiguo</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Valor Total Pendiente</p>
                {cargando ? <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" /> : (
                  <p className="text-lg font-extrabold text-slate-900">
                    {avaluos.length > 0
                      ? `$${(avaluos.reduce((s, a) => s + (a.valor_estimado || 0), 0) / 1_000_000).toFixed(1)}M`
                      : '—'}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-semibold mt-1">MXN en revisión</p>
              </div>
            </div>

            {/* Mensaje feedback */}
            {mensaje && (
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                mensaje.tipo === 'exito' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm font-bold">{mensaje.texto}</p>
                <button onClick={() => setMensaje(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Resumen por banco */}
            <TablaResumenBanco
              avaluos={avaluosResumen}
              cargando={cargandoResumen}
              anio={anioResumen}
              setAnio={setAnioResumen}
              titulo="Mis Avalúos por Cliente / Banco"
              linkBase="/dashboard/controlador/expedientes"
            />

            {/* Tabla pendientes */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900">Procesos de Valuación Activos</h3>
                <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                  {avaluos.length} pendiente(s)
                </span>
              </div>

              {cargando ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}
                </div>
              ) : avaluos.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-700 font-bold text-sm">Todo al día</p>
                  <p className="text-slate-400 text-xs font-semibold mt-1">No tienes expedientes pendientes de revisión</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Folio</th>
                      <th className="px-6 py-3">Inmueble</th>
                      <th className="px-6 py-3">Municipio</th>
                      <th className="px-6 py-3">Valor Est.</th>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {avaluos.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4"><span className="text-xs font-black text-slate-900">{a.folio || '—'}</span></td>
                        <td className="px-6 py-4 max-w-[180px]">
                          <p className="text-xs font-semibold text-slate-700 truncate">{a.calle}</p>
                          {a.colonia && <p className="text-[10px] text-slate-400 truncate">{a.colonia}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-slate-600">{a.municipio}</p>
                          <p className="text-[10px] text-slate-400">{a.estado_inmueble}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-700">
                            {a.valor_estimado ? `$${Number(a.valor_estimado).toLocaleString('es-MX')}` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(a.fecha_solicitud).toLocaleDateString('es-MX')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setAvaluoSeleccionado(a)}
                            className="bg-[#0F172A] hover:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Revisar →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE REVISIÓN */}
      {avaluoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revisión de Expediente</p>
                <h3 className="font-extrabold text-slate-900 text-lg">{avaluoSeleccionado.folio}</h3>
              </div>
              <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inmueble</p>
                  <p className="text-xs font-bold text-slate-800">{avaluoSeleccionado.calle}</p>
                  <p className="text-[10px] text-slate-500">{avaluoSeleccionado.municipio}, {avaluoSeleccionado.estado_inmueble}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Estimado</p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {avaluoSeleccionado.valor_estimado
                      ? `$${Number(avaluoSeleccionado.valor_estimado).toLocaleString('es-MX')} MXN`
                      : 'Sin valor'}
                  </p>
                </div>
              </div>
              {avaluoSeleccionado.notas && (
                <div className="mt-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas del Valuador</p>
                  <p className="text-[10px] text-slate-600 font-semibold leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2">
                    {avaluoSeleccionado.notas}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecciona una acción</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'aprobar', label: 'Aprobar', color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { key: 'correcciones', label: 'Correcciones', color: 'amber', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                  { key: 'rechazar', label: 'Rechazar', color: 'red', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((op) => (
                  <button
                    key={op.key}
                    onClick={() => setAccion(op.key as AccionTipo)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                      accion === op.key
                        ? `border-${op.color}-400 bg-${op.color}-50`
                        : `border-slate-200 hover:border-${op.color}-200`
                    }`}
                  >
                    <svg className={`w-6 h-6 ${accion === op.key ? `text-${op.color}-600` : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={op.icon} />
                    </svg>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${accion === op.key ? `text-${op.color}-700` : 'text-slate-500'}`}>
                      {op.label}
                    </span>
                  </button>
                ))}
              </div>

              {accion && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {accion === 'aprobar' ? 'Nota opcional' : 'Motivo (requerido)'}
                  </label>
                  <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder={
                      accion === 'aprobar' ? 'Observaciones adicionales...' :
                      accion === 'correcciones' ? 'Describe qué debe corregir el valuador...' :
                      'Explica el motivo del rechazo...'
                    }
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                  />
                </div>
              )}

              {mensaje?.tipo === 'error' && (
                <p className="text-xs text-red-600 font-bold">⚠ {mensaje.texto}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={cerrarModal} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition">
                Cancelar
              </button>
              <button
                onClick={handleAccion}
                disabled={!accion || procesando}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  accion === 'aprobar' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  accion === 'correcciones' ? 'bg-amber-500 hover:bg-amber-600' :
                  accion === 'rechazar' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300'
                }`}
              >
                {procesando ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </>
                ) : accion === 'aprobar' ? 'Confirmar Aprobación' :
                   accion === 'correcciones' ? 'Enviar Correcciones' :
                   accion === 'rechazar' ? 'Confirmar Rechazo' : 'Selecciona una acción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}