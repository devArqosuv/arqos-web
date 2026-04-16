// =============================================================
// Helper de lectura — trae un avalúo + sus comparables con la forma
// que esperan el validador y el generador de XML.
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { AvaluoSHF, ComparableSHF } from './types';

// Lista explícita de columnas — mejor que `*` para que TS sepa qué
// campos esperar. Si agregamos campos SHF más adelante hay que
// añadirlos aquí y en `types.ts`.
const COLUMNAS_AVALUO = [
  'id', 'folio', 'estado', 'moneda', 'fecha_solicitud', 'fecha_aprobacion',
  'calle', 'numero_ext', 'numero_int', 'colonia', 'municipio', 'estado_inmueble', 'cp', 'lat', 'lng',
  'tipo_inmueble', 'superficie_terreno', 'superficie_construccion',
  'num_recamaras', 'num_banos', 'num_estacionamientos', 'edad_inmueble',
  'valor_estimado', 'valor_terreno', 'valor_construccion',
  'valor_uv', 'valor_valuador', 'firmado_uv', 'firmado_valuador',
  'fecha_firma_uv', 'fecha_firma_valuador', 'uso_suelo',
  'folio_infonavit', 'clave_unica_vivienda', 'clave_avaluo', 'vigencia', 'unidad_valuacion',
  'cuenta_predial', 'cuenta_agua', 'regimen_propiedad', 'propietario', 'solicitante',
  'documentacion_analizada', 'situacion_legal', 'restricciones_servidumbres',
  'clasificacion_zona', 'infraestructura', 'servicios_urbanos', 'equipamiento',
  'vialidades', 'construccion_predominante', 'vias_acceso', 'uso_predominante',
  'topografia_forma', 'descripcion_fisica', 'construcciones', 'instalaciones', 'estado_conservacion',
  'tipo_zona', 'uso_legal', 'uso_fisico', 'uso_financiero', 'uso_optimo',
  'investigacion_mercado', 'rango_valores', 'homologacion', 'resultado_mercado', 'valor_unitario',
  'valor_construcciones', 'depreciacion', 'valor_fisico_total',
  'cap_ingresos', 'cap_tasa', 'cap_valor',
  'conciliacion_comparacion', 'conciliacion_ponderacion', 'conciliacion_justificacion',
  'declaracion_alcance', 'declaracion_supuestos', 'declaracion_limitaciones',
  'medidas_colindancias', 'croquis_localizacion', 'valor_catastral',
].join(', ');

export interface AvaluoCargado {
  avaluo: AvaluoSHF;
  comparables: ComparableSHF[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export async function cargarAvaluoConComparables(
  supabase: AnySupabase,
  avaluoId: string,
): Promise<AvaluoCargado | null> {
  const [avaluoRes, comparablesRes] = await Promise.all([
    supabase.from('avaluos').select(COLUMNAS_AVALUO).eq('id', avaluoId).single(),
    supabase
      .from('comparables')
      .select(
        'id, avaluo_id, calle, colonia, municipio, estado_inmueble, tipo_inmueble, tipo, superficie_terreno, superficie_construccion, precio, precio_m2, moneda, fuente, url_fuente, fecha_publicacion, estado, notas',
      )
      .eq('avaluo_id', avaluoId),
  ]);

  if (avaluoRes.error || !avaluoRes.data) return null;

  return {
    avaluo: avaluoRes.data as unknown as AvaluoSHF,
    comparables: (comparablesRes.data ?? []) as unknown as ComparableSHF[],
  };
}
