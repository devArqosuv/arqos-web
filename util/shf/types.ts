// =============================================================
// Tipos compartidos del motor regulatorio SHF
// =============================================================
//
// Nota: `AvaluoSHF` NO reusa `Avaluo` de `types/arqos.ts` porque los
// campos SHF de la migración 10 no están aún reflejados en ese tipo.
// Definimos aquí una forma mínima que cubre los 50 campos SHF + los
// campos base (folio, dirección, superficies, firmas) que necesita el
// validador y el generador de XML.
// =============================================================

export type EstadoComparable = 'pendiente' | 'aprobado' | 'rechazado';

export interface ComparableSHF {
  id: string;
  avaluo_id: string | null;
  calle: string | null;
  colonia: string | null;
  municipio: string | null;
  estado_inmueble: string | null;
  tipo_inmueble: string | null;
  tipo: string | null;
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  precio: number | null;
  precio_m2: number | null;
  moneda: string | null;
  fuente: string | null;
  url_fuente: string | null;
  fecha_publicacion: string | null;
  estado: EstadoComparable | null;
  notas: string | null;
}

// Forma que usan el validador y el generador de XML — un subset de la
// tabla `avaluos` con todos los campos SHF y las firmas.
export interface AvaluoSHF {
  // Identificación y metadata básica
  id: string;
  folio: string | null;
  estado: string;
  moneda: string | null;
  fecha_solicitud: string | null;
  fecha_aprobacion: string | null;

  // Dirección
  calle: string | null;
  numero_ext: string | null;
  numero_int: string | null;
  colonia: string | null;
  municipio: string | null;
  estado_inmueble: string | null;
  cp: string | null;
  lat: number | null;
  lng: number | null;

  // Inmueble
  tipo_inmueble: string | null;
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  num_recamaras: number | null;
  num_banos: number | null;
  num_estacionamientos: number | null;
  edad_inmueble: number | null;

  // Valores base
  valor_estimado: number | null;
  valor_terreno: number | null;
  valor_construccion: number | null;

  // Preavalúo / firmas
  valor_uv: number | null;
  valor_valuador: number | null;
  firmado_uv: boolean | null;
  firmado_valuador: boolean | null;
  fecha_firma_uv: string | null;
  fecha_firma_valuador: string | null;

  // Uso de suelo (del catálogo Qro o texto libre)
  uso_suelo: string | null;

  // ── Campos SHF migración 10 — 50 columnas ──
  // Identificación y folios adicionales
  folio_infonavit: string | null;
  clave_unica_vivienda: string | null;
  clave_avaluo: string | null;
  vigencia: string | null;
  unidad_valuacion: string | null;

  // Datos catastrales y legales
  cuenta_predial: string | null;
  cuenta_agua: string | null;
  regimen_propiedad: string | null;
  propietario: string | null;
  solicitante: string | null;

  // Marco legal y documental
  documentacion_analizada: string | null;
  situacion_legal: string | null;
  restricciones_servidumbres: string | null;

  // Características urbanas
  clasificacion_zona: string | null;
  infraestructura: string | null;
  servicios_urbanos: string | null;
  equipamiento: string | null;
  vialidades: string | null;
  construccion_predominante: string | null;
  vias_acceso: string | null;
  uso_predominante: string | null;

  // Descripción del inmueble
  topografia_forma: string | null;
  descripcion_fisica: string | null;
  construcciones: string | null;
  instalaciones: string | null;
  estado_conservacion: string | null;

  // Entorno y análisis urbano
  tipo_zona: string | null;
  uso_legal: string | null;
  uso_fisico: string | null;
  uso_financiero: string | null;
  uso_optimo: string | null;

  // Análisis de mercado
  investigacion_mercado: string | null;
  rango_valores: string | null;
  homologacion: string | null;
  resultado_mercado: string | null;
  valor_unitario: number | null;

  // Enfoque físico
  valor_construcciones: number | null;
  depreciacion: number | null;
  valor_fisico_total: number | null;

  // Enfoque de capitalización
  cap_ingresos: number | null;
  cap_tasa: number | null;
  cap_valor: number | null;

  // Conciliación
  conciliacion_comparacion: string | null;
  conciliacion_ponderacion: string | null;
  conciliacion_justificacion: string | null;

  // Declaraciones
  declaracion_alcance: string | null;
  declaracion_supuestos: string | null;
  declaracion_limitaciones: string | null;

  // Elementos descriptivos
  medidas_colindancias: string | null;
  croquis_localizacion: string | null;

  // Valor catastral (campo separado, referenciado por la IA)
  valor_catastral: number | null;
}

export type NivelValidacion = 'error' | 'warning';

export interface ErrorValidacionSHF {
  campo: string;
  mensaje: string;
  nivel: NivelValidacion;
}

export interface ValidacionSHF {
  valido: boolean;
  errores: ErrorValidacionSHF[];
  camposCompletos: number;
  camposTotal: number;
}

// Lista de columnas que el validador "cuenta" contra `camposTotal`.
// Se usa tanto para reportar progreso como para documentar qué campos
// SHF se verifican en el motor.
export const CAMPOS_SHF_VERIFICADOS: readonly (keyof AvaluoSHF)[] = [
  // Identificación y dirección
  'folio',
  'propietario',
  'solicitante',
  'calle',
  'numero_ext',
  'colonia',
  'municipio',
  'estado_inmueble',
  'cp',
  // Catastral y legal
  'cuenta_predial',
  'regimen_propiedad',
  'documentacion_analizada',
  'situacion_legal',
  'restricciones_servidumbres',
  'medidas_colindancias',
  'valor_catastral',
  // Folios adicionales
  'folio_infonavit',
  'clave_unica_vivienda',
  'clave_avaluo',
  'vigencia',
  'unidad_valuacion',
  // Inmueble
  'tipo_inmueble',
  'superficie_terreno',
  'superficie_construccion',
  'num_recamaras',
  'num_banos',
  'num_estacionamientos',
  'edad_inmueble',
  'topografia_forma',
  'descripcion_fisica',
  'construcciones',
  'instalaciones',
  'estado_conservacion',
  'cuenta_agua',
  // Urbano
  'clasificacion_zona',
  'infraestructura',
  'servicios_urbanos',
  'equipamiento',
  'vialidades',
  'construccion_predominante',
  'vias_acceso',
  'uso_predominante',
  'tipo_zona',
  'uso_legal',
  'uso_fisico',
  'uso_financiero',
  'uso_optimo',
  'uso_suelo',
  // Mercado
  'investigacion_mercado',
  'rango_valores',
  'homologacion',
  'resultado_mercado',
  'valor_unitario',
  // Físico
  'valor_construcciones',
  'depreciacion',
  'valor_fisico_total',
  // Capitalización
  'cap_ingresos',
  'cap_tasa',
  'cap_valor',
  // Conciliación
  'conciliacion_comparacion',
  'conciliacion_ponderacion',
  'conciliacion_justificacion',
  // Declaraciones
  'declaracion_alcance',
  'declaracion_supuestos',
  'declaracion_limitaciones',
  // Firmas
  'valor_uv',
  'firmado_uv',
  'firmado_valuador',
  'fecha_firma_uv',
  'fecha_firma_valuador',
];
