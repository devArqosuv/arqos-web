// =============================================================
// Motor regulatorio SHF — validador de avalúos
// =============================================================
//
// Recibe un objeto `avaluo` (+ sus comparables) y aplica las reglas
// derivadas de las "Reglas de Carácter General SHF" (normativa pública).
// Devuelve una lista ordenada de errores/warnings y el progreso
// (`camposCompletos` / `camposTotal`) respecto al subset que el motor
// verifica explícitamente (ver `CAMPOS_SHF_VERIFICADOS` en `types.ts`).
//
// Este motor NO reemplaza la validación XSD de la WS SHF — su objetivo
// es atrapar problemas estructurales ANTES de intentar subir el XML.
// =============================================================

import {
  AvaluoSHF,
  CAMPOS_SHF_VERIFICADOS,
  ComparableSHF,
  ErrorValidacionSHF,
  ValidacionSHF,
} from './types';

// ── Helpers ────────────────────────────────────────────────────────

function isBlankString(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim().length === 0);
}

function isMissingNumber(v: unknown): boolean {
  return v === null || v === undefined || Number.isNaN(Number(v));
}

function isPositiveNumber(v: unknown): boolean {
  if (isMissingNumber(v)) return false;
  return Number(v) > 0;
}

// Cuenta cuántos de los campos en `CAMPOS_SHF_VERIFICADOS` tienen un
// valor presente (string no vacío, número finito, boolean true, fecha
// presente). Se usa para reportar cobertura en la UI.
function contarCamposCompletos(avaluo: AvaluoSHF): number {
  let total = 0;
  for (const campo of CAMPOS_SHF_VERIFICADOS) {
    const valor = avaluo[campo];
    if (typeof valor === 'string' && valor.trim().length > 0) total++;
    else if (typeof valor === 'number' && Number.isFinite(valor)) total++;
    else if (typeof valor === 'boolean' && valor) total++;
  }
  return total;
}

function direccionCompleta(avaluo: AvaluoSHF): boolean {
  return (
    !isBlankString(avaluo.calle) &&
    !isBlankString(avaluo.municipio) &&
    !isBlankString(avaluo.estado_inmueble) &&
    !isBlankString(avaluo.colonia) &&
    !isBlankString(avaluo.cp)
  );
}

// ── Reglas duras (errores) ─────────────────────────────────────────

interface ReglaObligatoriaDura {
  campo: string;
  falta: (a: AvaluoSHF) => boolean;
  mensaje: string;
}

const REGLAS_DURAS: ReglaObligatoriaDura[] = [
  { campo: 'folio',                     falta: (a) => isBlankString(a.folio),                     mensaje: 'Folio requerido.' },
  { campo: 'propietario',               falta: (a) => isBlankString(a.propietario),               mensaje: 'Propietario requerido.' },
  { campo: 'direccion',                 falta: (a) => !direccionCompleta(a),                      mensaje: 'Dirección completa (calle, colonia, municipio, estado, CP) requerida.' },
  // NOTA: la DB aún no tiene columna `clave_catastral`; el análogo SHF
  // es `cuenta_predial`. Cuando SHF exija una clave catastral formal,
  // se mapeará a la columna que corresponda.
  { campo: 'cuenta_predial',            falta: (a) => isBlankString(a.cuenta_predial),            mensaje: 'Cuenta predial / clave catastral requerida.' },
  { campo: 'superficie_terreno',        falta: (a) => !isPositiveNumber(a.superficie_terreno),    mensaje: 'Superficie de terreno requerida (> 0).' },
  { campo: 'superficie_construccion',   falta: (a) => !isPositiveNumber(a.superficie_construccion), mensaje: 'Superficie de construcción requerida (> 0).' },
  { campo: 'tipo_inmueble',             falta: (a) => isBlankString(a.tipo_inmueble),             mensaje: 'Tipo de inmueble requerido.' },
  { campo: 'valor_unitario',            falta: (a) => !isPositiveNumber(a.valor_unitario),        mensaje: 'Valor unitario requerido (> 0).' },
  { campo: 'valor_construcciones',      falta: (a) => !isPositiveNumber(a.valor_construcciones),  mensaje: 'Valor de construcciones requerido (> 0).' },
  { campo: 'valor_fisico_total',        falta: (a) => !isPositiveNumber(a.valor_fisico_total),    mensaje: 'Valor físico total requerido (> 0).' },
  { campo: 'resultado_mercado',         falta: (a) => isBlankString(a.resultado_mercado),         mensaje: 'Resultado del enfoque de mercado requerido.' },
  { campo: 'conciliacion_ponderacion',  falta: (a) => isBlankString(a.conciliacion_ponderacion),  mensaje: 'Ponderación de conciliación requerida.' },
  { campo: 'conciliacion_justificacion',falta: (a) => isBlankString(a.conciliacion_justificacion),mensaje: 'Justificación de conciliación requerida.' },
  { campo: 'declaracion_alcance',       falta: (a) => isBlankString(a.declaracion_alcance),       mensaje: 'Declaración de alcance requerida.' },
  { campo: 'declaracion_supuestos',     falta: (a) => isBlankString(a.declaracion_supuestos),     mensaje: 'Declaración de supuestos requerida.' },
  { campo: 'declaracion_limitaciones',  falta: (a) => isBlankString(a.declaracion_limitaciones),  mensaje: 'Declaración de limitaciones requerida.' },
  { campo: 'valor_uv',                  falta: (a) => !isPositiveNumber(a.valor_uv),              mensaje: 'Valor UV requerido (> 0).' },
  { campo: 'firmado_uv',                falta: (a) => !a.firmado_uv,                              mensaje: 'Firma de la UV requerida.' },
  { campo: 'firmado_valuador',          falta: (a) => !a.firmado_valuador,                        mensaje: 'Firma del valuador requerida.' },
  { campo: 'fecha_firma_uv',            falta: (a) => isBlankString(a.fecha_firma_uv),            mensaje: 'Fecha de firma UV requerida.' },
  { campo: 'fecha_firma_valuador',      falta: (a) => isBlankString(a.fecha_firma_valuador),      mensaje: 'Fecha de firma del valuador requerida.' },
];

