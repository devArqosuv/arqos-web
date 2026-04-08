'use client';

import { useState, useRef, useEffect } from 'react';
import { guardarAvaluo } from '@/util/supabase/actions';
import EvaluadorTopbar from '../EvaluadorTopbar';

// ── Tipos ──
type TipoAvaluo = '1.0' | '2.0' | '';

interface DocumentoRequerido {
  id: string;
  nombre: string;
}

interface ResultadoDocumento {
  id: string;
  nombre: string;
  valido: boolean;
  datos_extraidos: Record<string, string | null>;
  errores: string[];
}

interface ResultadoAnalisis {
  valido: boolean;
  errores_bloqueantes: string[];
  documentos: ResultadoDocumento[];
  datos_consolidados: {
    propietario: string | null;
    ubicacion: string | null;
    clave_catastral: string | null;
    superficie: string | null;
    valor_estimado: string | null;
    observaciones: string | null;
  };
}

const DOCS_POR_TIPO: Record<'1.0' | '2.0', DocumentoRequerido[]> = {
  '1.0': [
    { id: '1.1', nombre: 'Título de Propiedad' },
    { id: '1.2', nombre: 'Boleta Predial / Cédula Catastral' },
    { id: '1.3', nombre: 'Identificación Oficial' },
  ],
  '2.0': [
    { id: '2.1', nombre: 'Escritura Completa' },
    { id: '2.2', nombre: 'Boleta Predial / Cédula Catastral' },
    { id: '2.3', nombre: 'Comprobante de Agua / Factibilidad' },
    { id: '2.4', nombre: 'Identificación Oficial' },
  ],
};

// Ícono PDF
function IconPDF() {
  return (
    <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 15.5c0 .28-.22.5-.5.5H7v1H6v-4h2c.28 0 .5.22.5.5v2zm3.5.5h-1v1h-1v-4h2c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1zm4-2.5h-2v1h1.5v1H14v1h-1v-4h3v1z" />
      <path d="M7 13.5h1v1H7zM11 13.5h1v1h-1z" />
    </svg>
  );
}

