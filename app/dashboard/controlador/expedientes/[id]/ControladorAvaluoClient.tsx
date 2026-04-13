'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarComparableAction,
  eliminarComparableAction,
  generarPreavaluoAction,
  pasarAFirmaAction,
  devolverAPrevaluoAction,
  solicitarDocsFaltantesAction,
} from '../actions';
import { firmarUVAction, obtenerUrlPdfOficialAction } from '../../../firma/actions';

interface Avaluo {
  id: string;
  folio: string | null;
  estado: string;
  calle: string;
  colonia: string | null;
  municipio: string;
  estado_inmueble: string;
  valor_estimado: number | null;
  valor_uv: number | null;
  valor_valuador: number | null;
  moneda: string;
  notas: string | null;
  uso_suelo: string | null;
  uso_suelo_auto: boolean;
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  fecha_solicitud: string;
  fecha_visita_agendada: string | null;
  fecha_visita_realizada: string | null;
  firmado_uv: boolean;
  firmado_valuador: boolean;
  fecha_firma_uv: string | null;
  fecha_firma_valuador: string | null;
  pdf_oficial_path: string | null;
  motivo_devolucion: string | null;
  devuelto_at: string | null;
  devoluciones_count: number;
}

interface Comparable {
  id: string;
  calle: string | null;
  colonia: string | null;
  municipio: string;
  estado_inmueble: string;
  tipo_inmueble: string;
  tipo: string;
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  precio: number;
  precio_m2: number | null;
  moneda: string;
  fuente: string | null;
  url_fuente: string | null;
  fecha_publicacion: string | null;
  notas: string | null;
  created_at: string;
}

interface DocumentoConUrl {
  id: string;
  nombre: string;
  categoria: string | null;
  storage_path: string;
  tipo_mime: string | null;
  tamanio_bytes: number | null;
  created_at: string;
  url: string | null;
}

interface Props {
  avaluo: Avaluo;
  comparables: Comparable[];
  contadoresFotos: { fachada: number; entorno: number; interior: number; documento: number };
  documentos: DocumentoConUrl[];
}

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  solicitud:        { label: 'Solicitud',        bg: 'bg-blue-50 border-blue-200',     color: 'text-blue-700' },
  captura:          { label: 'Captura',          bg: 'bg-amber-50 border-amber-200',   color: 'text-amber-700' },
  agenda_visita:    { label: 'Agenda Visita',    bg: 'bg-orange-50 border-orange-200', color: 'text-orange-700' },
  visita_realizada: { label: 'Visita Realizada', bg: 'bg-purple-50 border-purple-200', color: 'text-purple-700' },
  preavaluo:        { label: 'Preavalúo',        bg: 'bg-cyan-50 border-cyan-200',     color: 'text-cyan-700' },
  revision:         { label: 'Revisión',         bg: 'bg-violet-50 border-violet-200', color: 'text-violet-700' },
  firma:            { label: 'Firma',            bg: 'bg-sky-50 border-sky-200',       color: 'text-sky-700' },
  aprobado:         { label: 'Aprobado',         bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700' },
  rechazado:        { label: 'Rechazado',        bg: 'bg-red-50 border-red-200',       color: 'text-red-700' },
};

const TIPOS_INMUEBLE = ['casa', 'departamento', 'local_comercial', 'oficina', 'terreno', 'bodega', 'nave_industrial', 'otro'];

