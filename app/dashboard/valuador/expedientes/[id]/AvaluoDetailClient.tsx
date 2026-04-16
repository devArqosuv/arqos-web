'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  agendarVisitaAction,
  subirFotosVisitaAction,
  ajustarYEnviarRevisionAction,
  aplicarAnalisisFotosAction,
} from '../actions';
import { firmarValuadorAction, obtenerUrlPdfOficialAction } from '../../../firma/actions';

// ─────────────────────────────────────────────────────────
// Verificación de servicios (Fase 3 del diagrama)
// ─────────────────────────────────────────────────────────
export interface VerificacionServicios {
  agua?: string;
  luz?: string;
  alumbrado_publico?: string;
  banquetas?: string;
  tipo_calles?: string;
  telefono_internet?: string;
}

const OPCIONES_SERVICIOS: Record<keyof VerificacionServicios, { value: string; label: string }[]> = {
  agua: [
    { value: 'municipal',   label: 'Municipal / Red pública' },
    { value: 'pozo',        label: 'Pozo propio' },
    { value: 'pipa',        label: 'Pipa' },
    { value: 'no_hay',      label: 'No hay servicio' },
  ],
  luz: [
    { value: 'cfe',         label: 'CFE (red pública)' },
    { value: 'planta',      label: 'Planta propia / Solar' },
    { value: 'no_hay',      label: 'No hay servicio' },
  ],
  alumbrado_publico: [
    { value: 'si',          label: 'Sí hay' },
    { value: 'parcial',     label: 'Parcial' },
    { value: 'no',          label: 'No hay' },
  ],
  banquetas: [
    { value: 'si',          label: 'Sí hay' },
    { value: 'parcial',     label: 'Parcial' },
    { value: 'no',          label: 'No hay' },
  ],
  tipo_calles: [
    { value: 'pavimentada', label: 'Pavimentada / Asfalto' },
    { value: 'concreto',    label: 'Concreto hidráulico' },
    { value: 'empedrado',   label: 'Empedrado' },
    { value: 'terraceria',  label: 'Terracería' },
  ],
  telefono_internet: [
    { value: 'fibra',       label: 'Fibra óptica' },
    { value: 'cable',       label: 'Cable / ADSL' },
    { value: 'inalambrico', label: 'Inalámbrico / Satelital' },
    { value: 'no_hay',      label: 'No hay servicio' },
  ],
};

const LABELS_SERVICIOS: Record<keyof VerificacionServicios, string> = {
  agua:              'Agua',
  luz:               'Luz',
  alumbrado_publico: 'Alumbrado público',
  banquetas:         'Banquetas',
  tipo_calles:       'Tipo de calles',
  telefono_internet: 'Teléfono / Internet',
};

interface Props {
  avaluo: {
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
    fecha_solicitud: string;
    fecha_visita_agendada: string | null;
    fecha_visita_realizada: string | null;
    firmado_uv: boolean;
    firmado_valuador: boolean;
    fecha_firma_uv: string | null;
    fecha_firma_valuador: string | null;
    pdf_oficial_path: string | null;
    valuador: { nombre: string; apellidos: string | null } | null;
    verificacion_servicios: VerificacionServicios | null;
    motivo_devolucion: string | null;
    devuelto_at: string | null;
    devoluciones_count: number;
  };
  contadoresFotos: {
    fachada: number;
    portada: number;
    entorno: number;
    interior: number;
  };
  documentos: {
    id: string;
    nombre: string;
    categoria: string | null;
    storage_path: string;
    tipo_mime: string | null;
    tamanio_bytes: number | null;
    created_at: string;
    url: string | null;
  }[];
}

