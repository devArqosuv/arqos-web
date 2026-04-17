'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { crearAvaluoVacioAction, registrarDocumentosAction } from '@/util/supabase/actions';
import type { TipoInmueble } from '@/types/arqos';
import { createClient } from '@/util/supabase/client';
import ValuadorTopbar from '../ValuadorTopbar';
import ConfirmacionDatosIA, { type Correccion, type DatosIA } from './ConfirmacionDatosIA';

// ── Tipos ──
type TipoAvaluo = '1.0' | '2.0' | '';
// BancoId: id de la tabla `bancos` (dinámico) o 'otro' para modo libre
type BancoId = string;
const BANCO_OTRO = 'otro' as const;

interface DocumentoRequerido {
  id: string;
  nombre: string;
}

interface DocCustom {
  id: string;
  nombre: string;
  file: File | null;
}

interface BancoRemoto {
  id: string;
  nombre: string;
  orden: number;
  banco_documentos: {
    id: string;
    nombre: string;
    orden: number;
    obligatorio: boolean;
  }[];
}

interface UsoSueloOption {
  id: string;
  clave: string;
  nombre: string;
}

// Heurística simple: ¿la dirección extraída por la IA dice Querétaro?
function esEnQueretaro(estadoInmueble: string | null | undefined): boolean {
  if (!estadoInmueble) return false;
  const normalizado = estadoInmueble
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // sin acentos
    .toLowerCase()
    .trim();
  return /\bqueretaro\b/.test(normalizado) || /\bqro\b/.test(normalizado);
}

interface ResultadoDocumento {
  id: string;
  nombre: string;
  valido: boolean;
  tipo_detectado?: string;     // Tipo REAL que la IA identificó (puede no coincidir con el slot)
  tipo_coincide?: boolean;     // false → mismatch entre slot y archivo
  datos_extraidos: Record<string, string | null>;
  errores: string[];
}

interface ResultadoAnalisis {
  valido: boolean;
  errores_bloqueantes: string[];
  documentos: ResultadoDocumento[];
  datos_consolidados: {
    // Propietario y solicitante
    propietario: string | null;
    solicitante: string | null;
    // Dirección
    ubicacion: string | null;
    calle: string | null;
    colonia: string | null;
    municipio: string | null;
    estado: string | null;
    cp: string | null;
    // Catastral
    clave_catastral: string | null;
    cuenta_predial: string | null;
    valor_catastral: string | null;
    // Superficies
    superficie_terreno: string | null;
    superficie_construccion: string | null;
    superficie: string | null; // legacy fallback
    // Legal
    regimen_propiedad: string | null;
    numero_escritura: string | null;
    notario: string | null;
    fecha_escritura: string | null;
    rpp_folio: string | null;
    situacion_legal: string | null;
    restricciones_servidumbres: string | null;
    medidas_colindancias: string | null;
    // Descripción del inmueble
    tipo_inmueble_detectado: string | null;
    edad_inmueble: string | null;
    uso_suelo_detectado: string | null;
    descripcion_fisica: string | null;
    construcciones: string | null;
    instalaciones: string | null;
    estado_conservacion: string | null;
    topografia_forma: string | null;
    num_recamaras: string | null;
    num_banos: string | null;
    num_estacionamientos: string | null;
    // Características urbanas
    clasificacion_zona: string | null;
    uso_predominante: string | null;
    tipo_zona: string | null;
    cuenta_agua: string | null;
    // Folios
    folio_infonavit: string | null;
    clave_unica_vivienda: string | null;
    // Documentación
    documentacion_analizada: string | null;
    // Valores
    valor_estimado: string | null;
    observaciones: string | null;
  };
  // Confianza (0-1) por campo que la IA llenó. Puede faltar (legacy).
  confianza?: Record<string, number>;
}

const DOCS_TIPO_1: DocumentoRequerido[] = [
  { id: '1.1', nombre: 'Título de Propiedad' },
  { id: '1.2', nombre: 'Boleta Predial / Cédula Catastral' },
  { id: '1.3', nombre: 'Identificación Oficial' },
];

// Ícono PDF
function IconPDF() {
  return (
    <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 15.5c0 .28-.22.5-.5.5H7v1H6v-4h2c.28 0 .5.22.5.5v2zm3.5.5h-1v1h-1v-4h2c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1zm4-2.5h-2v1h1.5v1H14v1h-1v-4h3v1z" />
      <path d="M7 13.5h1v1H7zM11 13.5h1v1h-1z" />
    </svg>
  );
}