export default function EvaluadorDashboard() {
  // ── Estado del formulario ──
  const [valorBase, setValorBase] = useState('');
  const [notasRiesgo, setNotasRiesgo] = useState('');

  // ── Estado del panel de IA ──
  const [tipoAvaluo, setTipoAvaluo] = useState<TipoAvaluo>('');
  const [tipoDropdownAbierto, setTipoDropdownAbierto] = useState(false);
  const [archivosSlots, setArchivosSlots] = useState<Record<string, File | null>>({});
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoResult, setGuardadoResult] = useState<{ exito: boolean; folio?: string; error?: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tipoDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!tipoDropdownAbierto) return;
    const handler = (e: MouseEvent) => {
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(e.target as Node)) {
        setTipoDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tipoDropdownAbierto]);

  const docsRequeridos = tipoAvaluo ? DOCS_POR_TIPO[tipoAvaluo] : [];
  const archivosSubidos = docsRequeridos.filter((d) => archivosSlots[d.id]).length;
  const todosSubidos = docsRequeridos.length > 0 && archivosSubidos === docsRequeridos.length;

  const handleTipoChange = (tipo: TipoAvaluo) => {
    setTipoAvaluo(tipo);
    setArchivosSlots({});
    setResultado(null);
    setGuardadoResult(null);
  };

  const handleFileSlot = (id: string, file: File | null) => {
    setArchivosSlots((prev) => ({ ...prev, [id]: file }));
    setResultado(null);
    setGuardadoResult(null);
  };

  const handleAnalizarAvaluo = async () => {
    if (!todosSubidos || !tipoAvaluo) return;
    setAnalizando(true);
    setResultado(null);

    const formData = new FormData();
    formData.append('tipoAvaluo', tipoAvaluo);
    docsRequeridos.forEach((doc) => {
      const file = archivosSlots[doc.id];
      if (file) {
        formData.append('pdfs', file);
        formData.append('docIds', doc.id);
        formData.append('docNombres', doc.nombre);
      }
    });

    try {
      const res = await fetch('/api/analizar-avaluo', { method: 'POST', body: formData });
      const data: ResultadoAnalisis = await res.json();
      setResultado(data);
      if (data.valido) {
        if (data.datos_consolidados?.valor_estimado) setValorBase(data.datos_consolidados.valor_estimado);
        if (data.datos_consolidados?.observaciones) setNotasRiesgo(data.datos_consolidados.observaciones);
      }
    } catch {
      setResultado({
        valido: false,
        errores_bloqueantes: ['Error de red. Verifica tu conexión e intenta de nuevo.'],
        documentos: [],
        datos_consolidados: { propietario: null, ubicacion: null, clave_catastral: null, superficie: null, valor_estimado: null, observaciones: null },
      });
    } finally {
      setAnalizando(false);
    }
  };

  const handleGuardar = async () => {
    if (!resultado?.valido || !tipoAvaluo) return;
    setGuardando(true);
    setGuardadoResult(null);

    const datos = resultado.datos_consolidados;
    const ubicacionRaw = datos.ubicacion || '';
    const partesDir = ubicacionRaw.split(',').map((p: string) => p.trim());

    const payload = {
      tipo_avaluo: tipoAvaluo as '1.0' | '2.0',
      calle: partesDir[0] || 'Sin especificar',
      colonia: partesDir[1] || undefined,
      municipio: partesDir[2] || 'Sin especificar',
      estado_inmueble: partesDir[3] || 'Sin especificar',
      tipo_inmueble: 'otro' as const,
      valor_estimado: datos.valor_estimado ? Number(datos.valor_estimado.replace(/[^0-9.]/g, '')) : undefined,
      propietario_nombre: datos.propietario || undefined,
      clave_catastral: datos.clave_catastral || undefined,
      superficie_terreno: datos.superficie ? Number(datos.superficie.replace(/[^0-9.]/g, '')) : undefined,
      notas: notasRiesgo || datos.observaciones || undefined,
      moneda: 'MXN',
    };

    const archivos = docsRequeridos
      .filter((doc) => archivosSlots[doc.id])
      .map((doc) => ({ docId: doc.id, docNombre: doc.nombre, file: archivosSlots[doc.id]! }));

    const res = await guardarAvaluo(payload, archivos);
    setGuardadoResult(res);
    setGuardando(false);
  };

  const limpiarTodo = () => {
    setTipoAvaluo('');
    setArchivosSlots({});
    setResultado(null);
    setValorBase('');
    setNotasRiesgo('');
    setGuardadoResult(null);
  };

  // Estado del badge
  const badgeEstado = () => {
    if (guardadoResult?.exito) return { label: 'Guardado', color: 'bg-emerald-500' };
    if (resultado?.valido) return { label: 'En Proceso', color: 'bg-blue-500' };
    if (resultado && !resultado.valido) return { label: 'Bloqueado', color: 'bg-red-500' };
    if (tipoAvaluo) return { label: 'Pendiente', color: 'bg-amber-400' };
    return null;
  };
  const badge = badgeEstado();

  return (
      <main className="flex-1 flex flex-col overflow-hidden">

        <EvaluadorTopbar paginaActiva="Avalúos" />

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* PAGE HEADER */}
          <div className="bg-white border-b border-slate-200 px-8 py-5">
            <div className="flex items-start justify-between max-w-[1400px] mx-auto">
              <div>
                <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase mb-1">
                  EXPEDIENTE #{tipoAvaluo === '1.0' ? 'PE' : tipoAvaluo === '2.0' ? 'CR' : 'XX'}-2024-NEW
                </p>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Valuaciones</h1>
              </div>
              {badge && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold ${badge.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-pulse" />
                  Estado: {badge.label}
                </div>
              )}
            </div>
          </div>

          {/* 3-COLUMN GRID */}
          <div className="p-6 max-w-[1400px] mx-auto">
            <div className="grid grid-cols-[1fr_1.2fr_280px] gap-5 items-start">

              {/* ── COL 1: Steps ── */}
              <div className="space-y-4">

                {/* STEP 1: Tipo de Avalúo */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center text-white text-xs font-black shrink-0">1</div>
                      <h2 className="font-bold text-slate-900 text-sm">Tipo de Avalúo</h2>
                    </div>

                    <div className="relative" ref={tipoDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setTipoDropdownAbierto((v) => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          tipoAvaluo
                            ? 'border-[#0F172A] bg-slate-50'
                            : 'border-slate-100 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${tipoAvaluo ? 'text-slate-700' : 'text-slate-400'}`}>
                          {tipoAvaluo === '1.0'
                            ? 'Primera Enajenación'
                            : tipoAvaluo === '2.0'
                            ? 'Crédito Bancario'
                            : 'Seleccionar tipo'}
                        </span>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${tipoDropdownAbierto ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {tipoDropdownAbierto && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-xl shadow-lg overflow-hidden z-20">
                          <button
                            type="button"
                            onClick={() => { handleTipoChange('1.0'); setTipoDropdownAbierto(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition ${tipoAvaluo === '1.0' ? 'bg-slate-50' : ''}`}
                          >
                            <span className="text-sm font-semibold text-slate-700">Primera Enajenación</span>
                            {tipoAvaluo === '1.0' && (
                              <div className="w-5 h-5 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleTipoChange('2.0'); setTipoDropdownAbierto(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition border-t border-slate-100 ${tipoAvaluo === '2.0' ? 'bg-slate-50' : ''}`}
                          >
                            <span className="text-sm font-semibold text-slate-700">Crédito Bancario</span>
                            {tipoAvaluo === '2.0' && (
                              <div className="w-5 h-5 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* STEP 2: Documentos */}
                {tipoAvaluo && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                          <h2 className="font-bold text-slate-900 text-sm">Documentos del Expediente</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                          {archivosSubidos}/{docsRequeridos.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {docsRequeridos.map((doc) => {
                          const archivoActual = archivosSlots[doc.id];
                          const docRes = resultado?.documentos.find((d) => d.id === doc.id);

                          return (
                            <div
                              key={doc.id}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                                docRes
                                  ? docRes.valido
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-red-200 bg-red-50'
                                  : archivoActual
                                  ? 'border-slate-200 bg-slate-50'
                                  : 'border-slate-100 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <IconPDF />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{doc.nombre}</p>
                                  {archivoActual && (
                                    <p className="text-[10px] text-slate-400 truncate">{archivoActual.name}</p>
                                  )}
                                  {docRes && !docRes.valido && docRes.errores[0] && (
                                    <p className="text-[10px] text-red-500 font-semibold truncate">⚠ {docRes.errores[0]}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {docRes?.valido && (
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                )}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                  onChange={(e) => handleFileSlot(doc.id, e.target.files?.[0] || null)}
                                />
                                <button
                                  onClick={() => fileInputRefs.current[doc.id]?.click()}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                                    archivoActual
                                      ? 'text-slate-600 border border-slate-300 hover:bg-slate-100'
                                      : 'text-blue-600 border border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  {archivoActual ? 'Cambiar' : 'Subir PDF'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                          style={{ width: `${docsRequeridos.length > 0 ? (archivosSubidos / docsRequeridos.length) * 100 : 0}%` }}
                        />
                      </div>

                      {/* Botón validar */}
                      <button
                        onClick={handleAnalizarAvaluo}
                        disabled={!todosSubidos || analizando}
                        className="mt-4 w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
                      >
                        {analizando ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            VALIDANDO CON IA...
                          </>
                        ) : todosSubidos ? (
                          'VALIDAR EXPEDIENTE'
                        ) : (
                          `FALTAN ${docsRequeridos.length - archivosSubidos} DOCUMENTO(S)`
                        )}
                      </button>
                    </div>

                    {/* Errores bloqueantes */}
                    {resultado && !resultado.valido && resultado.errores_bloqueantes.length > 0 && (
                      <div className="border-t border-red-100 bg-red-50 px-5 py-4">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">⚠ Expediente Bloqueado</p>
                        {resultado.errores_bloqueantes.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 font-semibold leading-snug">• {err}</p>
                        ))}
                      </div>
                    )}

                    {/* Éxito de validación */}
                    {resultado?.valido && (
                      <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">✓ Expediente válido — datos autocompletados</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── COL 2: Card del Inmueble ── */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                  {/* Hero inmueble */}
                  <div className="relative h-52 bg-gradient-to-br from-slate-800 to-slate-950 flex items-end p-5">
                    {/* Fondo decorativo */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white blur-3xl" />
                      <div className="absolute bottom-0 left-8 w-24 h-24 rounded-full bg-blue-400 blur-2xl" />
                    </div>

                    {/* Badges superiores */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/10 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                        {tipoAvaluo === '1.0' ? 'Primera Enajenación' : tipoAvaluo === '2.0' ? 'Crédito Bancario' : 'Sin tipo'}
                      </span>
                      {resultado?.datos_consolidados.clave_catastral && (
                        <span className="bg-white/10 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-full">
                          {resultado.datos_consolidados.clave_catastral}
                        </span>
                      )}
                    </div>

                    {/* Info inmueble */}
                    <div className="relative z-10">
                      <h3 className="text-lg font-black text-white leading-tight">
                        {resultado?.datos_consolidados.ubicacion
                          ? resultado.datos_consolidados.ubicacion.split(',')[0]
                          : 'Inmueble sin identificar'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        {resultado?.datos_consolidados.superficie && (
                          <div className="flex items-center gap-1 text-white/70">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            <span className="text-[10px] font-semibold">{resultado.datos_consolidados.superficie}</span>
                          </div>
                        )}
                        {resultado?.datos_consolidados.ubicacion && (
                          <div className="flex items-center gap-1 text-white/70">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-[10px] font-semibold truncate max-w-[140px]">
                              {resultado.datos_consolidados.ubicacion.split(',').slice(1).join(',').trim() || resultado.datos_consolidados.ubicacion}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datos del propietario */}
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Propietario</p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {resultado?.datos_consolidados.propietario || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Clave Catastral</p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {resultado?.datos_consolidados.clave_catastral || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documentos validados */}
                  {resultado?.documentos && resultado.documentos.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Documentos Revisados</p>
                      <div className="space-y-1.5">
                        {resultado.documentos.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${doc.valido ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              <span className="text-xs text-slate-600 font-semibold">{doc.nombre}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${doc.valido ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {doc.valido ? 'OK' : 'Error'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estado vacío */}
                  {!resultado && (
                    <div className="px-5 py-8 text-center">
                      <p className="text-xs text-slate-400 font-semibold">
                        {tipoAvaluo
                          ? 'Sube los documentos y valida el expediente para ver los datos del inmueble'
                          : 'Selecciona el tipo de avalúo para comenzar'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── COL 3: Panel de valuación ── */}
              <div className="space-y-4">

                {/* Valor base */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Base del Activo (MXN)</p>
                  {resultado?.valido && valorBase ? (
                    <>
                      <p className="text-2xl font-black text-slate-900">
                        $ {Number(valorBase.replace(/[^0-9.]/g, '')).toLocaleString('es-MX')}
                      </p>
                      <p className="text-[9px] text-emerald-600 font-bold mt-0.5">✓ Extraído por IA</p>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={valorBase}
                      onChange={(e) => setValorBase(e.target.value)}
                      disabled={resultado !== null && !resultado.valido}
                      placeholder="0.00"
                      className="w-full text-2xl font-black text-slate-900 bg-transparent border-none outline-none placeholder-slate-300 disabled:opacity-40"
                    />
                  )}
                </div>

                {/* Nota de riesgos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nota de Evaluación de Riesgos</p>
                  <textarea
                    value={notasRiesgo}
                    onChange={(e) => setNotasRiesgo(e.target.value)}
                    disabled={resultado !== null && !resultado.valido}
                    placeholder="Ingrese observaciones técnicas sobre el estado del inmueble, entorno urbano y factores de riesgo..."
                    className="w-full text-xs text-slate-600 bg-transparent border-none outline-none placeholder-slate-300 resize-none disabled:opacity-40 leading-relaxed"
                    rows={5}
                  />
                </div>

                {/* Tendencia de mercado */}
                {resultado?.datos_consolidados.observaciones && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Observaciones IA</p>
                    </div>
                    <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                      {resultado.datos_consolidados.observaciones}
                    </p>
                  </div>
                )}

                {/* Feedback guardado */}
                {guardadoResult && (
                  <div className={`rounded-2xl p-4 border text-xs font-semibold ${
                    guardadoResult.exito
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {guardadoResult.exito ? (
                      <>
                        <p className="font-black">✓ Avalúo guardado</p>
                        {guardadoResult.folio && (
                          <p className="mt-0.5 text-[10px]">Folio: <span className="font-black">{guardadoResult.folio}</span></p>
                        )}
                      </>
                    ) : (
                      <p>✗ {guardadoResult.error}</p>
                    )}
                  </div>
                )}

                {/* Botón guardar */}
                <button
                  onClick={handleGuardar}
                  disabled={!resultado?.valido || guardando || guardadoResult?.exito === true}
                  className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs py-4 rounded-2xl transition flex items-center justify-center gap-2 tracking-widest shadow-lg shadow-slate-900/20"
                >
                  {guardando ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      GUARDANDO...
                    </>
                  ) : guardadoResult?.exito ? (
                    '✓ GUARDADO'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      GUARDAR VALUACIÓN
                    </>
                  )}
                </button>

                {/* Última edición */}
                <p className="text-[9px] text-slate-400 text-center font-semibold uppercase tracking-widest">
                  Última edición hoy · Arq. Silva
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>
  );
}