const CATEGORIA_LABELS: Record<string, string> = {
  documento: 'Expediente', fachada: 'Fachada', portada: 'Portada',
  entorno: 'Entorno', interior: 'Interior', uso_suelo: 'Uso de suelo', otro: 'Otro',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmt(val: number | null | undefined, moneda = 'MXN'): string {
  if (val == null) return '—';
  return `${moneda} $${Number(val).toLocaleString('es-MX')}`;
}

export default function ControladorAvaluoClient({ avaluo, comparables, contadoresFotos, documentos }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Comparable | null>(null);
  const [modalDevolverAbierto, setModalDevolverAbierto] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [modalDocsFaltantes, setModalDocsFaltantes] = useState(false);
  const [motivoDocsFaltantes, setMotivoDocsFaltantes] = useState('');

  const mostrarToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const estadoCfg = ESTADO_LABELS[avaluo.estado] || ESTADO_LABELS.solicitud;
  const direccion = `${avaluo.calle}${avaluo.colonia ? ', ' + avaluo.colonia : ''}, ${avaluo.municipio}, ${avaluo.estado_inmueble}`;

  // Permite capturar comparables y generar preavalúo en estado visita_realizada
  const puedeGestionarComparables = avaluo.estado === 'visita_realizada';
  const puedePasarAFirma = avaluo.estado === 'revision';

  // Cálculo de promedio actual de los comparables (solo para mostrar, no se guarda)
  const promedioM2 = (() => {
    const valores = comparables.map((c) => c.precio_m2 ?? 0).filter((v) => v > 0);
    if (valores.length === 0) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  })();

  // Estimación del valor UV antes de generar (preview)
  const superficie = avaluo.superficie_construccion || avaluo.superficie_terreno;
  const valorUVEstimado =
    promedioM2 && superficie ? Math.round(promedioM2 * Number(superficie) * 100) / 100 : null;

  const handleAgregar = (formData: FormData) => {
    formData.append('avaluoId', avaluo.id);
    startTransition(async () => {
      const res = await agregarComparableAction(formData);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setModalAbierto(false);
        router.refresh();
      }
    });
  };

  const handleEliminar = (compId: string) => {
    startTransition(async () => {
      const res = await eliminarComparableAction(avaluo.id, compId);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setConfirmarEliminar(null);
        router.refresh();
      }
    });
  };

  const handleGenerarPreavaluo = () => {
    startTransition(async () => {
      const res = await generarPreavaluoAction(avaluo.id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handlePasarAFirma = () => {
    startTransition(async () => {
      const res = await pasarAFirmaAction(avaluo.id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleSolicitarDocs = () => {
    if (motivoDocsFaltantes.trim().length < 10) {
      mostrarToast('error', 'El motivo debe tener al menos 10 caracteres.');
      return;
    }
    startTransition(async () => {
      const res = await solicitarDocsFaltantesAction(avaluo.id, motivoDocsFaltantes.trim());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setModalDocsFaltantes(false);
        setMotivoDocsFaltantes('');
        router.refresh();
      }
    });
  };

  const handleDevolver = () => {
    if (motivoDevolucion.trim().length < 10) {
      mostrarToast('error', 'El motivo debe tener al menos 10 caracteres.');
      return;
    }
    startTransition(async () => {
      const res = await devolverAPrevaluoAction(avaluo.id, motivoDevolucion.trim());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setModalDevolverAbierto(false);
        setMotivoDevolucion('');
        router.refresh();
      }
    });
  };

  const handleFirmarUV = () => {
    startTransition(async () => {
      const res = await firmarUVAction(avaluo.id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleDescargarPdf = () => {
    startTransition(async () => {
      const res = await obtenerUrlPdfOficialAction(avaluo.id);
      if (res.error || !res.url) {
        mostrarToast('error', res.error || 'No se pudo obtener el PDF.');
        return;
      }
      window.open(res.url, '_blank');
    });
  };

  const diferenciaValor = (() => {
    if (!avaluo.valor_uv || !avaluo.valor_valuador) return null;
    const diff = avaluo.valor_valuador - avaluo.valor_uv;
    const pct = (diff / avaluo.valor_uv) * 100;
    return { diff, pct };
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">
            EXPEDIENTE {avaluo.folio || '—'}
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{direccion}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Solicitado el {new Date(avaluo.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-[10px] font-bold border px-3 py-1.5 rounded-full ${estadoCfg.bg} ${estadoCfg.color}`}>
          {estadoCfg.label}
        </span>
      </div>

      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs font-semibold ${
            toast.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.texto.split('\n').map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}

      {/* Datos del inmueble */}
      <section className="grid grid-cols-4 gap-4">
        <Card label="Sup. construcción" valor={avaluo.superficie_construccion ? `${avaluo.superficie_construccion} m²` : '—'} />
        <Card label="Sup. terreno" valor={avaluo.superficie_terreno ? `${avaluo.superficie_terreno} m²` : '—'} />
        <Card label="Uso de suelo" valor={avaluo.uso_suelo || '—'} subtitulo={avaluo.uso_suelo_auto ? 'AUTO • QRO' : null} />
        <Card label="Fotos visita" valor={`${contadoresFotos.fachada + contadoresFotos.entorno + contadoresFotos.interior}/11`} />
      </section>

      {/* Solicitar docs faltantes — visible en estados donde el controlador revisa documentación */}
      {['visita_realizada', 'preavaluo', 'revision'].includes(avaluo.estado) && (
        <button
          type="button"
          onClick={() => setModalDocsFaltantes(true)}
          className="w-full text-[10px] font-bold text-amber-700 border-2 border-dashed border-amber-300 hover:bg-amber-50 rounded-xl py-2.5 transition flex items-center justify-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Solicitar documentos faltantes al valuador
        </button>
      )}

      {/* Comparativa UV vs Valuador (solo si ya hay valor_uv) */}
      {avaluo.valor_uv && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Comparativa de valores</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1">Valor UV (Controlador)</p>
              <p className="text-2xl font-black">{fmt(avaluo.valor_uv, avaluo.moneda)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Calculado por homologación de comparables</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Valor Valuador</p>
              {avaluo.valor_valuador ? (
                <>
                  <p className="text-2xl font-black">{fmt(avaluo.valor_valuador, avaluo.moneda)}</p>
                  {diferenciaValor && (
                    <p className={`text-[10px] mt-1 font-bold ${diferenciaValor.pct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {diferenciaValor.pct >= 0 ? '↑' : '↓'} {Math.abs(diferenciaValor.pct).toFixed(2)}% vs UV
                      ({diferenciaValor.diff >= 0 ? '+' : ''}{fmt(diferenciaValor.diff, avaluo.moneda)})
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-slate-500">—</p>
                  <p className="text-[10px] text-slate-400 mt-1">Esperando ajuste del valuador</p>
                </>
              )}
            </div>
          </div>

          {/* Decisión del controlador en estado revisión: aceptar o devolver */}
          {puedePasarAFirma && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalDevolverAbierto(true)}
                disabled={pending}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
              >
                ↩ DEVOLVER AL VALUADOR
              </button>
              <button
                type="button"
                onClick={handlePasarAFirma}
                disabled={pending}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
              >
                {pending ? 'PROCESANDO…' : '✓ ACEPTAR Y PASAR A FIRMA'}
              </button>
            </div>
          )}

          {/* Si hubo devoluciones previas, mostrar el contador como contexto */}
          {avaluo.devoluciones_count > 0 && (
            <p className="mt-3 text-[10px] text-amber-300/80 font-semibold">
              ⚠ Este expediente ha sido devuelto {avaluo.devoluciones_count} vez(es) al valuador.
            </p>
          )}
        </section>
      )}

      {/* Bloque de firma — solo en estado firma */}
      {avaluo.estado === 'firma' && (
        <section className="bg-white rounded-2xl border-2 border-sky-300 shadow-md p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">FIRMA ELECTRÓNICA</p>
            <h2 className="text-lg font-black text-slate-900">Firmas pendientes</h2>
            <p className="text-xs text-slate-500 mt-1">
              Para liberar el avalúo y generar el documento oficial, ambas partes deben firmar.
              Tú firmas primero como UV (Controlador), después el valuador firma y se genera el PDF.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Firma UV */}
            <div className={`rounded-xl border-2 p-4 ${avaluo.firmado_uv ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">UV (Controlador)</p>
              {avaluo.firmado_uv ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✓ Firmado</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {avaluo.fecha_firma_uv && new Date(avaluo.fecha_firma_uv).toLocaleString('es-MX')}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-400">Pendiente</p>
              )}
            </div>

            {/* Firma Valuador */}
            <div className={`rounded-xl border-2 p-4 ${avaluo.firmado_valuador ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Valuador</p>
              {avaluo.firmado_valuador ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✓ Firmado</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {avaluo.fecha_firma_valuador && new Date(avaluo.fecha_firma_valuador).toLocaleString('es-MX')}
                  </p>
                </>
              ) : avaluo.firmado_uv ? (
                <p className="text-sm font-bold text-amber-600">Esperando al valuador…</p>
              ) : (
                <p className="text-sm font-bold text-slate-400">Pendiente (firmará después de UV)</p>
              )}
            </div>
          </div>

          {/* Botón de firma del controlador */}
          {!avaluo.firmado_uv && (
            <button
              type="button"
              onClick={handleFirmarUV}
              disabled={pending}
              className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
            >
              {pending ? 'FIRMANDO…' : '✍ FIRMAR COMO UV (CONTROLADOR)'}
            </button>
          )}

          {avaluo.firmado_uv && !avaluo.firmado_valuador && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-amber-700">
                ✓ Tu firma fue registrada. Esperando que el valuador firme.
              </p>
              <p className="text-[10px] text-amber-600 mt-1">
                El PDF oficial se generará automáticamente cuando el valuador firme.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Bloque de descarga del PDF oficial — solo cuando está aprobado y hay PDF */}
      {avaluo.estado === 'aprobado' && avaluo.pdf_oficial_path && (
        <section className="bg-white rounded-2xl border-2 border-emerald-300 shadow-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✓</span>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">EXPEDIENTE COMPLETADO</p>
              <h2 className="text-lg font-black text-slate-900">Avalúo aprobado y firmado</h2>
              <p className="text-xs text-slate-500 mt-1">
                Ambas partes firmaron el documento. El PDF oficial está listo para descargar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDescargarPdf}
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {pending ? 'OBTENIENDO…' : 'DESCARGAR PDF OFICIAL'}
          </button>
        </section>
      )}

      {/* Comparables */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Comparables del mercado</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparables.length} comparable{comparables.length === 1 ? '' : 's'}
              {promedioM2 && ` • Promedio: $${promedioM2.toLocaleString('es-MX', { maximumFractionDigits: 2 })}/m²`}
              {valorUVEstimado && avaluo.estado === 'visita_realizada' && (
                <> • Valor UV estimado: <span className="font-black text-slate-800">{fmt(valorUVEstimado, avaluo.moneda)}</span></>
              )}
            </p>
          </div>
          {puedeGestionarComparables && (
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-[#0F172A] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              AGREGAR COMPARABLE
            </button>
          )}
        </div>

        {comparables.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm font-semibold">No hay comparables capturados</p>
            {puedeGestionarComparables && (
              <p className="text-xs text-slate-400 mt-1">Agrega al menos uno para generar el preavalúo</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-5 py-3 text-left">Tipo</th>
                <th className="px-5 py-3 text-left">Ubicación</th>
                <th className="px-5 py-3 text-right">Sup. Constr.</th>
                <th className="px-5 py-3 text-right">Precio</th>
                <th className="px-5 py-3 text-right">$/m²</th>
                <th className="px-5 py-3 text-left">Fuente</th>
                {puedeGestionarComparables && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {comparables.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      c.tipo === 'venta' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {c.tipo}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{c.tipo_inmueble.replace('_', ' ')}</p>
                  </td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <p className="text-xs font-semibold text-slate-700 truncate">{c.calle || '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.municipio}, {c.estado_inmueble}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-semibold text-slate-700">
                    {c.superficie_construccion ? `${c.superficie_construccion} m²` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-bold text-slate-900">{fmt(c.precio, c.moneda)}</td>
                  <td className="px-5 py-3 text-right text-xs font-black text-slate-900">
                    {c.precio_m2 ? `$${Number(c.precio_m2).toLocaleString('es-MX')}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {c.url_fuente ? (
                      <a href={c.url_fuente} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">
                        {c.fuente || 'Ver →'}
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-500">{c.fuente || '—'}</span>
                    )}
                  </td>
                  {puedeGestionarComparables && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setConfirmarEliminar(c)}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Botón generar preavalúo (solo en visita_realizada con al menos 1 comparable) */}
      {puedeGestionarComparables && comparables.length > 0 && (
        <section className="bg-white rounded-2xl border-2 border-[#0F172A] shadow-md p-6 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">SIGUIENTE PASO</p>
            <h2 className="text-lg font-black text-slate-900">Generar preavalúo</h2>
            <p className="text-xs text-slate-500 mt-1">
              Se calculará el valor UV con el promedio de ${promedioM2?.toLocaleString('es-MX', { maximumFractionDigits: 2 })}/m²
              {' '}× {superficie} m² = <span className="font-black text-slate-900">{fmt(valorUVEstimado, avaluo.moneda)}</span>.
              El valuador recibirá este valor para que lo revise y ajuste si es necesario.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerarPreavaluo}
            disabled={pending || !valorUVEstimado}
            className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            {pending ? 'GENERANDO…' : 'GENERAR PREAVALÚO Y ENVIAR AL VALUADOR'}
          </button>
        </section>
      )}

      {/* MODAL: AGREGAR COMPARABLE */}
      {modalAbierto && (
        <Modal titulo="Nuevo comparable" onClose={() => setModalAbierto(false)}>
          <form action={handleAgregar} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <CampoSelect label="Tipo *" name="tipo" defaultValue="venta" options={[['venta', 'Venta'], ['renta', 'Renta']]} />
              <CampoSelect
                label="Tipo de inmueble *"
                name="tipo_inmueble"
                defaultValue="casa"
                options={TIPOS_INMUEBLE.map((t) => [t, t.replace('_', ' ')])}
              />
            </div>

            <CampoTexto label="Calle / referencia" name="calle" />
            <div className="grid grid-cols-3 gap-3">
              <CampoTexto label="Colonia" name="colonia" />
              <CampoTexto label="Municipio *" name="municipio" defaultValue={avaluo.municipio} required />
              <CampoTexto label="Estado *" name="estado_inmueble" defaultValue={avaluo.estado_inmueble} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CampoNumero label="Sup. terreno (m²)" name="superficie_terreno" />
              <CampoNumero label="Sup. construcción (m²) *" name="superficie_construccion" required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <CampoNumero label="Precio *" name="precio" required />
              </div>
              <CampoSelect label="Moneda" name="moneda" defaultValue="MXN" options={[['MXN', 'MXN'], ['USD', 'USD']]} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Fuente" name="fuente" placeholder="Inmuebles24, Vivanuncios..." />
              <CampoTexto label="Fecha publicación" name="fecha_publicacion" type="date" />
            </div>

            <CampoTexto label="URL del anuncio" name="url_fuente" type="url" placeholder="https://..." />

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Notas (medidas, colindancias, observaciones)
              </label>
              <textarea
                name="notas"
                rows={3}
                placeholder="Ej. Norte 12.5m con Lote 4, Sur 12.5m con Calle Principal..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
              >
                {pending ? 'GUARDANDO…' : 'AGREGAR COMPARABLE'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: SOLICITAR DOCUMENTOS FALTANTES */}
      {modalDocsFaltantes && (
        <Modal
          titulo="Solicitar documentos faltantes"
          onClose={() => { setModalDocsFaltantes(false); setMotivoDocsFaltantes(''); }}
        >
          <p className="text-sm text-slate-600 mb-3">
            El expediente regresará al valuador en estado <span className="font-bold text-amber-700">Captura</span> para
            que suba o corrija los documentos indicados.
          </p>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            ¿Qué documentos faltan o necesitan corrección?
          </label>
          <textarea
            value={motivoDocsFaltantes}
            onChange={(e) => setMotivoDocsFaltantes(e.target.value)}
            placeholder="Ej: 'Falta el croquis del inmueble en el Título de Propiedad. La Boleta Predial es del 2023, necesito una del ejercicio actual.'"
            rows={4}
            className="w-full text-xs text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2.5 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none mb-3"
          />
          <p className={`text-[10px] font-bold mb-4 ${motivoDocsFaltantes.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {motivoDocsFaltantes.trim().length}/10 caracteres mínimos
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setModalDocsFaltantes(false); setMotivoDocsFaltantes(''); }}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleSolicitarDocs}
              disabled={pending || motivoDocsFaltantes.trim().length < 10}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-400 text-white rounded-xl text-xs font-bold transition"
            >
              {pending ? 'ENVIANDO…' : 'SOLICITAR DOCS'}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: DEVOLVER AL VALUADOR */}
      {modalDevolverAbierto && (
        <Modal
          titulo="Solicitar re-ajuste al valuador"
          onClose={() => { setModalDevolverAbierto(false); setMotivoDevolucion(''); }}
        >
          <p className="text-sm text-slate-600 mb-3">
            El expediente regresará al valuador en estado <span className="font-bold text-cyan-700">Preavalúo</span> para
            que ajuste valor, comparables o información del expediente.
          </p>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Motivo de la devolución
          </label>
          <textarea
            value={motivoDevolucion}
            onChange={(e) => setMotivoDevolucion(e.target.value)}
            placeholder="Describe qué debe corregir el valuador. Ej: 'El valor está 18% por debajo del promedio del mercado, revisa los comparables del fraccionamiento Las Palmas.'"
            rows={4}
            className="w-full text-xs text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2.5 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none mb-3"
          />
          <p className={`text-[10px] font-bold mb-4 ${motivoDevolucion.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {motivoDevolucion.trim().length}/10 caracteres mínimos
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setModalDevolverAbierto(false); setMotivoDevolucion(''); }}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleDevolver}
              disabled={pending || motivoDevolucion.trim().length < 10}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-400 text-white rounded-xl text-xs font-bold transition"
            >
              {pending ? 'DEVOLVIENDO…' : '↩ DEVOLVER AL VALUADOR'}
            </button>
          </div>
        </Modal>
      )}

      {/* Documentación del expediente */}
      {documentos.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Documentación ({documentos.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase text-[10px]">Documento</th>
                  <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase text-[10px]">Categoría</th>
                  <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase text-[10px]">Tamaño</th>
                  <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase text-[10px]">Fecha</th>
                  <th className="text-right py-2 font-bold text-slate-500 uppercase text-[10px]">Acción</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-2.5 pr-4 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-base">{doc.tipo_mime?.startsWith('image/') ? '🖼' : '📄'}</span>
                      <span className="truncate max-w-[200px]">{doc.nombre}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {CATEGORIA_LABELS[doc.categoria ?? 'otro'] ?? doc.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{formatBytes(doc.tamanio_bytes)}</td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-2.5 text-right">
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase tracking-wide"
                        >
                          Ver ↗
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR COMPARABLE */}
      {confirmarEliminar && (
        <Modal titulo="¿Eliminar comparable?" onClose={() => setConfirmarEliminar(null)}>
          <p className="text-sm text-slate-600 mb-6">
            Se eliminará el comparable de <span className="font-bold text-slate-900">{confirmarEliminar.calle || confirmarEliminar.municipio}</span>.
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmarEliminar(null)}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={() => handleEliminar(confirmarEliminar.id)}
              disabled={pending}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs font-bold transition"
            >
              {pending ? 'ELIMINANDO…' : 'SÍ, ELIMINAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────
function Card({ label, valor, subtitulo }: { label: string; valor: string; subtitulo?: string | null }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-base font-black text-slate-900 truncate">{valor}</p>
      {subtitulo && <p className="text-[9px] text-emerald-600 font-bold mt-1">{subtitulo}</p>}
    </div>
  );
}

function Modal({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
      />
    </div>
  );
}

function CampoNumero({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        name={name}
        step="0.01"
        min="0"
        required={required}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
      />
    </div>
  );
}

function CampoSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none capitalize"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}
