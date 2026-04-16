'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarComparableAction,
  eliminarComparableAction,
  pasarAFirmaAction,
  devolverAPrevaluoAction,
  solicitarDocsFaltantesAction,
} from '../actions';
import {
  guardarEnfoquesSHFAction,
  generarPreavaluoSHFAction,
  type EnfoquesSHFPayload,
  type ComparableHomologacion,
} from './actions';
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
  // Enfoques SHF
  valor_unitario: number | null;
  valor_construcciones: number | null;
  depreciacion: number | null;
  valor_fisico_total: number | null;
  investigacion_mercado: string | null;
  rango_valores: string | null;
  homologacion: string | null;
  resultado_mercado: number | null;
  cap_ingresos: number | null;
  cap_tasa: number | null;
  cap_valor: number | null;
  conciliacion_comparacion: string | null;
  conciliacion_ponderacion: string | null;
  conciliacion_justificacion: string | null;
  declaracion_alcance: string | null;
  declaracion_supuestos: string | null;
  declaracion_limitaciones: string | null;
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

// Análisis IA de fotos (lectura desde Claude Vision)
interface AnalisisFotosIAReadonly {
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

type TabSHF = 'fisico' | 'mercado' | 'ingresos' | 'conciliacion' | 'declaraciones';

function parseHomologacion(raw: string | null): { texto: string; factores: ComparableHomologacion[] } {
  if (!raw) return { texto: '', factores: [] };
  const marker = '\n---FACTORES_JSON---\n';
  const idx = raw.indexOf(marker);
  if (idx === -1) return { texto: raw, factores: [] };
  const texto = raw.slice(0, idx);
  const json = raw.slice(idx + marker.length);
  try {
    const parsed = JSON.parse(json);
    const factores = Array.isArray(parsed)
      ? (parsed as ComparableHomologacion[])
      : [];
    return { texto, factores };
  } catch {
    return { texto, factores: [] };
  }
}

function parsePonderacion(raw: string | null): { fisico: number; mercado: number; ingresos: number } {
  if (!raw) return { fisico: 50, mercado: 50, ingresos: 0 };
  try {
    const p = JSON.parse(raw) as { fisico?: number; mercado?: number; ingresos?: number };
    return {
      fisico: Number(p.fisico ?? 50),
      mercado: Number(p.mercado ?? 50),
      ingresos: Number(p.ingresos ?? 0),
    };
  } catch {
    return { fisico: 50, mercado: 50, ingresos: 0 };
  }
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

  // ── Análisis IA de fotos (lectura) ──────────────────────────
  const [analisisIA, setAnalisisIA] = useState<AnalisisFotosIAReadonly | null>(null);
  const [cargandoAnalisisIA, setCargandoAnalisisIA] = useState(false);
  const [errorAnalisisIA, setErrorAnalisisIA] = useState<string | null>(null);

  const totalFotosExpediente =
    contadoresFotos.fachada + contadoresFotos.entorno + contadoresFotos.interior;

  const verAnalisisIA = async () => {
    setErrorAnalisisIA(null);
    setCargandoAnalisisIA(true);
    try {
      const res = await fetch('/api/claude-vision/analizar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaluo_id: avaluo.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrorAnalisisIA(json.error || 'No se pudo cargar el análisis.');
      } else {
        setAnalisisIA(json.analisis as AnalisisFotosIAReadonly);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de red';
      setErrorAnalisisIA(msg);
    } finally {
      setCargandoAnalisisIA(false);
    }
  };

  // ── Estado local de los 3 enfoques SHF ──────────────────────
  const [tabActiva, setTabActiva] = useState<TabSHF>('fisico');

  // Enfoque físico
  const [valorUnitario, setValorUnitario] = useState<string>(
    avaluo.valor_unitario != null ? String(avaluo.valor_unitario) : ''
  );
  const [valorConstrucciones, setValorConstrucciones] = useState<string>(
    avaluo.valor_construcciones != null ? String(avaluo.valor_construcciones) : ''
  );
  const [depreciacion, setDepreciacion] = useState<string>(
    avaluo.depreciacion != null ? String(avaluo.depreciacion) : ''
  );
  const [valorFisicoTotal, setValorFisicoTotal] = useState<string>(
    avaluo.valor_fisico_total != null ? String(avaluo.valor_fisico_total) : ''
  );
  const [valorFisicoOverride, setValorFisicoOverride] = useState<boolean>(false);

  // Enfoque de mercado
  const homologacionParsed = useMemo(() => parseHomologacion(avaluo.homologacion), [avaluo.homologacion]);
  const [investigacionMercado, setInvestigacionMercado] = useState<string>(avaluo.investigacion_mercado ?? '');
  const [rangoValores, setRangoValores] = useState<string>(avaluo.rango_valores ?? '');
  const [homologacionTexto, setHomologacionTexto] = useState<string>(homologacionParsed.texto);
  const [resultadoMercado, setResultadoMercado] = useState<string>(
    avaluo.resultado_mercado != null ? String(avaluo.resultado_mercado) : ''
  );
  const [resultadoMercadoOverride, setResultadoMercadoOverride] = useState<boolean>(false);
  const [factoresPorComparable, setFactoresPorComparable] = useState<Record<string, ComparableHomologacion>>(() => {
    const init: Record<string, ComparableHomologacion> = {};
    for (const c of comparables) {
      const existente = homologacionParsed.factores.find((f) => f.comparable_id === c.id);
      init[c.id] = existente ?? {
        comparable_id: c.id,
        factor_ubicacion: 1,
        factor_superficie: 1,
        factor_edad: 1,
        factor_conservacion: 1,
      };
    }
    return init;
  });

  // Enfoque de ingresos
  const [aplicaIngresos, setAplicaIngresos] = useState<boolean>(
    avaluo.cap_ingresos != null || avaluo.cap_tasa != null || avaluo.cap_valor != null
  );
  const [capIngresos, setCapIngresos] = useState<string>(
    avaluo.cap_ingresos != null ? String(avaluo.cap_ingresos) : ''
  );
  const [capTasa, setCapTasa] = useState<string>(
    avaluo.cap_tasa != null ? String(avaluo.cap_tasa) : ''
  );

  // Conciliación
  const pondInicial = useMemo(() => parsePonderacion(avaluo.conciliacion_ponderacion), [avaluo.conciliacion_ponderacion]);
  const [pesoFisico, setPesoFisico] = useState<string>(String(pondInicial.fisico));
  const [pesoMercado, setPesoMercado] = useState<string>(String(pondInicial.mercado));
  const [pesoIngresos, setPesoIngresos] = useState<string>(String(pondInicial.ingresos));
  const [conciliacionComparacion, setConciliacionComparacion] = useState<string>(avaluo.conciliacion_comparacion ?? '');
  const [conciliacionJustificacion, setConciliacionJustificacion] = useState<string>(
    avaluo.conciliacion_justificacion ?? ''
  );

  // Declaraciones
  const [declaracionAlcance, setDeclaracionAlcance] = useState<string>(avaluo.declaracion_alcance ?? '');
  const [declaracionSupuestos, setDeclaracionSupuestos] = useState<string>(avaluo.declaracion_supuestos ?? '');
  const [declaracionLimitaciones, setDeclaracionLimitaciones] = useState<string>(avaluo.declaracion_limitaciones ?? '');

  const mostrarToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const estadoCfg = ESTADO_LABELS[avaluo.estado] || ESTADO_LABELS.solicitud;
  const direccion = `${avaluo.calle}${avaluo.colonia ? ', ' + avaluo.colonia : ''}, ${avaluo.municipio}, ${avaluo.estado_inmueble}`;

  // Permite capturar comparables y gestionar enfoques en visita_realizada o preavaluo
  const puedeGestionarComparables = avaluo.estado === 'visita_realizada' || avaluo.estado === 'preavaluo';
  const puedeEditarEnfoquesSHF = avaluo.estado === 'visita_realizada' || avaluo.estado === 'preavaluo';
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

  // ── Cálculos derivados de los enfoques SHF ──────────────────
  const valorFisicoCalculado = useMemo(() => {
    const vc = parseFloat(valorConstrucciones);
    const dep = parseFloat(depreciacion);
    if (!Number.isFinite(vc) || vc <= 0) return null;
    const depPct = Number.isFinite(dep) ? dep : 0;
    return Math.round(vc * (1 - depPct / 100) * 100) / 100;
  }, [valorConstrucciones, depreciacion]);

  const valorFisicoFinal = useMemo(() => {
    if (valorFisicoOverride) {
      const vf = parseFloat(valorFisicoTotal);
      return Number.isFinite(vf) && vf > 0 ? vf : null;
    }
    return valorFisicoCalculado;
  }, [valorFisicoOverride, valorFisicoTotal, valorFisicoCalculado]);

  const resultadoMercadoCalculado = useMemo(() => {
    const sup = Number(avaluo.superficie_construccion || avaluo.superficie_terreno || 0);
    if (sup <= 0) return null;
    const preciosHomologados = comparables
      .map((c) => {
        const precioM2 = Number(c.precio_m2 ?? 0);
        if (!precioM2 || precioM2 <= 0) return null;
        const f = factoresPorComparable[c.id];
        if (!f) return precioM2;
        const factorResultante =
          Number(f.factor_ubicacion || 1) *
          Number(f.factor_superficie || 1) *
          Number(f.factor_edad || 1) *
          Number(f.factor_conservacion || 1);
        return precioM2 * factorResultante;
      })
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (preciosHomologados.length === 0) return null;
    const promedio = preciosHomologados.reduce((a, b) => a + b, 0) / preciosHomologados.length;
    return Math.round(promedio * sup * 100) / 100;
  }, [comparables, factoresPorComparable, avaluo.superficie_construccion, avaluo.superficie_terreno]);

  const resultadoMercadoFinal = useMemo(() => {
    if (resultadoMercadoOverride) {
      const rm = parseFloat(resultadoMercado);
      return Number.isFinite(rm) && rm > 0 ? rm : null;
    }
    return resultadoMercadoCalculado;
  }, [resultadoMercadoOverride, resultadoMercado, resultadoMercadoCalculado]);

  const capValor = useMemo(() => {
    const ing = parseFloat(capIngresos);
    const tasa = parseFloat(capTasa);
    if (!Number.isFinite(ing) || ing <= 0) return null;
    if (!Number.isFinite(tasa) || tasa <= 0) return null;
    return Math.round((ing / (tasa / 100)) * 100) / 100;
  }, [capIngresos, capTasa]);

  const sumaPesos = useMemo(() => {
    const f = parseFloat(pesoFisico) || 0;
    const m = parseFloat(pesoMercado) || 0;
    const i = aplicaIngresos ? parseFloat(pesoIngresos) || 0 : 0;
    return f + m + i;
  }, [pesoFisico, pesoMercado, pesoIngresos, aplicaIngresos]);

  const valorConciliadoFinal = useMemo(() => {
    if (Math.abs(sumaPesos - 100) > 0.01) return null;
    const f = valorFisicoFinal ?? 0;
    const m = resultadoMercadoFinal ?? 0;
    const i = aplicaIngresos ? capValor ?? 0 : 0;
    const pf = (parseFloat(pesoFisico) || 0) / 100;
    const pm = (parseFloat(pesoMercado) || 0) / 100;
    const pi = aplicaIngresos ? (parseFloat(pesoIngresos) || 0) / 100 : 0;
    const total = f * pf + m * pm + i * pi;
    if (!Number.isFinite(total) || total <= 0) return null;
    return Math.round(total * 100) / 100;
  }, [
    sumaPesos,
    valorFisicoFinal,
    resultadoMercadoFinal,
    capValor,
    aplicaIngresos,
    pesoFisico,
    pesoMercado,
    pesoIngresos,
  ]);

  const construirPayload = (): EnfoquesSHFPayload => ({
    valor_unitario: parseFloat(valorUnitario) || null,
    valor_construcciones: parseFloat(valorConstrucciones) || null,
    depreciacion: parseFloat(depreciacion) || null,
    valor_fisico_total: valorFisicoFinal,
    investigacion_mercado: investigacionMercado.trim() || null,
    rango_valores: rangoValores.trim() || null,
    homologacion: homologacionTexto.trim() || null,
    resultado_mercado: resultadoMercadoFinal,
    factores_por_comparable: comparables
      .map((c) => factoresPorComparable[c.id])
      .filter((f): f is ComparableHomologacion => f != null),
    aplica_ingresos: aplicaIngresos,
    cap_ingresos: aplicaIngresos ? parseFloat(capIngresos) || null : null,
    cap_tasa: aplicaIngresos ? parseFloat(capTasa) || null : null,
    cap_valor: aplicaIngresos ? capValor : null,
    conciliacion_comparacion: conciliacionComparacion.trim() || null,
    conciliacion_ponderacion: {
      fisico: parseFloat(pesoFisico) || 0,
      mercado: parseFloat(pesoMercado) || 0,
      ingresos: aplicaIngresos ? parseFloat(pesoIngresos) || 0 : 0,
    },
    conciliacion_justificacion: conciliacionJustificacion.trim() || null,
    declaracion_alcance: declaracionAlcance.trim() || null,
    declaracion_supuestos: declaracionSupuestos.trim() || null,
    declaracion_limitaciones: declaracionLimitaciones.trim() || null,
  });

  const handleGuardarBorrador = () => {
    startTransition(async () => {
      const res = await guardarEnfoquesSHFAction(avaluo.id, construirPayload());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleGenerarPreavaluo = () => {
    startTransition(async () => {
      const res = await generarPreavaluoSHFAction(avaluo.id, construirPayload());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const actualizarFactor = (
    compId: string,
    key: keyof Omit<ComparableHomologacion, 'comparable_id'>,
    valor: string,
  ) => {
    const num = parseFloat(valor);
    setFactoresPorComparable((prev) => ({
      ...prev,
      [compId]: {
        ...(prev[compId] ?? {
          comparable_id: compId,
          factor_ubicacion: 1,
          factor_superficie: 1,
          factor_edad: 1,
          factor_conservacion: 1,
        }),
        [key]: Number.isFinite(num) ? num : 1,
      },
    }));
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

      {/* ── ENFOQUES SHF — Tabs del preavalúo ────────────────────── */}
      {puedeEditarEnfoquesSHF && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">
              PREAVALÚO SHF
            </p>
            <h2 className="text-lg font-black text-slate-900">Enfoques valuatorios</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Captura los 3 enfoques SHF, concilia los valores y genera el preavalúo.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {([
              ['fisico', '1. Físico / Costos'],
              ['mercado', '2. Mercado'],
              ['ingresos', '3. Ingresos'],
              ['conciliacion', '4. Conciliación'],
              ['declaraciones', '5. Declaraciones'],
            ] as [TabSHF, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTabActiva(key)}
                className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition border-b-2 ${
                  tabActiva === key
                    ? 'text-[#0F172A] border-[#0F172A]'
                    : 'text-slate-400 border-transparent hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {/* ── Tab 1: Físico ──────────────────────────────── */}
            {tabActiva === 'fisico' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    ENFOQUE FÍSICO
                  </p>
                  <p className="text-xs text-slate-500">
                    Calcula el valor de reposición de las construcciones menos la depreciación.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CampoNumeroControlado
                    label="Valor unitario (MXN/m² construcción)"
                    valor={valorUnitario}
                    onChange={setValorUnitario}
                  />
                  <CampoNumeroControlado
                    label="Valor de construcciones (MXN) *"
                    valor={valorConstrucciones}
                    onChange={setValorConstrucciones}
                  />
                  <CampoNumeroControlado
                    label="Depreciación (%) *"
                    valor={depreciacion}
                    onChange={setDepreciacion}
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Valor físico total (MXN)
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <input
                          type="checkbox"
                          checked={valorFisicoOverride}
                          onChange={(e) => {
                            setValorFisicoOverride(e.target.checked);
                            if (!e.target.checked) setValorFisicoTotal('');
                          }}
                          className="rounded border-slate-300"
                        />
                        Override manual
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!valorFisicoOverride}
                      value={valorFisicoOverride ? valorFisicoTotal : (valorFisicoCalculado ?? '').toString()}
                      onChange={(e) => setValorFisicoTotal(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none disabled:text-slate-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Cálculo: valor construcciones × (1 − depreciación%).
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    VALOR FÍSICO RESULTANTE
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {valorFisicoFinal ? fmt(valorFisicoFinal, avaluo.moneda) : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Tab 2: Mercado ─────────────────────────────── */}
            {tabActiva === 'mercado' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    ENFOQUE DE MERCADO
                  </p>
                  <p className="text-xs text-slate-500">
                    Homologa cada comparable con factores correctivos y calcula el valor promedio.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Investigación de mercado
                  </label>
                  <textarea
                    rows={3}
                    value={investigacionMercado}
                    onChange={(e) => setInvestigacionMercado(e.target.value)}
                    placeholder="Describe cómo se investigó el mercado: fuentes, fechas, zona, criterios de selección de comparables."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Rango de valores encontrados
                    </label>
                    <input
                      type="text"
                      value={rangoValores}
                      onChange={(e) => setRangoValores(e.target.value)}
                      placeholder="Ej: $15,000 – $22,000 /m²"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Homologación aplicada (justificación)
                  </label>
                  <textarea
                    rows={2}
                    value={homologacionTexto}
                    onChange={(e) => setHomologacionTexto(e.target.value)}
                    placeholder="Justifica el método de homologación aplicado a los comparables."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                {/* Tabla de homologación */}
                {comparables.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-3 py-2 text-left">Comparable</th>
                          <th className="px-3 py-2 text-right">$/m²</th>
                          <th className="px-3 py-2 text-right">F. ubic.</th>
                          <th className="px-3 py-2 text-right">F. sup.</th>
                          <th className="px-3 py-2 text-right">F. edad</th>
                          <th className="px-3 py-2 text-right">F. cons.</th>
                          <th className="px-3 py-2 text-right">F. result.</th>
                          <th className="px-3 py-2 text-right">$/m² homol.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {comparables.map((c) => {
                          const f = factoresPorComparable[c.id] ?? {
                            comparable_id: c.id,
                            factor_ubicacion: 1,
                            factor_superficie: 1,
                            factor_edad: 1,
                            factor_conservacion: 1,
                          };
                          const factorResultante =
                            Number(f.factor_ubicacion || 1) *
                            Number(f.factor_superficie || 1) *
                            Number(f.factor_edad || 1) *
                            Number(f.factor_conservacion || 1);
                          const precioHomologado = Number(c.precio_m2 ?? 0) * factorResultante;
                          return (
                            <tr key={c.id}>
                              <td className="px-3 py-2 truncate max-w-[160px]">
                                <p className="text-xs font-semibold text-slate-700 truncate">
                                  {c.calle || c.municipio}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {c.colonia || c.municipio}
                                </p>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900">
                                {c.precio_m2 ? `$${Number(c.precio_m2).toLocaleString('es-MX')}` : '—'}
                              </td>
                              <td className="px-3 py-2">
                                <InputFactor
                                  valor={f.factor_ubicacion}
                                  onChange={(v) => actualizarFactor(c.id, 'factor_ubicacion', v)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InputFactor
                                  valor={f.factor_superficie}
                                  onChange={(v) => actualizarFactor(c.id, 'factor_superficie', v)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InputFactor
                                  valor={f.factor_edad}
                                  onChange={(v) => actualizarFactor(c.id, 'factor_edad', v)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InputFactor
                                  valor={f.factor_conservacion}
                                  onChange={(v) => actualizarFactor(c.id, 'factor_conservacion', v)}
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">
                                {factorResultante.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-black text-slate-900">
                                ${precioHomologado.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                    Captura al menos 1 comparable arriba para poder homologar.
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      VALOR DE MERCADO (RESULTADO)
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {resultadoMercadoFinal ? fmt(resultadoMercadoFinal, avaluo.moneda) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Promedio precios homologados × {superficie ?? '—'} m².
                    </p>
                  </div>
                  <div className="w-48 space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <input
                        type="checkbox"
                        checked={resultadoMercadoOverride}
                        onChange={(e) => {
                          setResultadoMercadoOverride(e.target.checked);
                          if (!e.target.checked) setResultadoMercado('');
                        }}
                        className="rounded border-slate-300"
                      />
                      Override manual
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!resultadoMercadoOverride}
                      value={resultadoMercadoOverride ? resultadoMercado : (resultadoMercadoCalculado ?? '').toString()}
                      onChange={(e) => setResultadoMercado(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none disabled:text-slate-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab 3: Ingresos ─────────────────────────────── */}
            {tabActiva === 'ingresos' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    ENFOQUE DE CAPITALIZACIÓN
                  </p>
                  <p className="text-xs text-slate-500">
                    Solo aplica para propiedades en renta o con potencial de rentabilidad.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicaIngresos}
                    onChange={(e) => setAplicaIngresos(e.target.checked)}
                    className="rounded border-slate-300 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Aplica enfoque de ingresos para esta propiedad
                  </span>
                </label>

                {aplicaIngresos ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <CampoNumeroControlado
                        label="Ingreso bruto anual (MXN)"
                        valor={capIngresos}
                        onChange={setCapIngresos}
                      />
                      <CampoNumeroControlado
                        label="Tasa de capitalización (%)"
                        valor={capTasa}
                        onChange={setCapTasa}
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        VALOR POR CAPITALIZACIÓN
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {capValor ? fmt(capValor, avaluo.moneda) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Cálculo: ingreso bruto ÷ (tasa / 100).
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                    Este enfoque no se aplicará al preavalúo.
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 4: Conciliación ────────────────────────── */}
            {tabActiva === 'conciliacion' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    CONCILIACIÓN DE VALORES
                  </p>
                  <p className="text-xs text-slate-500">
                    Asigna un peso a cada enfoque (deben sumar 100%). El valor UV se calcula con suma ponderada.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-2 text-left">Enfoque</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-right">Peso (%)</th>
                        <th className="px-4 py-2 text-right">Aporte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-700">1. Físico</td>
                        <td className="px-4 py-2 text-right font-bold">
                          {valorFisicoFinal ? fmt(valorFisicoFinal, avaluo.moneda) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={pesoFisico}
                            onChange={(e) => setPesoFisico(e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right focus:ring-2 focus:ring-slate-900 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-600">
                          {valorFisicoFinal && pesoFisico
                            ? fmt(
                                Math.round(valorFisicoFinal * (parseFloat(pesoFisico) / 100) * 100) / 100,
                                avaluo.moneda
                              )
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-700">2. Mercado</td>
                        <td className="px-4 py-2 text-right font-bold">
                          {resultadoMercadoFinal ? fmt(resultadoMercadoFinal, avaluo.moneda) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={pesoMercado}
                            onChange={(e) => setPesoMercado(e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right focus:ring-2 focus:ring-slate-900 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-600">
                          {resultadoMercadoFinal && pesoMercado
                            ? fmt(
                                Math.round(resultadoMercadoFinal * (parseFloat(pesoMercado) / 100) * 100) / 100,
                                avaluo.moneda
                              )
                            : '—'}
                        </td>
                      </tr>
                      {aplicaIngresos && (
                        <tr>
                          <td className="px-4 py-2 font-bold text-slate-700">3. Ingresos</td>
                          <td className="px-4 py-2 text-right font-bold">
                            {capValor ? fmt(capValor, avaluo.moneda) : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={pesoIngresos}
                              onChange={(e) => setPesoIngresos(e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-600">
                            {capValor && pesoIngresos
                              ? fmt(
                                  Math.round(capValor * (parseFloat(pesoIngresos) / 100) * 100) / 100,
                                  avaluo.moneda
                                )
                              : '—'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest" colSpan={2}>
                          Suma de pesos
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-black ${
                            Math.abs(sumaPesos - 100) < 0.01 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {sumaPesos.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-right font-black text-slate-900">
                          {valorConciliadoFinal ? fmt(valorConciliadoFinal, avaluo.moneda) : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Tabla comparativa / notas (markdown permitido)
                  </label>
                  <textarea
                    rows={3}
                    value={conciliacionComparacion}
                    onChange={(e) => setConciliacionComparacion(e.target.value)}
                    placeholder="Opcional: tabla markdown o comentarios sobre la comparación de los 3 enfoques."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Justificación de la ponderación *
                  </label>
                  <textarea
                    rows={3}
                    value={conciliacionJustificacion}
                    onChange={(e) => setConciliacionJustificacion(e.target.value)}
                    placeholder="Explica por qué asignaste esos pesos (mín. 10 caracteres)."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5">
                  <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1">
                    VALOR UV CONCILIADO (FINAL)
                  </p>
                  <p className="text-3xl font-black">
                    {valorConciliadoFinal ? fmt(valorConciliadoFinal, avaluo.moneda) : '—'}
                  </p>
                  {Math.abs(sumaPesos - 100) > 0.01 && (
                    <p className="text-[10px] text-amber-300 mt-1 font-bold">
                      ⚠ Los pesos deben sumar exactamente 100% para calcular el valor final.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab 5: Declaraciones ───────────────────────── */}
            {tabActiva === 'declaraciones' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    DECLARACIONES SHF
                  </p>
                  <p className="text-xs text-slate-500">
                    Textos obligatorios según las Reglas de Carácter General para las Unidades de Valuación (SHF).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Alcance del avalúo
                  </label>
                  <textarea
                    rows={3}
                    value={declaracionAlcance}
                    onChange={(e) => setDeclaracionAlcance(e.target.value)}
                    placeholder="Ej: El presente avalúo tiene por objeto determinar el valor comercial del inmueble referido, conforme a las Reglas de Carácter General de la SHF..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Supuestos considerados
                  </label>
                  <textarea
                    rows={3}
                    value={declaracionSupuestos}
                    onChange={(e) => setDeclaracionSupuestos(e.target.value)}
                    placeholder="Ej: Se asume que la documentación aportada por el solicitante es auténtica y que el inmueble se encuentra libre de gravámenes distintos a los descritos..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Limitaciones del avalúo
                  </label>
                  <textarea
                    rows={3}
                    value={declaracionLimitaciones}
                    onChange={(e) => setDeclaracionLimitaciones(e.target.value)}
                    placeholder="Ej: El avalúo no contempla inspección estructural ni análisis de instalaciones ocultas. La vigencia es de 6 meses conforme a la normativa SHF..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Acciones: Guardar borrador + Generar preavalúo */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex gap-3">
            <button
              type="button"
              onClick={handleGuardarBorrador}
              disabled={pending}
              className="flex-1 py-3 border-2 border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-white transition tracking-widest"
            >
              {pending ? 'GUARDANDO…' : 'GUARDAR BORRADOR'}
            </button>
            <button
              type="button"
              onClick={handleGenerarPreavaluo}
              disabled={pending}
              className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition tracking-widest"
            >
              {pending
                ? 'GENERANDO…'
                : avaluo.estado === 'visita_realizada'
                  ? 'GENERAR PREAVALÚO Y ENVIAR AL VALUADOR'
                  : 'RECALCULAR PREAVALÚO'}
            </button>
          </div>

          {/* Resumen preview en visita_realizada con promedio simple (legacy) */}
          {avaluo.estado === 'visita_realizada' && valorUVEstimado && !valorConciliadoFinal && (
            <div className="bg-amber-50 border-t border-amber-200 px-6 py-3 text-[10px] text-amber-700">
              Referencia sin homologación: promedio simple = {fmt(valorUVEstimado, avaluo.moneda)}.
            </div>
          )}
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

      {/* Análisis IA de fotos — solo lectura para controlador */}
      {totalFotosExpediente >= 4 && (
        <section className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">
                ✨ Análisis IA de fotos
              </p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Ver análisis con Claude Vision
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Analiza las fotos de visita con IA y obtén estado de conservación, entorno urbano, factores y observaciones técnicas. Solo lectura.
              </p>
            </div>
            <button
              type="button"
              onClick={verAnalisisIA}
              disabled={cargandoAnalisisIA}
              className="shrink-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl transition tracking-wider shadow-sm"
            >
              {cargandoAnalisisIA ? 'ANALIZANDO…' : 'VER ANÁLISIS IA'}
            </button>
          </div>
          {errorAnalisisIA && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorAnalisisIA}
            </p>
          )}
        </section>
      )}

      {/* MODAL: análisis IA solo lectura */}
      {analisisIA && (
        <Modal titulo="✨ Análisis IA de fotos (solo lectura)" onClose={() => setAnalisisIA(null)}>
          <AnalisisFotosReadonly analisis={analisisIA} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAnalisisIA(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              CERRAR
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

// ── Vista de análisis IA (solo lectura, para controlador) ─────────────
function AnalisisFotosReadonly({ analisis }: { analisis: AnalisisFotosIAReadonly }) {
  const valor = (v: unknown) => (v == null || v === '' ? '—' : String(v));
  return (
    <div className="space-y-5 text-xs max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <InfoReadonly label="Tipo de inmueble" value={valor(analisis.tipo_inmueble_observado)} />
        <InfoReadonly label="Estado de conservación" value={valor(analisis.estado_conservacion)} highlight />
        <InfoReadonly label="Edad aparente (años)" value={valor(analisis.edad_aparente_anos)} />
        <InfoReadonly label="Niveles observados" value={valor(analisis.num_niveles_observados)} />
        <InfoReadonly label="Calidad de acabados" value={valor(analisis.calidad_acabados)} />
        <InfoReadonly label="Materiales de fachada" value={valor(analisis.materiales_fachada)} />
        <InfoReadonly label="Materiales de cubiertas" value={valor(analisis.materiales_cubiertas)} />
      </div>

      {analisis.instalaciones_visibles && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Instalaciones visibles
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InfoReadonly label="Eléctricas" value={valor(analisis.instalaciones_visibles.electricas)} />
            <InfoReadonly label="Hidráulicas" value={valor(analisis.instalaciones_visibles.hidraulicas)} />
            <InfoReadonly label="Gas" value={analisis.instalaciones_visibles.gas ? 'Sí' : 'No'} />
            <InfoReadonly label="Clima" value={analisis.instalaciones_visibles.clima ? 'Sí' : 'No'} />
          </div>
        </div>
      )}

      {analisis.entorno_urbano && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Entorno urbano
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InfoReadonly label="Tipo de zona" value={valor(analisis.entorno_urbano.tipo_zona)} highlight />
            <InfoReadonly label="Calidad de vialidad" value={valor(analisis.entorno_urbano.calidad_vialidad)} />
            <InfoReadonly
              label="Infraestructura visible"
              value={valor(analisis.entorno_urbano.infraestructura_visible)}
            />
            <InfoReadonly
              label="Construcción predominante"
              value={valor(analisis.entorno_urbano.construccion_predominante)}
              highlight
            />
          </div>
        </div>
      )}

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

      {analisis.fotos_con_problemas && analisis.fotos_con_problemas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">
            Fotos con problemas detectadas
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
    </div>
  );
}

function InfoReadonly({
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

function CampoNumeroControlado({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
      />
    </div>
  );
}

function InputFactor({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-right font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none"
    />
  );
}