// ─────────────────────────────────────────────────────────
// Análisis IA de fotos (Claude Vision)
// ─────────────────────────────────────────────────────────
export interface AnalisisFotosIA {
  tipo_inmueble_observado?: string | null;
  estado_conservacion?: string | null;
  edad_aparente_anos?: number | null;
  num_niveles_observados?: number | null;
  materiales_fachada?: string | null;
  materiales_cubiertas?: string | null;
  calidad_acabados?: string | null;
  instalaciones_visibles?: {
    electricas?: string | null;
    hidraulicas?: string | null;
    gas?: boolean | null;
    clima?: boolean | null;
  } | null;
  entorno_urbano?: {
    tipo_zona?: string | null;
    calidad_vialidad?: string | null;
    infraestructura_visible?: string | null;
    construccion_predominante?: string | null;
  } | null;
  factores_positivos?: string[] | null;
  factores_negativos?: string[] | null;
  observaciones_tecnicas?: string | null;
  fotos_con_problemas?: Array<{ indice: number; problema: string }> | null;
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

const CATEGORIA_LABELS: Record<string, string> = {
  documento: 'Expediente',
  fachada: 'Fachada',
  portada: 'Portada',
  entorno: 'Entorno',
  interior: 'Interior',
  uso_suelo: 'Uso de suelo',
  otro: 'Otro',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AvaluoDetailClient({ avaluo, contadoresFotos, documentos }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [fechaVisita, setFechaVisita] = useState('');

  // Estado de las fotos (solo se usa en estado agenda_visita)
  // Requerimiento: 1 fachada + 1 portada + 2 entorno + 5 a 8 interior (rango).
  const MIN_INTERIOR = 5;
  const MAX_INTERIOR = 8;
  const [fachada, setFachada] = useState<File | null>(null);
  const [portada, setPortada] = useState<File | null>(null);
  const [entornos, setEntornos] = useState<(File | null)[]>([null, null]);
  const [interiores, setInteriores] = useState<(File | null)[]>(
    Array(MIN_INTERIOR).fill(null),
  );
  const fachadaRef = useRef<HTMLInputElement>(null);
  const portadaRef = useRef<HTMLInputElement>(null);
  const entornoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const interiorRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verificación de servicios (Fase 3)
  const [servicios, setServicios] = useState<VerificacionServicios>(
    avaluo.verificacion_servicios ?? {},
  );
  const actualizarServicio = <K extends keyof VerificacionServicios>(
    k: K,
    v: VerificacionServicios[K],
  ) => setServicios((prev) => ({ ...prev, [k]: v }));

  const serviciosCompletos = (Object.keys(OPCIONES_SERVICIOS) as Array<keyof VerificacionServicios>)
    .every((k) => !!servicios[k]);

  const agregarSlotInterior = () => {
    setInteriores((prev) => (prev.length < MAX_INTERIOR ? [...prev, null] : prev));
  };
  const quitarSlotInterior = (i: number) => {
    setInteriores((prev) => {
      if (prev.length <= MIN_INTERIOR) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // Análisis de fotos con Claude Vision (solo en visita_realizada)
  const [analizando, setAnalizando] = useState(false);
  const [analisisIA, setAnalisisIA] = useState<AnalisisFotosIA | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  // Estado del ajuste de valor (preavaluo)
  // Inicializamos con el valor UV para que el valuador acepte por defecto
  const [valorAjustado, setValorAjustado] = useState<string>('');
  useEffect(() => {
    if (avaluo.estado === 'preavaluo' && avaluo.valor_uv && !valorAjustado) {
      setValorAjustado(String(avaluo.valor_uv));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaluo.estado, avaluo.valor_uv]);

  const mostrarToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const interioresLlenos = interiores.filter(Boolean).length;
  const totalFotos = (fachada ? 1 : 0) + (portada ? 1 : 0) + entornos.filter(Boolean).length + interioresLlenos;
  // Válido si: 1 fachada + 1 portada + 2 entornos + entre 5 y 8 interiores.
  const fotosCompletas =
    !!fachada &&
    !!portada &&
    entornos.every(Boolean) &&
    interioresLlenos >= MIN_INTERIOR &&
    interioresLlenos <= MAX_INTERIOR &&
    interiores.every(Boolean);

  const estadoCfg = ESTADO_LABELS[avaluo.estado] || ESTADO_LABELS.solicitud;
  const direccionCompleta = `${avaluo.calle}${avaluo.colonia ? ', ' + avaluo.colonia : ''}, ${avaluo.municipio}, ${avaluo.estado_inmueble}`;

  const handleAgendar = () => {
    if (!fechaVisita) {
      mostrarToast('error', 'Selecciona fecha y hora antes de agendar.');
      return;
    }
    startTransition(async () => {
      const res = await agendarVisitaAction(avaluo.id, new Date(fechaVisita).toISOString());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleSubirFotos = () => {
    if (!fotosCompletas) {
      mostrarToast('error', `Faltan fotos: 1 fachada, 1 portada, 2 entorno y entre ${MIN_INTERIOR} y ${MAX_INTERIOR} interior.`);
      return;
    }
    if (!serviciosCompletos) {
      mostrarToast('error', 'Llena los 6 campos de verificación de servicios antes de registrar la visita.');
      return;
    }
    startTransition(async () => {
      // Capturar GPS una vez antes de subir — se aplica a TODAS las fotos
      // de esta visita. Si el navegador no da permiso, seguimos sin GPS.
      let gpsData: { lat: number; lng: number; accuracy: number } | null = null;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10_000,
              maximumAge: 60_000,
            }),
          );
          gpsData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          console.warn('GPS no disponible o denegado');
        }
      }

      const fd = new FormData();
      fd.append('avaluoId', avaluo.id);
      if (fachada) fd.append('fachada', fachada);
      if (portada) fd.append('portada', portada);
      entornos.forEach((f) => f && fd.append('entorno', f));
      interiores.forEach((f) => f && fd.append('interior', f));
      // Servicios como JSON string
      fd.append('servicios', JSON.stringify(servicios));
      // GPS — si lo capturamos, lo mandamos como JSON string
      if (gpsData) {
        fd.append('gps', JSON.stringify(gpsData));
      }

      const res = await subirFotosVisitaAction(fd);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleAjustarValor = () => {
    const valor = parseFloat(valorAjustado);
    if (!Number.isFinite(valor) || valor <= 0) {
      mostrarToast('error', 'Ingresa un valor válido mayor a cero.');
      return;
    }
    startTransition(async () => {
      const res = await ajustarYEnviarRevisionAction(avaluo.id, valor);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleFirmarValuador = () => {
    startTransition(async () => {
      const res = await firmarValuadorAction(avaluo.id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const totalFotosVisita =
    contadoresFotos.fachada +
    contadoresFotos.portada +
    contadoresFotos.entorno +
    contadoresFotos.interior;

  const handleAnalizarFotos = async () => {
    setErrorAnalisis(null);
    setAnalizando(true);
    try {
      const res = await fetch('/api/claude-vision/analizar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaluo_id: avaluo.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrorAnalisis(json.error || 'No se pudo completar el análisis.');
        setAnalisisIA(null);
      } else {
        setAnalisisIA(json.analisis as AnalisisFotosIA);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de red';
      setErrorAnalisis(msg);
    } finally {
      setAnalizando(false);
    }
  };

  const handleAplicarAnalisis = () => {
    if (!analisisIA) return;
    startTransition(async () => {
      const res = await aplicarAnalisisFotosAction(avaluo.id, {
        estado_conservacion: analisisIA.estado_conservacion ?? null,
        construccion_predominante:
          analisisIA.entorno_urbano?.construccion_predominante ?? null,
        tipo_zona: analisisIA.entorno_urbano?.tipo_zona ?? null,
        observaciones: analisisIA.observaciones_tecnicas ?? null,
      });
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setAnalisisIA(null);
        router.refresh();
      }
    });
  };

  const handleDescartarAnalisis = () => {
    setAnalisisIA(null);
    setErrorAnalisis(null);
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

  const updateEntorno = (idx: number, file: File | null) => {
    setEntornos((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  };

  const updateInterior = (idx: number, file: File | null) => {
    setInteriores((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            EXPEDIENTE {avaluo.folio || '—'}
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{direccionCompleta}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Solicitado el {new Date(avaluo.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-[10px] font-bold border px-3 py-1.5 rounded-full ${estadoCfg.bg} ${estadoCfg.color}`}>
          {estadoCfg.label}
        </span>
      </div>

      {/* Toast */}
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

      {/* Resumen del avalúo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valor estimado</p>
          <p className="text-xl font-black text-slate-900">
            {avaluo.valor_estimado
              ? `${avaluo.moneda} $${Number(avaluo.valor_estimado).toLocaleString('es-MX')}`
              : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Uso de suelo</p>
          <p className="text-xs font-bold text-slate-800">{avaluo.uso_suelo || '—'}</p>
          {avaluo.uso_suelo_auto && (
            <p className="text-[9px] text-emerald-600 font-bold mt-1">AUTO • CATÁLOGO QRO</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visita</p>
          {avaluo.fecha_visita_realizada ? (
            <p className="text-xs font-bold text-emerald-700">
              ✓ Realizada{' '}
              {new Date(avaluo.fecha_visita_realizada).toLocaleDateString('es-MX')}
            </p>
          ) : avaluo.fecha_visita_agendada ? (
            <p className="text-xs font-bold text-orange-700">
              📅 Agendada{' '}
              {new Date(avaluo.fecha_visita_agendada).toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-400">Sin agendar</p>
          )}
        </div>
      </div>

      {/* Acción según estado */}
      {avaluo.estado === 'captura' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Agendar visita al inmueble</h2>
            <p className="text-xs text-slate-500 mt-1">
              Documentación validada. Programa la visita física al inmueble para tomar las fotografías requeridas (1 fachada, 1 portada, 2 entorno y entre {MIN_INTERIOR} y {MAX_INTERIOR} interior).
            </p>
            {/* Botón descargar checklist PDF */}
            <button
              type="button"
              onClick={async () => {
                const { pdf } = await import('@react-pdf/renderer');
                const { default: ChecklistVisitaPdf } = await import('./ChecklistVisitaPdf');
                const blob = await pdf(
                  <ChecklistVisitaPdf
                    folio={avaluo.folio || ''}
                    direccion={direccionCompleta}
                    propietario={null}
                    fechaVisita={avaluo.fecha_visita_agendada
                      ? new Date(avaluo.fecha_visita_agendada).toLocaleString('es-MX')
                      : null}
                  />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `checklist-visita-${avaluo.folio || avaluo.id}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mt-2 text-[10px] font-bold text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg px-3 py-1.5 transition inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Descargar checklist de visita (PDF)
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Fecha y hora de la visita
            </label>
            <input
              type="datetime-local"
              value={fechaVisita}
              onChange={(e) => setFechaVisita(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:border-[#0F172A] focus:bg-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAgendar}
            disabled={pending || !fechaVisita}
            className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            {pending ? 'AGENDANDO…' : 'AGENDAR VISITA'}
          </button>
        </section>
      )}

      {avaluo.estado === 'agenda_visita' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Subir las fotografías de la visita</h2>
            <p className="text-xs text-slate-500 mt-1">
              Se requiere: <strong>1 fachada</strong>, <strong>1 portada</strong>, <strong>2 entorno</strong> y{' '}
              <strong>{MIN_INTERIOR} a {MAX_INTERIOR} interior</strong>. Total: {2 + 1 + 1 + MIN_INTERIOR} a {2 + 1 + 1 + MAX_INTERIOR} fotos.
            </p>
          </div>

          {/* Fachada */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Fachada (1) — {fachada ? '✓' : 'pendiente'}
            </p>
            <input
              ref={fachadaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setFachada(e.target.files?.[0] || null)}
            />
            <SlotFoto
              file={fachada}
              onClick={() => fachadaRef.current?.click()}
              etiqueta="Fachada principal"
            />
          </div>

          {/* Portada */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Portada (1) — {portada ? '✓' : 'pendiente'}
            </p>
            <input
              ref={portadaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setPortada(e.target.files?.[0] || null)}
            />
            <SlotFoto
              file={portada}
              onClick={() => portadaRef.current?.click()}
              etiqueta="Foto para portada del avalúo"
            />
          </div>

          {/* Entorno */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Entorno (2) — {entornos.filter(Boolean).length}/2
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i}>
                  <input
                    ref={(el) => { entornoRefs.current[i] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => updateEntorno(i, e.target.files?.[0] || null)}
                  />
                  <SlotFoto
                    file={entornos[i]}
                    onClick={() => entornoRefs.current[i]?.click()}
                    etiqueta={`Entorno ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Interior — rango dinámico 5..8 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Interior ({MIN_INTERIOR}–{MAX_INTERIOR}) — {interioresLlenos}/{interiores.length}
              </p>
              {interiores.length < MAX_INTERIOR && (
                <button
                  type="button"
                  onClick={agregarSlotInterior}
                  className="text-[10px] font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg px-2.5 py-1 transition"
                >
                  + Agregar slot
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {interiores.map((_, i) => (
                <div key={i} className="relative group">
                  <input
                    ref={(el) => { interiorRefs.current[i] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => updateInterior(i, e.target.files?.[0] || null)}
                  />
                  <SlotFoto
                    file={interiores[i]}
                    onClick={() => interiorRefs.current[i]?.click()}
                    etiqueta={`Interior ${i + 1}`}
                    pequeño
                  />
                  {/* Botón quitar (solo visible si hay más del mínimo) */}
                  {interiores.length > MIN_INTERIOR && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); quitarSlotInterior(i); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-300 hover:border-red-400 hover:text-red-500 text-slate-400 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm opacity-0 group-hover:opacity-100 transition"
                      aria-label={`Quitar Interior ${i + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Verificación de servicios — 6 dropdowns */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Verificación de servicios
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Llena los 6 campos sobre los servicios disponibles en la zona del inmueble.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(OPCIONES_SERVICIOS) as Array<keyof VerificacionServicios>).map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {LABELS_SERVICIOS[k]}
                  </label>
                  <select
                    value={servicios[k] ?? ''}
                    onChange={(e) => actualizarServicio(k, e.target.value || undefined)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">— Seleccionar —</option>
                    {OPCIONES_SERVICIOS[k].map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Progreso + botón */}
          <div className="pt-2 space-y-3">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                style={{ width: `${(totalFotos / (1 + 2 + interiores.length)) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleSubirFotos}
              disabled={pending || !fotosCompletas || !serviciosCompletos}
              className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
            >
              {pending
                ? 'SUBIENDO…'
                : !fotosCompletas
                ? `FALTAN ${Math.max((1 + 2 + interiores.length) - totalFotos, 0)} FOTO(S)`
                : !serviciosCompletos
                ? 'COMPLETA LA VERIFICACIÓN DE SERVICIOS'
                : 'MARCAR VISITA REALIZADA Y SUBIR FOTOS'}
            </button>
          </div>
        </section>
      )}

      {avaluo.estado === 'visita_realizada' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Visita realizada</h2>
              <p className="text-xs text-slate-500 mt-1">
                Se subieron correctamente las {contadoresFotos.fachada + contadoresFotos.entorno + contadoresFotos.interior} fotografías.
                {' '}Esperando que el controlador (UV) capture comparables y genere el preavalúo.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <DotCount label="Fachada" count={contadoresFotos.fachada} esperado={1} />
            <DotCount label="Portada" count={contadoresFotos.portada} esperado={1} />
            <DotCount label="Entorno" count={contadoresFotos.entorno} esperado={2} />
            <DotCount label="Interior" count={contadoresFotos.interior} esperado={`${MIN_INTERIOR}-${MAX_INTERIOR}`} />
          </div>

          {/* Botón: Analizar fotos con IA (Claude Vision) */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAnalizarFotos}
              disabled={analizando || totalFotosVisita < 4}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider shadow-sm"
            >
              {analizando ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ANALIZANDO CON IA…
                </>
              ) : totalFotosVisita < 4 ? (
                'SE REQUIEREN AL MENOS 4 FOTOS'
              ) : (
                <>✨ ANALIZAR FOTOS CON IA (CLAUDE VISION)</>
              )}
            </button>
            {errorAnalisis && (
              <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorAnalisis}
              </p>
            )}
          </div>
        </section>
      )}

      {/* MODAL — Resultado del análisis IA */}
      {analisisIA && (
        <ModalAnalisisIA
          analisis={analisisIA}
          onAplicar={handleAplicarAnalisis}
          onDescartar={handleDescartarAnalisis}
          pending={pending}
        />
      )}

      {avaluo.estado === 'preavaluo' && (
        <section className="bg-white rounded-2xl border-2 border-cyan-300 shadow-md p-6 space-y-5">
          {/* Banner de devolución: solo si el controlador devolvió este expediente */}
          {avaluo.motivo_devolucion && avaluo.devoluciones_count > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 shadow">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                    Re-ajuste solicitado por el controlador
                    {avaluo.devoluciones_count > 1 && ` (${avaluo.devoluciones_count}ª vez)`}
                  </p>
                  <p className="text-xs text-amber-900 mt-1.5 leading-snug whitespace-pre-wrap font-semibold">
                    {avaluo.motivo_devolucion}
                  </p>
                  {avaluo.devuelto_at && (
                    <p className="text-[9px] text-amber-700 mt-2 font-semibold">
                      Devuelto el {new Date(avaluo.devuelto_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Revisar preavalúo y ajustar valor</h2>
            <p className="text-xs text-slate-500 mt-1">
              El controlador (UV) generó un preavalúo con base en los comparables del mercado.
              Revisa el valor y ajústalo si lo consideras necesario antes de enviarlo a revisión final.
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-5">
            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-2">Valor UV (Controlador)</p>
            <p className="text-3xl font-black text-slate-900">
              {avaluo.valor_uv
                ? `${avaluo.moneda} $${Number(avaluo.valor_uv).toLocaleString('es-MX')}`
                : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Calculado por homologación de comparables</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Tu valor (puedes aceptar el UV o ajustarlo)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAjustado}
                onChange={(e) => setValorAjustado(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-base font-black text-slate-900 focus:border-[#0F172A] focus:bg-white outline-none"
              />
            </div>
            {avaluo.valor_uv && parseFloat(valorAjustado) > 0 && (
              <p className="text-[10px] text-slate-500 font-semibold">
                {(() => {
                  const v = parseFloat(valorAjustado);
                  const diff = v - avaluo.valor_uv!;
                  const pct = (diff / avaluo.valor_uv!) * 100;
                  if (Math.abs(pct) < 0.01) return 'Aceptas el valor UV sin cambios.';
                  return (
                    <>
                      Diferencia vs UV:{' '}
                      <span className={`font-black ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {diff >= 0 ? '+' : ''}${diff.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                        {' '}({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                      </span>
                    </>
                  );
                })()}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAjustarValor}
            disabled={pending || !valorAjustado || parseFloat(valorAjustado) <= 0}
            className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            {pending ? 'ENVIANDO…' : 'CONFIRMAR Y ENVIAR A REVISIÓN'}
          </button>
        </section>
      )}

      {(avaluo.estado === 'revision' || avaluo.estado === 'firma' || avaluo.estado === 'aprobado') && avaluo.valor_uv && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            {avaluo.estado === 'revision'
              ? 'En revisión final con el controlador'
              : avaluo.estado === 'firma'
              ? 'Pendiente de firma'
              : 'Avalúo aprobado'}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1">Valor UV</p>
              <p className="text-2xl font-black">{avaluo.moneda} ${Number(avaluo.valor_uv).toLocaleString('es-MX')}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Tu valor</p>
              <p className="text-2xl font-black">
                {avaluo.valor_valuador ? `${avaluo.moneda} $${Number(avaluo.valor_valuador).toLocaleString('es-MX')}` : '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Bloque de firma del valuador — solo en estado firma */}
      {avaluo.estado === 'firma' && (
        <section className="bg-white rounded-2xl border-2 border-sky-300 shadow-md p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">FIRMA ELECTRÓNICA</p>
            <h2 className="text-lg font-black text-slate-900">Firmas pendientes</h2>
            <p className="text-xs text-slate-500 mt-1">
              Para liberar el avalúo y generar el documento oficial, ambas partes deben firmar.
              El controlador (UV) firma primero, después tú firmas y se genera el PDF automáticamente.
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tú (Valuador)</p>
              {avaluo.firmado_valuador ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✓ Firmado</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {avaluo.fecha_firma_valuador && new Date(avaluo.fecha_firma_valuador).toLocaleString('es-MX')}
                  </p>
                </>
              ) : avaluo.firmado_uv ? (
                <p className="text-sm font-bold text-sky-600">Listo para firmar</p>
              ) : (
                <p className="text-sm font-bold text-slate-400">Esperando al controlador…</p>
              )}
            </div>
          </div>

          {/* Botón de firma del valuador */}
          {avaluo.firmado_uv && !avaluo.firmado_valuador && (
            <button
              type="button"
              onClick={handleFirmarValuador}
              disabled={pending}
              className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
            >
              {pending ? 'FIRMANDO Y GENERANDO PDF…' : '✍ FIRMAR Y GENERAR DOCUMENTO OFICIAL'}
            </button>
          )}

          {!avaluo.firmado_uv && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-amber-700">
                ⏳ Esperando que el controlador (UV) firme primero.
              </p>
              <p className="text-[10px] text-amber-600 mt-1">
                Te avisaremos cuando puedas firmar.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Bloque de descarga del PDF — solo cuando está aprobado */}
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

      {/* Notas */}
      {avaluo.notas && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notas del expediente</p>
          <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{avaluo.notas}</p>
        </section>
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
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────
function SlotFoto({
  file,
  onClick,
  etiqueta,
  pequeño,
}: {
  file: File | null;
  onClick: () => void;
  etiqueta: string;
  pequeño?: boolean;
}) {
  const altura = pequeño ? 'h-20' : 'h-28';
  if (file) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full ${altura} rounded-lg overflow-hidden border-2 border-emerald-300 bg-emerald-50`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={URL.createObjectURL(file)}
          alt={etiqueta}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold py-1 text-center">
          ✓ {pequeño ? '' : etiqueta}
        </div>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full ${altura} rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition flex flex-col items-center justify-center gap-1 text-slate-400`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      <span className="text-[9px] font-bold uppercase tracking-wider">{etiqueta}</span>
    </button>
  );
}

function DotCount({ label, count, esperado }: { label: string; count: number; esperado: number | string }) {
  // `esperado` puede ser número (mínimo) o string tipo "5-8" (rango min-max).
  let ok: boolean;
  if (typeof esperado === 'number') {
    ok = count >= esperado;
  } else {
    const [min, max] = esperado.split('-').map((n) => parseInt(n, 10));
    ok = count >= (min ?? 0) && count <= (max ?? Infinity);
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-black ${ok ? 'text-emerald-700' : 'text-slate-700'}`}>
        {count}/{esperado}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Modal con resultados del análisis IA de fotos
// ─────────────────────────────────────────────────────────
function ModalAnalisisIA({
  analisis,
  onAplicar,
  onDescartar,
  pending,
}: {
  analisis: AnalisisFotosIA;
  onAplicar: () => void;
  onDescartar: () => void;
  pending: boolean;
}) {
  const valor = (v: unknown) => (v == null || v === '' ? '—' : String(v));

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onDescartar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">
              ✨ Análisis IA de fotos
            </p>
            <h3 className="text-lg font-black text-slate-900">Resultado de Claude Vision</h3>
          </div>
          <button
            onClick={onDescartar}
            className="text-slate-400 hover:text-slate-900 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-xs">
          {/* Resumen principal */}
          <div className="grid grid-cols-2 gap-3">
            <InfoIA label="Tipo de inmueble" value={valor(analisis.tipo_inmueble_observado)} />
            <InfoIA label="Estado de conservación" value={valor(analisis.estado_conservacion)} highlight />
            <InfoIA label="Edad aparente (años)" value={valor(analisis.edad_aparente_anos)} />
            <InfoIA label="Niveles observados" value={valor(analisis.num_niveles_observados)} />
            <InfoIA label="Calidad de acabados" value={valor(analisis.calidad_acabados)} />
            <InfoIA label="Materiales de fachada" value={valor(analisis.materiales_fachada)} />
            <InfoIA label="Materiales de cubiertas" value={valor(analisis.materiales_cubiertas)} />
          </div>

          {/* Instalaciones */}
          {analisis.instalaciones_visibles && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Instalaciones visibles
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoIA label="Eléctricas" value={valor(analisis.instalaciones_visibles.electricas)} />
                <InfoIA label="Hidráulicas" value={valor(analisis.instalaciones_visibles.hidraulicas)} />
                <InfoIA label="Gas" value={analisis.instalaciones_visibles.gas ? 'Sí' : 'No'} />
                <InfoIA label="Clima" value={analisis.instalaciones_visibles.clima ? 'Sí' : 'No'} />
              </div>
            </div>
          )}

          {/* Entorno urbano */}
          {analisis.entorno_urbano && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Entorno urbano
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoIA label="Tipo de zona" value={valor(analisis.entorno_urbano.tipo_zona)} highlight />
                <InfoIA label="Calidad de vialidad" value={valor(analisis.entorno_urbano.calidad_vialidad)} />
                <InfoIA label="Infraestructura visible" value={valor(analisis.entorno_urbano.infraestructura_visible)} />
                <InfoIA
                  label="Construcción predominante"
                  value={valor(analisis.entorno_urbano.construccion_predominante)}
                  highlight
                />
              </div>
            </div>
          )}

          {/* Factores */}
          {(analisis.factores_positivos?.length || analisis.factores_negativos?.length) && (
            <div className="grid grid-cols-2 gap-3">
              {analisis.factores_positivos && analisis.factores_positivos.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                    Factores positivos
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-emerald-900 space-y-0.5">
                    {analisis.factores_positivos.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analisis.factores_negativos && analisis.factores_negativos.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">
                    Factores negativos
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5">
                    {analisis.factores_negativos.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {analisis.observaciones_tecnicas && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Observaciones técnicas
              </p>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
                {analisis.observaciones_tecnicas}
              </p>
            </div>
          )}

          {/* Fotos con problemas */}
          {analisis.fotos_con_problemas && analisis.fotos_con_problemas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">
                Fotos con problemas
              </p>
              <ul className="text-[11px] text-red-900 space-y-0.5">
                {analisis.fotos_con_problemas.map((f, i) => (
                  <li key={i}>
                    Foto #{f.indice}: {f.problema}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900">
            <p className="font-bold mb-1">Al aplicar, se guardará en el expediente:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {analisis.estado_conservacion && <li>Estado de conservación</li>}
              {analisis.entorno_urbano?.tipo_zona && <li>Tipo de zona</li>}
              {analisis.entorno_urbano?.construccion_predominante && <li>Construcción predominante</li>}
              {analisis.observaciones_tecnicas && <li>Observaciones técnicas (agregadas a notas)</li>}
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onDescartar}
            disabled={pending}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50"
          >
            DESCARTAR
          </button>
          <button
            type="button"
            onClick={onAplicar}
            disabled={pending}
            className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
          >
            {pending ? 'APLICANDO…' : 'APLICAR AL EXPEDIENTE'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoIA({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        highlight ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <p
        className={`text-xs font-bold mt-0.5 capitalize ${
          highlight ? 'text-purple-900' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