// ── Reglas suaves (warnings) ───────────────────────────────────────

interface ReglaObligatoriaSuave {
  campo: string;
  falta: (a: AvaluoSHF) => boolean;
  mensaje: string;
}

const REGLAS_SUAVES: ReglaObligatoriaSuave[] = [
  {
    campo: 'cap_valor',
    // Solo aplica si el avalúo declara ingresos en el enfoque de
    // capitalización. Si hay `cap_ingresos` o `cap_tasa` pero no
    // `cap_valor`, levantamos warning.
    falta: (a) =>
      (isPositiveNumber(a.cap_ingresos) || isPositiveNumber(a.cap_tasa)) &&
      !isPositiveNumber(a.cap_valor),
    mensaje: 'El enfoque de capitalización tiene ingresos o tasa pero falta el valor capitalizado.',
  },
  { campo: 'folio_infonavit',  falta: (a) => isBlankString(a.folio_infonavit),  mensaje: 'Folio Infonavit no capturado (requerido para avalúos Infonavit).' },
  { campo: 'valor_catastral',  falta: (a) => !isPositiveNumber(a.valor_catastral), mensaje: 'Valor catastral no capturado.' },
];

// ── Validador principal ────────────────────────────────────────────

export function validarAvaluoParaSHF(
  avaluo: AvaluoSHF,
  comparables: ComparableSHF[] = [],
): ValidacionSHF {
  const errores: ErrorValidacionSHF[] = [];

  for (const regla of REGLAS_DURAS) {
    if (regla.falta(avaluo)) {
      errores.push({ campo: regla.campo, mensaje: regla.mensaje, nivel: 'error' });
    }
  }

  for (const regla of REGLAS_SUAVES) {
    if (regla.falta(avaluo)) {
      errores.push({ campo: regla.campo, mensaje: regla.mensaje, nivel: 'warning' });
    }
  }

  // ── Validaciones de negocio ──
  if (
    isPositiveNumber(avaluo.superficie_terreno) &&
    isPositiveNumber(avaluo.superficie_construccion) &&
    Number(avaluo.superficie_construccion) > Number(avaluo.superficie_terreno)
  ) {
    errores.push({
      campo: 'superficie_construccion',
      mensaje: 'La superficie de construcción es mayor que la de terreno — revisar.',
      nivel: 'warning',
    });
  }

  if (!isBlankString(avaluo.conciliacion_ponderacion)) {
    // Si hay ponderación, debe ser parseable como número (0-100 o
    // formato "50/30/20"). Solo revisamos que contenga dígitos.
    const pond = String(avaluo.conciliacion_ponderacion);
    if (!/\d/.test(pond)) {
      errores.push({
        campo: 'conciliacion_ponderacion',
        mensaje: 'La ponderación de conciliación debe contener números.',
        nivel: 'error',
      });
    }
  }

  // Comparables: al menos 3 aprobados para que el enfoque de mercado sea válido.
  const aprobados = comparables.filter((c) => c.estado === 'aprobado').length;
  if (aprobados < 3) {
    errores.push({
      campo: 'comparables',
      mensaje: `Se requieren al menos 3 comparables aprobados (hay ${aprobados}).`,
      nivel: aprobados === 0 ? 'error' : 'warning',
    });
  }

  const camposTotal = CAMPOS_SHF_VERIFICADOS.length;
  const camposCompletos = contarCamposCompletos(avaluo);

  const valido = !errores.some((e) => e.nivel === 'error');

  return { valido, errores, camposCompletos, camposTotal };
}