export default function AvaluosClient() {
  // ── Estado del formulario ──
  const [valorBase, setValorBase] = useState('');
  const [notasRiesgo, setNotasRiesgo] = useState('');

  // ── Estado del panel de IA ──
  const [tipoAvaluo, setTipoAvaluo] = useState<TipoAvaluo>('');
  const [tipoDropdownAbierto, setTipoDropdownAbierto] = useState(false);
  const [bancos, setBancos] = useState<BancoRemoto[]>([]);
  const [bancosCargando, setBancosCargando] = useState(false);
  const [bancoSeleccionado, setBancoSeleccionado] = useState<BancoId>('');
  const [bancoDropdownAbierto, setBancoDropdownAbierto] = useState(false);
  const [docsCustom, setDocsCustom] = useState<DocCustom[]>([]);

  // Uso de suelo (geofence Querétaro)
  const [usosSueloQro, setUsosSueloQro] = useState<UsoSueloOption[]>([]);
  const [usoSueloSeleccionado, setUsoSueloSeleccionado] = useState<string>('');
  const [usoSueloFile, setUsoSueloFile] = useState<File | null>(null);
  const usoSueloFileRef = useRef<HTMLInputElement>(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoResult, setGuardadoResult] = useState<{ exito: boolean; folio?: string; avaluo_id?: string; error?: string } | null>(null);

  // Override manual del valuador: cuando la IA bloquea pero el valuador
  // tiene contexto adicional y quiere seguir adelante bajo su responsabilidad.
  // El motivo se persiste en `notas` del avalúo para auditoría posterior.
  const [validacionManual, setValidacionManual] = useState(false);
  const [motivoOverride, setMotivoOverride] = useState('');

  // ── Paso obligatorio de confirmación humana sobre datos IA ──
  // La IA extrae datos y los muestra; el valuador DEBE revisar/corregir
  // antes de que se grabe el avaluo. Se persiste en shf_correcciones.
  const [mostrandoConfirmacion, setMostrandoConfirmacion] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tipoDropdownRef = useRef<HTMLDivElement>(null);
  const bancoDropdownRef = useRef<HTMLDivElement>(null);

  // Cargar bancos desde Supabase al montar
  useEffect(() => {
    let cancelado = false;
    async function cargarBancos() {
      setBancosCargando(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bancos')
        .select('id, nombre, orden, banco_documentos(id, nombre, orden, obligatorio)')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (cancelado) return;

      if (error) {
        console.error('Error cargando bancos:', error);
        setBancos([]);
      } else {
        // Ordenar documentos por `orden` dentro de cada banco
        const bancosOrdenados = (data as BancoRemoto[] | null)?.map((b) => ({
          ...b,
          banco_documentos: [...(b.banco_documentos || [])].sort((a, b) => a.orden - b.orden),
        })) ?? [];
        setBancos(bancosOrdenados);
      }
      setBancosCargando(false);
    }
    cargarBancos();
    return () => { cancelado = true; };
  }, []);

  // Cargar catálogo de usos de suelo de Querétaro al montar
  useEffect(() => {
    let cancelado = false;
    async function cargarUsosSuelo() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usos_suelo_qro')
        .select('id, clave, nombre')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (cancelado) return;

      if (error) {
        console.error('Error cargando usos de suelo Qro:', error);
        setUsosSueloQro([]);
      } else {
        setUsosSueloQro((data as UsoSueloOption[] | null) ?? []);
      }
    }
    cargarUsosSuelo();
    return () => { cancelado = true; };
  }, []);

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

  useEffect(() => {
    if (!bancoDropdownAbierto) return;
    const handler = (e: MouseEvent) => {
      if (bancoDropdownRef.current && !bancoDropdownRef.current.contains(e.target as Node)) {
        setBancoDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bancoDropdownAbierto]);

  const bancoActual = bancos.find((b) => b.id === bancoSeleccionado);

  // ── Geofence Querétaro ────────────────────────────────────
  // Después de que la IA analiza los PDFs, miramos el estado_inmueble extraído
  // y determinamos si el inmueble está en Querétaro.
  // - Sí → mostramos dropdown del catálogo `usos_suelo_qro`
  // - No → mostramos input para subir imagen de uso de suelo
  const ubicacionDetectada = resultado?.datos_consolidados?.ubicacion ?? null;
  const estadoDetectado = resultado?.datos_consolidados?.estado ?? null;
  const inmuebleEnQro = esEnQueretaro(estadoDetectado) || esEnQueretaro(ubicacionDetectada);

  // Validación efectiva: pasa la IA o el valuador hizo override manual.
  // Esta es la única flag que las demás partes del UI deben consultar.
  const validacionAprobada = resultado?.valido === true || validacionManual;

  const usoSueloListo =
    !validacionAprobada
      ? true                                                  // todavía no aplica
      : validacionManual
      ? true                                                  // override: uso de suelo es opcional
      : inmuebleEnQro
      ? !!usoSueloSeleccionado                                // requiere selección del catálogo
      : !!usoSueloFile;                                       // requiere imagen subida

  // Toda la lógica de slots vive ahora en docsCustom — sin importar si vino
  // de un preset (Tipo 1.0 / banco) o si el valuador los agregó manualmente.
  const archivosSubidos = docsCustom.filter((d) => d.file && d.nombre.trim()).length;
  const totalDocs = docsCustom.length;
  const todosSubidos =
    docsCustom.length > 0 && docsCustom.every((d) => d.file && d.nombre.trim());

  const mostrarPasoDocumentos =
    tipoAvaluo === '1.0' || (tipoAvaluo === '2.0' && bancoSeleccionado !== '');

  const resetUsoSuelo = () => {
    setUsoSueloSeleccionado('');
    setUsoSueloFile(null);
  };

  // Convierte un arreglo de slots predefinidos en docsCustom editables
  // (sin archivos cargados todavía).
  const seedDocsCustom = (slots: { id: string; nombre: string }[]) =>
    slots.map((s) => ({ id: s.id, nombre: s.nombre, file: null as File | null }));

  const handleTipoChange = (tipo: TipoAvaluo) => {
    setTipoAvaluo(tipo);
    setBancoSeleccionado('');
    setResultado(null);
    setGuardadoResult(null);
    resetUsoSuelo();
    // Tipo 1.0 trae los 3 docs predefinidos. Tipo 2.0 espera a que elijan banco.
    if (tipo === '1.0') {
      setDocsCustom(seedDocsCustom(DOCS_TIPO_1));
    } else {
      setDocsCustom([]);
    }
  };

  const handleBancoChange = (banco: BancoId) => {
    setBancoSeleccionado(banco);
    setResultado(null);
    setGuardadoResult(null);
    resetUsoSuelo();
    // Si es un banco real, cargamos sus docs como punto de partida editable.
    // Si eligen "otro", queda en blanco para que añadan los que quieran.
    if (banco !== BANCO_OTRO) {
      const bancoEncontrado = bancos.find((b) => b.id === banco);
      if (bancoEncontrado) {
        setDocsCustom(seedDocsCustom(bancoEncontrado.banco_documentos));
        return;
      }
    }
    setDocsCustom([]);
  };

  const agregarDocCustom = () => {
    setDocsCustom((prev) => [
      ...prev,
      { id: `custom-${Date.now()}-${prev.length}`, nombre: '', file: null },
    ]);
  };

  const actualizarDocCustomNombre = (id: string, nombre: string) => {
    setDocsCustom((prev) => prev.map((d) => (d.id === id ? { ...d, nombre } : d)));
    setResultado(null);
    setGuardadoResult(null);
  };

  const actualizarDocCustomFile = (id: string, file: File | null) => {
    setDocsCustom((prev) => prev.map((d) => (d.id === id ? { ...d, file } : d)));
    setResultado(null);
    setGuardadoResult(null);
  };

  const eliminarDocCustom = (id: string) => {
    setDocsCustom((prev) => prev.filter((d) => d.id !== id));
    setResultado(null);
    setGuardadoResult(null);
  };

  // Drag & drop reorder de docsCustom (HTML5 nativo, sin librería)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reordenarDocCustom = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setDocsCustom((prev) => {
      const sourceIdx = prev.findIndex((d) => d.id === sourceId);
      const targetIdx = prev.findIndex((d) => d.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    // Reordenar invalida el resultado de la IA porque las posiciones cambiaron
    setResultado(null);
    setGuardadoResult(null);
  };

  // Rutas temporales subidas a Storage para el análisis de IA.
  // Se reutilizan al guardar para no subir 2 veces.
  const [tempStoragePaths, setTempStoragePaths] = useState<
    { docId: string; docNombre: string; storagePath: string; contentType: string; tamanio: number }[]
  >([]);

  const handleAnalizarAvaluo = async () => {
    if (!todosSubidos || !tipoAvaluo) return;
    setAnalizando(true);
    setResultado(null);
    setValidacionManual(false);
    setMotivoOverride('');

    const emptyConsolidados = (): ResultadoAnalisis['datos_consolidados'] => ({
      propietario: null, solicitante: null,
      ubicacion: null, calle: null, colonia: null, municipio: null, estado: null, cp: null,
      clave_catastral: null, cuenta_predial: null, valor_catastral: null,
      superficie_terreno: null, superficie_construccion: null, superficie: null,
      regimen_propiedad: null, numero_escritura: null, notario: null, fecha_escritura: null,
      rpp_folio: null, situacion_legal: null, restricciones_servidumbres: null, medidas_colindancias: null,
      tipo_inmueble_detectado: null, edad_inmueble: null, uso_suelo_detectado: null,
      descripcion_fisica: null, construcciones: null, instalaciones: null, estado_conservacion: null,
      topografia_forma: null, num_recamaras: null, num_banos: null, num_estacionamientos: null,
      clasificacion_zona: null, uso_predominante: null, tipo_zona: null, cuenta_agua: null,
      folio_infonavit: null, clave_unica_vivienda: null,
      documentacion_analizada: null, valor_estimado: null, observaciones: null,
    });
    const resultadoConError = (mensaje: string): ResultadoAnalisis => ({
      valido: false,
      errores_bloqueantes: [mensaje],
      documentos: [],
      datos_consolidados: emptyConsolidados(),
    });

    try {
      // PASO 1: Subir archivos a Storage en ruta temporal (directo a Supabase, no pasa por Vercel)
      const supabase = createClient();
      const MIME_PERMITIDOS: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
      };

      const docsParaEnviar = docsCustom
        .filter((d): d is DocCustom & { file: File } => !!d.file && !!d.nombre.trim())
        .map((d) => ({ id: d.id, nombre: d.nombre.trim(), file: d.file }));

      const tempId = `temp-${Date.now()}`;
      const subidos: typeof tempStoragePaths = [];

      for (const doc of docsParaEnviar) {
        const ext = (doc.file.name.split('.').pop() || '').toLowerCase();
        const contentType = MIME_PERMITIDOS[ext] ?? doc.file.type ?? 'application/octet-stream';
        const storagePath = `temp/${tempId}/${doc.id}-${Date.now()}.${ext}`;

        const { error: errUpload } = await supabase.storage
          .from('documentos')
          .upload(storagePath, doc.file, { contentType, upsert: false });

        if (errUpload) {
          setResultado(resultadoConError(`Error al subir ${doc.nombre}: ${errUpload.message}`));
          return;
        }

        subidos.push({
          docId: doc.id,
          docNombre: doc.nombre,
          storagePath,
          contentType,
          tamanio: doc.file.size,
        });
      }

      setTempStoragePaths(subidos);

      // PASO 2: Llamar a la API con JSON ligero (solo rutas, <1KB)
      const res = await fetch('/api/analizar-avaluo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoAvaluo,
          banco: tipoAvaluo === '2.0' && bancoSeleccionado ? bancoSeleccionado : undefined,
          documentos: subidos.map((s) => ({
            id: s.docId,
            nombre: s.docNombre,
            storagePath: s.storagePath,
            contentType: s.contentType,
          })),
        }),
      });

      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        const texto = await res.text().catch(() => '');
        setResultado(resultadoConError(
          `La API respondió con estado ${res.status} pero el cuerpo no es JSON válido${texto ? `: ${texto.slice(0, 200)}` : '.'}`
        ));
        return;
      }

      if (!res.ok) {
        const r = raw as { error?: string; raw?: string } | null;
        const mensaje = r?.error
          ? `Error de la IA (${res.status}): ${r.error}`
          : `Error de la IA (${res.status}). Revisa los logs del servidor o intenta de nuevo.`;
        setResultado(resultadoConError(mensaje));
        return;
      }

      const r = raw as Partial<ResultadoAnalisis> & { error?: string };
      const data: ResultadoAnalisis = {
        valido: typeof r?.valido === 'boolean' ? r.valido : false,
        errores_bloqueantes: Array.isArray(r?.errores_bloqueantes)
          ? r.errores_bloqueantes
          : (r?.error ? [String(r.error)] : ['La IA devolvió una respuesta inválida (sin errores_bloqueantes).']),
        documentos: Array.isArray(r?.documentos) ? r.documentos : [],
        datos_consolidados: {
          propietario:             r?.datos_consolidados?.propietario             ?? null,
          solicitante:             r?.datos_consolidados?.solicitante             ?? null,
          ubicacion:               r?.datos_consolidados?.ubicacion               ?? null,
          calle:                   r?.datos_consolidados?.calle                   ?? null,
          colonia:                 r?.datos_consolidados?.colonia                 ?? null,
          municipio:               r?.datos_consolidados?.municipio               ?? null,
          estado:                  r?.datos_consolidados?.estado                  ?? null,
          cp:                      r?.datos_consolidados?.cp                      ?? null,
          clave_catastral:         r?.datos_consolidados?.clave_catastral         ?? null,
          cuenta_predial:          r?.datos_consolidados?.cuenta_predial          ?? null,
          valor_catastral:         r?.datos_consolidados?.valor_catastral         ?? null,
          superficie_terreno:      r?.datos_consolidados?.superficie_terreno      ?? null,
          superficie_construccion: r?.datos_consolidados?.superficie_construccion ?? null,
          superficie:              r?.datos_consolidados?.superficie              ?? r?.datos_consolidados?.superficie_terreno ?? null,
          regimen_propiedad:       r?.datos_consolidados?.regimen_propiedad       ?? null,
          numero_escritura:        r?.datos_consolidados?.numero_escritura        ?? null,
          notario:                 r?.datos_consolidados?.notario                 ?? null,
          fecha_escritura:         r?.datos_consolidados?.fecha_escritura         ?? null,
          rpp_folio:               r?.datos_consolidados?.rpp_folio               ?? null,
          situacion_legal:         r?.datos_consolidados?.situacion_legal         ?? null,
          restricciones_servidumbres: r?.datos_consolidados?.restricciones_servidumbres ?? null,
          medidas_colindancias:    r?.datos_consolidados?.medidas_colindancias    ?? null,
          tipo_inmueble_detectado: r?.datos_consolidados?.tipo_inmueble_detectado ?? null,
          edad_inmueble:           r?.datos_consolidados?.edad_inmueble           ?? null,
          uso_suelo_detectado:     r?.datos_consolidados?.uso_suelo_detectado     ?? null,
          descripcion_fisica:      r?.datos_consolidados?.descripcion_fisica      ?? null,
          construcciones:          r?.datos_consolidados?.construcciones          ?? null,
          instalaciones:           r?.datos_consolidados?.instalaciones           ?? null,
          estado_conservacion:     r?.datos_consolidados?.estado_conservacion     ?? null,
          topografia_forma:        r?.datos_consolidados?.topografia_forma        ?? null,
          num_recamaras:           r?.datos_consolidados?.num_recamaras           ?? null,
          num_banos:               r?.datos_consolidados?.num_banos               ?? null,
          num_estacionamientos:    r?.datos_consolidados?.num_estacionamientos    ?? null,
          clasificacion_zona:      r?.datos_consolidados?.clasificacion_zona      ?? null,
          uso_predominante:        r?.datos_consolidados?.uso_predominante        ?? null,
          tipo_zona:               r?.datos_consolidados?.tipo_zona               ?? null,
          cuenta_agua:             r?.datos_consolidados?.cuenta_agua             ?? null,
          folio_infonavit:         r?.datos_consolidados?.folio_infonavit         ?? null,
          clave_unica_vivienda:    r?.datos_consolidados?.clave_unica_vivienda    ?? null,
          documentacion_analizada: r?.datos_consolidados?.documentacion_analizada ?? null,
          valor_estimado:          r?.datos_consolidados?.valor_estimado          ?? null,
          observaciones:           r?.datos_consolidados?.observaciones           ?? null,
        },
        confianza: (r as { confianza?: Record<string, number> })?.confianza ?? {},
      };
      setResultado(data);
      if (data.valido) {
        if (data.datos_consolidados.valor_estimado) setValorBase(data.datos_consolidados.valor_estimado);
        if (data.datos_consolidados.observaciones) setNotasRiesgo(data.datos_consolidados.observaciones);
        // IA válida → ABRIR PASO DE CONFIRMACIÓN HUMANA.
        // El valuador debe revisar/corregir y presionar "Confirmar" para grabar.
        setMostrandoConfirmacion(true);
      }
    } catch (err) {
      const mensaje = err instanceof Error
        ? `Error de red: ${err.message}`
        : 'Error de red desconocido. Verifica tu conexión e intenta de nuevo.';
      setResultado(resultadoConError(mensaje));
    } finally {
      setAnalizando(false);
    }
  };

  // ─── Handlers del paso de confirmación ───
  const handleConfirmacionUsuario = async (datosFinales: DatosIA, correcciones: Correccion[]) => {
    if (!resultado) return;
    // Construimos un ResultadoAnalisis con los datos editados por el humano
    const resultadoEditado: ResultadoAnalisis = {
      ...resultado,
      datos_consolidados: {
        ...resultado.datos_consolidados,
        ...(datosFinales as Partial<ResultadoAnalisis['datos_consolidados']>),
      },
    };
    setMostrandoConfirmacion(false);
    await ejecutarGuardado(resultadoEditado, tempStoragePaths, validacionManual, correcciones);
  };

  const handleCancelarConfirmacion = () => {
    setMostrandoConfirmacion(false);
    // Permanece el resultado visible pero el valuador puede subir nuevos docs
    // o re-analizar sin haber confirmado.
  };

  // ─── Lógica de guardado (reutilizada por auto-save y override manual) ───
  const ejecutarGuardado = async (
    resultadoIA: ResultadoAnalisis,
    archivosTemp: typeof tempStoragePaths,
    esOverride: boolean,
    correccionesHumanas: Correccion[] = [],
  ) => {
    setGuardando(true);
    setGuardadoResult(null);

    const datos = resultadoIA.datos_consolidados;

    // Dirección: preferir campos estructurados de la IA, fallback a split de ubicacion
    const ubicacionRaw = datos.ubicacion || '';
    const partesDir = ubicacionRaw.split(',').map((p: string) => p.trim());

    const calleIA = datos.calle || partesDir[0] || 'Sin especificar';
    const coloniaIA = datos.colonia || partesDir[1] || undefined;
    const municipioIA = datos.municipio || partesDir[2] || 'Sin especificar';
    const estadoIA = datos.estado || partesDir[3] || 'Sin especificar';

    // Superficies: preferir campos específicos, fallback a legacy
    const parseNum = (v: string | null | undefined): number | undefined => {
      if (!v) return undefined;
      const n = Number(String(v).replace(/[^0-9.]/g, ''));
      return isNaN(n) || n === 0 ? undefined : n;
    };

    let usoSueloPayload: string | null = null;
    let usoSueloAuto = false;
    if (inmuebleEnQro && usoSueloSeleccionado) {
      const usoElegido = usosSueloQro.find((u) => u.id === usoSueloSeleccionado);
      if (usoElegido) {
        usoSueloPayload = `${usoElegido.clave} — ${usoElegido.nombre}`;
        usoSueloAuto = true;
      }
    }

    const payload = {
      tipo_avaluo: tipoAvaluo as '1.0' | '2.0',
      banco_id: tipoAvaluo === '2.0' && bancoSeleccionado && bancoSeleccionado !== BANCO_OTRO
        ? bancoSeleccionado
        : null,
      // Dirección (auto-fill desde IA)
      calle: calleIA,
      colonia: coloniaIA,
      municipio: municipioIA,
      estado_inmueble: estadoIA,
      cp: datos.cp || undefined,
      // Inmueble — tipo detectado por IA o 'otro' como fallback
      tipo_inmueble: ((['casa', 'departamento', 'local_comercial', 'oficina', 'terreno', 'bodega', 'nave_industrial'] as const).find(t => t === datos.tipo_inmueble_detectado) ?? 'otro') as TipoInmueble,
      superficie_terreno: parseNum(datos.superficie_terreno) || parseNum(datos.superficie),
      superficie_construccion: parseNum(datos.superficie_construccion),
      valor_estimado: parseNum(datos.valor_estimado),
      moneda: 'MXN',
      uso_suelo: usoSueloPayload || datos.uso_suelo_detectado || undefined,
      uso_suelo_auto: usoSueloAuto,
      // Datos extraídos por IA → campos SHF (auto-fill completo)
      propietario: datos.propietario || undefined,
      solicitante: datos.solicitante || undefined,
      cuenta_predial: datos.cuenta_predial || datos.clave_catastral || undefined,
      regimen_propiedad: datos.regimen_propiedad || undefined,
      documentacion_analizada: datos.documentacion_analizada || resultadoIA.documentos
        .map((d) => `${d.nombre}: ${d.tipo_detectado}${d.valido ? ' ✓' : ' ✗'}`)
        .join('; ') || undefined,
      situacion_legal: datos.situacion_legal || (datos.numero_escritura
        ? `Escritura ${datos.numero_escritura}${datos.notario ? ` ante ${datos.notario}` : ''}${datos.fecha_escritura ? ` del ${datos.fecha_escritura}` : ''}${datos.rpp_folio ? `. RPP Folio: ${datos.rpp_folio}` : ''}`
        : undefined),
      restricciones_servidumbres: datos.restricciones_servidumbres || undefined,
      medidas_colindancias: datos.medidas_colindancias || undefined,
      uso_suelo_detectado: datos.uso_suelo_detectado || undefined,
      edad_inmueble: datos.edad_inmueble ? Number(datos.edad_inmueble) : undefined,
      tipo_inmueble_detectado: datos.tipo_inmueble_detectado || undefined,
      valor_catastral: datos.valor_catastral ? Number(String(datos.valor_catastral).replace(/[^0-9.]/g, '')) : undefined,
      // Descripción del inmueble
      descripcion_fisica: datos.descripcion_fisica || undefined,
      construcciones: datos.construcciones || undefined,
      instalaciones: datos.instalaciones || undefined,
      estado_conservacion: datos.estado_conservacion || undefined,
      topografia_forma: datos.topografia_forma || undefined,
      num_recamaras: datos.num_recamaras ? Number(datos.num_recamaras) : undefined,
      num_banos: datos.num_banos ? Number(datos.num_banos) : undefined,
      num_estacionamientos: datos.num_estacionamientos ? Number(datos.num_estacionamientos) : undefined,
      // Características urbanas
      clasificacion_zona: datos.clasificacion_zona || undefined,
      uso_predominante: datos.uso_predominante || undefined,
      tipo_zona: datos.tipo_zona || undefined,
      cuenta_agua: datos.cuenta_agua || undefined,
      // Folios
      folio_infonavit: datos.folio_infonavit || undefined,
      clave_unica_vivienda: datos.clave_unica_vivienda || undefined,
      // Legacy fields (para compatibilidad)
      propietario_nombre: datos.propietario || undefined,
      clave_catastral: datos.clave_catastral || undefined,
      // Metadata IA (confianza + correcciones humanas para auditoría)
      ia_confianza: resultadoIA.confianza ?? {},
      ia_correcciones: correccionesHumanas,
      // Notas
      notas: [
        esOverride
          ? `[VALIDACIÓN MANUAL DEL VALUADOR — IA bloqueó el expediente]\nMotivo: ${motivoOverride.trim()}\nErrores que reportó la IA:\n${(resultadoIA?.errores_bloqueantes ?? []).map((e) => `  • ${e}`).join('\n')}`
          : null,
        notasRiesgo || null,
        datos.observaciones || null,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined,
    };

    try {
      // PASO 1 — crear avalúo vacío → folio
      const resCrear = await crearAvaluoVacioAction(payload);
      if (!resCrear.exito || !resCrear.avaluo_id) {
        setGuardadoResult({ exito: false, error: resCrear.error || 'No se pudo crear el avalúo.' });
        return;
      }

      const avaluoId = resCrear.avaluo_id;
      const folio = resCrear.folio;
      const supabase = createClient();
      const erroresUpload: string[] = [];

      // PASO 2 — subir archivos a avaluos/{id}/ (re-upload desde memoria del browser)
      // Los archivos originales siguen en docsCustom.file. Es más confiable que
      // storage.copy() que tiene problemas con RLS policies.
      const subidosOk: { docId: string; docNombre: string; storagePath: string; contentType: string; tamanio: number; categoria?: 'uso_suelo' }[] = [];

      const docsConArchivo = docsCustom
        .filter((d): d is DocCustom & { file: File } => !!d.file && !!d.nombre.trim());

      for (const doc of docsConArchivo) {
        const ext = (doc.file.name.split('.').pop() || '').toLowerCase();
        const contentType = doc.file.type || 'application/octet-stream';
        const finalPath = `avaluos/${avaluoId}/${doc.id}-${Date.now()}.${ext}`;

        const { error: errUpload } = await supabase.storage
          .from('documentos')
          .upload(finalPath, doc.file, { contentType, upsert: false });

        if (errUpload) {
          erroresUpload.push(`${doc.nombre}: ${errUpload.message}`);
          continue;
        }

        subidosOk.push({
          docId: doc.id,
          docNombre: doc.nombre.trim(),
          storagePath: finalPath,
          contentType,
          tamanio: doc.file.size,
        });
      }

      // Limpiar archivos temporales (best-effort)
      for (const temp of archivosTemp) {
        await supabase.storage.from('documentos').remove([temp.storagePath]);
      }

      // Subir uso de suelo si aplica
      if (!inmuebleEnQro && usoSueloFile) {
        const ext = (usoSueloFile.name.split('.').pop() || '').toLowerCase();
        const contentType = usoSueloFile.type || 'application/octet-stream';
        const storagePath = `avaluos/${avaluoId}/uso-suelo-${Date.now()}.${ext}`;
        const { error: errUpload } = await supabase.storage
          .from('documentos')
          .upload(storagePath, usoSueloFile, { contentType, upsert: false });
        if (errUpload) {
          erroresUpload.push(`Uso de suelo: ${errUpload.message}`);
        } else {
          subidosOk.push({
            docId: 'uso-suelo',
            docNombre: 'Acreditación de uso de suelo (imagen)',
            storagePath,
            contentType,
            tamanio: usoSueloFile.size,
            categoria: 'uso_suelo',
          });
        }
      }

      // PASO 3 — registrar docs en tabla
      if (subidosOk.length > 0) {
        const resRegistro = await registrarDocumentosAction(avaluoId, subidosOk);
        if (!resRegistro.exito) {
          erroresUpload.push(`Registro de documentos falló: ${resRegistro.error}`);
        }
      }

      if (erroresUpload.length > 0) {
        setGuardadoResult({
          exito: true,
          avaluo_id: avaluoId,
          folio,
          error: `Avalúo guardado (${folio}), pero algunos archivos fallaron:\n${erroresUpload.join('\n')}`,
        });
      } else {
        setGuardadoResult({ exito: true, avaluo_id: avaluoId, folio });
      }
    } catch (err) {
      console.error('ejecutarGuardado — error:', err);
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al guardar.';
      setGuardadoResult({ exito: false, error: `No se pudo guardar: ${mensaje}` });
    } finally {
      setGuardando(false);
    }
  };

  // handleGuardar: override manual (IA bloqueó pero valuador fuerza).
  // En este caso también se abre el paso de confirmación para que el valuador
  // revise/corrija los datos que la IA alcanzó a extraer antes de crear el expediente.
  const handleGuardar = async () => {
    if (!validacionManual || !tipoAvaluo || !resultado) return;
    setMostrandoConfirmacion(true);
  };

  const limpiarTodo = () => {
    setTipoAvaluo('');
    setBancoSeleccionado('');
    setDocsCustom([]);
    setResultado(null);
    setValorBase('');
    setNotasRiesgo('');
    setGuardadoResult(null);
    setValidacionManual(false);
    setMotivoOverride('');
    setMostrandoConfirmacion(false);
    resetUsoSuelo();
  };

  // Estado del badge
  const badgeEstado = () => {
    if (guardadoResult?.exito) return { label: 'Guardado', color: 'bg-emerald-500' };
    if (validacionManual) return { label: '⚠ OVERRIDE MANUAL', color: 'bg-red-600 animate-pulse' };
    if (resultado?.valido) return { label: 'En Proceso', color: 'bg-blue-500' };
    if (resultado && !resultado.valido) return { label: 'Bloqueado', color: 'bg-red-500' };
    if (tipoAvaluo) return { label: 'Pendiente', color: 'bg-amber-400' };
    return null;
  };
  const badge = badgeEstado();

  return (
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Paso obligatorio: revisar y corregir datos de la IA antes de crear el expediente */}
        {mostrandoConfirmacion && resultado && (
          <ConfirmacionDatosIA
            datosIA={resultado.datos_consolidados as unknown as DatosIA}
            confianza={resultado.confianza ?? {}}
            onConfirmar={handleConfirmacionUsuario}
            onCancelar={handleCancelarConfirmacion}
            cargando={guardando}
          />
        )}

        <ValuadorTopbar paginaActiva="Avalúos" />

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

                    {/* Selector de banco (solo Crédito Bancario) */}
                    {tipoAvaluo === '2.0' && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Selecciona tu banco
                        </p>
                        <div className="relative" ref={bancoDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setBancoDropdownAbierto((v) => !v)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                              bancoSeleccionado
                                ? 'border-[#0F172A] bg-slate-50'
                                : 'border-slate-100 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className={`text-sm font-semibold ${bancoSeleccionado ? 'text-slate-700' : 'text-slate-400'}`}>
                              {bancoSeleccionado === BANCO_OTRO
                                ? '¿No encuentras tu banco?'
                                : bancoActual
                                ? bancoActual.nombre
                                : bancosCargando
                                ? 'Cargando bancos…'
                                : 'Seleccionar banco'}
                            </span>
                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform ${bancoDropdownAbierto ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {bancoDropdownAbierto && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-xl shadow-lg overflow-hidden z-20">
                              {bancosCargando ? (
                                <div className="px-4 py-3 text-xs font-semibold text-slate-400">
                                  Cargando bancos…
                                </div>
                              ) : bancos.length === 0 ? (
                                <div className="px-4 py-3 text-xs font-semibold text-slate-400">
                                  No hay bancos registrados
                                </div>
                              ) : (
                                bancos.map((b, i) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => { handleBancoChange(b.id); setBancoDropdownAbierto(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition ${i > 0 ? 'border-t border-slate-100' : ''} ${bancoSeleccionado === b.id ? 'bg-slate-50' : ''}`}
                                  >
                                    <span className="text-sm font-semibold text-slate-700">
                                      {b.nombre}
                                    </span>
                                    {bancoSeleccionado === b.id && (
                                      <div className="w-5 h-5 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                    )}
                                  </button>
                                ))
                              )}
                              {/* Opción fija: modo libre */}
                              <button
                                type="button"
                                onClick={() => { handleBancoChange(BANCO_OTRO); setBancoDropdownAbierto(false); }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition border-t border-slate-100 ${bancoSeleccionado === BANCO_OTRO ? 'bg-slate-50' : ''}`}
                              >
                                <span className="text-sm font-semibold italic text-slate-500">
                                  ¿No encuentras tu banco?
                                </span>
                                {bancoSeleccionado === BANCO_OTRO && (
                                  <div className="w-5 h-5 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2: Documentos */}
                {mostrarPasoDocumentos && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                          <h2 className="font-bold text-slate-900 text-sm">Documentos del Expediente</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                          {archivosSubidos}/{totalDocs || '—'}
                        </span>
                      </div>

                      {/* Lista unificada de documentos: siempre editable.
                          Los slots vienen precargados según tipo/banco pero
                          el valuador puede renombrarlos, agregarlos o borrarlos. */}
                      <div className="space-y-2">
                        {docsCustom.length === 0 && (
                          <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-400 font-semibold">
                              Agrega los documentos del expediente
                            </p>
                          </div>
                        )}
                        {docsCustom.map((doc) => {
                          const docRes = resultado?.documentos?.find((d) => d.id === doc.id);
                          const arrastrandoEste = dragId === doc.id;
                          const dragOverEste = dragOverId === doc.id && dragId !== doc.id;
                          return (
                            <div
                              key={doc.id}
                              draggable
                              onDragStart={(e) => {
                                setDragId(doc.id);
                                e.dataTransfer.effectAllowed = 'move';
                                // Necesario en Firefox para que el drag arranque
                                e.dataTransfer.setData('text/plain', doc.id);
                              }}
                              onDragEnter={() => setDragOverId(doc.id)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDragLeave={(e) => {
                                // Solo quitar el highlight si el cursor sale del card completo,
                                // no cuando entra a un hijo
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  setDragOverId((curr) => (curr === doc.id ? null : curr));
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData('text/plain') || dragId;
                                if (sourceId) reordenarDocCustom(sourceId, doc.id);
                                setDragId(null);
                                setDragOverId(null);
                              }}
                              onDragEnd={() => {
                                setDragId(null);
                                setDragOverId(null);
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-move ${
                                arrastrandoEste
                                  ? 'opacity-40 border-blue-300 bg-blue-50'
                                  : dragOverEste
                                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                                  : docRes
                                  ? docRes.valido
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-red-200 bg-red-50'
                                  : doc.file
                                  ? 'border-slate-200 bg-slate-50'
                                  : 'border-slate-100 bg-white'
                              }`}
                            >
                              {/* Drag handle visual (6 puntos verticales) */}
                              <div className="text-slate-300 hover:text-slate-500 transition shrink-0" aria-label="Arrastrar para reordenar">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 10a1 1 0 11-2 0 1 1 0 012 0zM7 16a1 1 0 11-2 0 1 1 0 012 0zM15 4a1 1 0 11-2 0 1 1 0 012 0zM15 10a1 1 0 11-2 0 1 1 0 012 0zM15 16a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                              </div>
                              <IconPDF />
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={doc.nombre}
                                  onChange={(e) => actualizarDocCustomNombre(doc.id, e.target.value)}
                                  placeholder="Nombre del documento"
                                  className="w-full text-xs font-bold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-400 placeholder:font-semibold"
                                />
                                {doc.file && (
                                  <p className="text-[10px] text-slate-400 truncate">{doc.file.name}</p>
                                )}
                                {docRes && docRes.tipo_coincide === false && docRes.tipo_detectado && (
                                  <p className="text-[10px] text-red-600 font-black truncate">
                                    ✗ Tipo detectado: {docRes.tipo_detectado}
                                  </p>
                                )}
                                {docRes && !docRes.valido && docRes.errores?.[0] && (
                                  <p className="text-[10px] text-red-500 font-semibold truncate">⚠ {docRes.errores[0]}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {docRes?.valido && (
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                )}
                                <input
                                  type="file"
                                  accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.xlsx,.xls"
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                  onChange={(e) => actualizarDocCustomFile(doc.id, e.target.files?.[0] || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRefs.current[doc.id]?.click()}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                                    doc.file
                                      ? 'text-slate-600 border border-slate-300 hover:bg-slate-100'
                                      : 'text-blue-600 border border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  {doc.file ? 'Cambiar' : 'Subir archivo'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminarDocCustom(doc.id)}
                                  className="text-slate-400 hover:text-red-500 transition p-1"
                                  aria-label="Eliminar documento"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={agregarDocCustom}
                          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-600 border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-xl py-3 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          Agregar documento
                        </button>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                          style={{ width: `${totalDocs > 0 ? (archivosSubidos / totalDocs) * 100 : 0}%` }}
                        />
                      </div>

                      {/* Botón validar con IA */}
                      <button
                        onClick={handleAnalizarAvaluo}
                        disabled={!todosSubidos || analizando}
                        className={`mt-4 w-full text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider ${
                          todosSubidos && !analizando
                            ? 'bg-gradient-to-r from-[#0F172A] to-[#1E40AF] hover:from-[#1E293B] hover:to-[#1D4ED8] text-white shadow-md hover:shadow-lg'
                            : analizando
                            ? 'bg-[#0F172A] text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {analizando ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            ANALIZANDO CON IA…
                          </>
                        ) : todosSubidos ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                            </svg>
                            ANALIZAR CON IA
                          </>
                        ) : docsCustom.length === 0 ? (
                          'AGREGA AL MENOS UN DOCUMENTO'
                        ) : (
                          `FALTAN ${totalDocs - archivosSubidos} DOCUMENTO(S)`
                        )}
                      </button>
                    </div>

                    {/* Errores bloqueantes */}
                    {resultado && !resultado.valido && (resultado.errores_bloqueantes?.length ?? 0) > 0 && (
                      <div className="border-t border-red-100 bg-red-50 px-5 py-4">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">⚠ Expediente Bloqueado</p>
                        {resultado.errores_bloqueantes!.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 font-semibold leading-snug">• {err}</p>
                        ))}
                      </div>
                    )}

                    {/* Override manual del valuador (solo si la IA bloqueó y aún no se anuló) */}
                    {resultado && !resultado.valido && !validacionManual && (
                      <div className="border-t-4 border-dashed border-red-300 bg-gradient-to-br from-red-50 to-orange-50 px-5 py-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 shadow-lg shadow-red-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black text-red-700 uppercase tracking-widest leading-tight">
                              Anular validación de la IA
                            </p>
                            <p className="text-[11px] text-red-600/90 leading-snug mt-1">
                              Esta acción <span className="font-black underline">no es estándar</span>. Solo úsala si tienes
                              contexto verificable que la IA no puede ver. <span className="font-black">Tu nombre, motivo
                              y los errores que reportó la IA quedarán registrados permanentemente</span> en el expediente
                              y serán visibles para el controlador.
                            </p>
                          </div>
                        </div>
                        <label className="block text-[10px] font-black text-red-700 uppercase tracking-widest mb-1.5">
                          Motivo (opcional pero recomendado)
                        </label>
                        <textarea
                          value={motivoOverride ?? ''}
                          onChange={(e) => setMotivoOverride(e.target.value)}
                          placeholder="Ej: 'Verifiqué con el cliente que es la misma persona, los apellidos están en distinto orden en el Título vs la Boleta Predial.'"
                          rows={3}
                          className="w-full text-xs text-slate-800 bg-white border-2 border-red-300 rounded-lg px-3 py-2.5 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500 resize-none font-medium block"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // Si no escribió motivo, ponemos un default explícito en el registro
                            if (!motivoOverride.trim()) {
                              setMotivoOverride('Validación manual sin motivo especificado por el valuador.');
                            }
                            setValidacionManual(true);
                          }}
                          className="mt-3 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-lg transition shadow-lg shadow-red-300/50 border-2 border-red-700 cursor-pointer"
                        >
                          ⚠ DAR LUZ VERDE BAJO MI RESPONSABILIDAD
                        </button>
                      </div>
                    )}

                    {/* Banner: validación manual activa — visualmente RUIDOSO para que sea obvio */}
                    {validacionManual && (
                      <div className="border-t-4 border-double border-red-500 bg-red-600 px-5 py-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2L1 21h22L12 2zm0 6l7.53 13H4.47L12 8zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                            </svg>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">
                              OVERRIDE MANUAL ACTIVO
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setValidacionManual(false); setMotivoOverride(''); }}
                            className="text-[9px] font-black text-white/90 hover:text-white bg-red-800 hover:bg-red-900 border border-red-900 px-2.5 py-1 rounded uppercase tracking-widest shrink-0"
                          >
                            Anular
                          </button>
                        </div>
                        <div className="bg-red-50 border-2 border-red-300 border-dashed rounded-lg p-3">
                          <p className="text-[9px] font-black text-red-700 uppercase tracking-widest mb-1">
                            Motivo del valuador
                          </p>
                          <p className="text-[11px] text-red-900 leading-snug whitespace-pre-wrap break-words font-semibold">
                            {motivoOverride}
                          </p>
                        </div>
                        <p className="text-[9px] text-white/80 font-bold mt-2 text-center uppercase tracking-widest">
                          Este expediente quedará marcado en el registro
                        </p>
                      </div>
                    )}

                    {/* Éxito de validación de la IA (sin override) */}
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
                <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition ${
                  validacionManual
                    ? 'border-4 border-dashed border-red-500 shadow-red-200/50 ring-4 ring-red-100'
                    : 'border border-slate-200'
                }`}>

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
                  <div className={`rounded-2xl border ${
                    guardadoResult.exito
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {guardadoResult.exito ? (
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-black text-emerald-700">✓ Avalúo guardado</p>
                          {guardadoResult.folio && (
                            <p className="mt-0.5 text-[10px] text-emerald-700/80 font-semibold">
                              Folio: <span className="font-black">{guardadoResult.folio}</span>
                            </p>
                          )}
                          <p className="mt-2 text-[10px] text-emerald-700/80 leading-snug">
                            Estado actual: <span className="font-black">CAPTURA</span>. El siguiente paso es
                            agendar la visita al inmueble desde el detalle del expediente.
                          </p>
                        </div>

                        {guardadoResult.avaluo_id && (
                          <Link
                            href={`/dashboard/valuador/expedientes/${guardadoResult.avaluo_id}`}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow shadow-emerald-200/50"
                          >
                            Continuar al expediente
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={limpiarTodo}
                          className="w-full text-[10px] font-bold text-emerald-700/70 hover:text-emerald-900 uppercase tracking-widest underline"
                        >
                          O crear otro avalúo
                        </button>
                      </div>
                    ) : (
                      <p className="p-4 text-xs font-semibold text-red-700">✗ {guardadoResult.error}</p>
                    )}
                  </div>
                )}

                {/* Uso de suelo (después de validación con IA o de override manual) */}
                {validacionAprobada && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Uso de suelo {validacionManual && <span className="text-red-500 normal-case font-semibold">(opcional en override)</span>}
                      </p>
                      {inmuebleEnQro ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          QUERÉTARO • AUTOMÁTICO
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          FUERA DE QRO • SUBE IMAGEN
                        </span>
                      )}
                    </div>

                    {inmuebleEnQro ? (
                      <>
                        {usosSueloQro.length === 0 ? (
                          <p className="text-xs text-slate-400 font-semibold">
                            El catálogo de usos de suelo de Querétaro está vacío. El administrador debe poblarlo.
                          </p>
                        ) : (
                          <select
                            value={usoSueloSeleccionado}
                            onChange={(e) => setUsoSueloSeleccionado(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:border-[#0F172A] focus:bg-white outline-none"
                          >
                            <option value="">Seleccionar uso de suelo…</option>
                            {usosSueloQro.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.clave} — {u.nombre}
                              </option>
                            ))}
                          </select>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <input
                          ref={usoSueloFileRef}
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={(e) => setUsoSueloFile(e.target.files?.[0] || null)}
                        />
                        {usoSueloFile ? (
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{usoSueloFile.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {(usoSueloFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => usoSueloFileRef.current?.click()}
                              className="text-[10px] font-bold text-slate-600 border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition shrink-0"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => usoSueloFileRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl py-4 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Subir imagen de uso de suelo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Botón guardar: solo visible para override manual o durante guardado automático */}
                {(guardando || guardadoResult || validacionManual) && (
                  <button
                    onClick={handleGuardar}
                    disabled={Boolean(!validacionManual || guardando || guardadoResult?.exito === true)}
                    className={`w-full disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs py-4 rounded-2xl transition flex items-center justify-center gap-2 tracking-widest shadow-lg ${
                      validacionManual && !guardadoResult?.exito
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-300/50 border-2 border-red-700'
                        : guardadoResult?.exito
                        ? 'bg-green-600'
                        : 'bg-[#0F172A] hover:bg-slate-700 shadow-slate-900/20'
                    }`}
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
                      `FOLIO ${guardadoResult.folio ?? ''} GUARDADO`
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        GUARDAR CON OVERRIDE
                      </>
                    )}
                  </button>
                )}

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