// =============================================================
// Generador de XML SHF
// =============================================================
//
// Estructura derivada del esquema público de la WS SHF / SMA. El
// bloque comentario en el XML advierte que la estructura es
// provisional hasta contar con los accesos al WSDL oficial.
//
// Importante: NO se usan dependencias externas — sólo string
// building con escapado manual de entidades XML. Esto nos libera de
// conflictos con `xmlbuilder2` u otras libs pesadas.
// =============================================================

import { AvaluoSHF, ComparableSHF } from './types';

// ── Escapado XML ──────────────────────────────────────────────────

function escapeXml(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Genera `<Tag>valor</Tag>` sólo si el valor es presente. Si el valor
// está vacío/null/undefined devuelve string vacío para no ensuciar
// el documento.
function tag(name: string, value: unknown, { emitEmpty = false } = {}): string {
  if (value === null || value === undefined || value === '') {
    return emitEmpty ? `<${name}/>` : '';
  }
  if (typeof value === 'boolean') {
    return `<${name}>${value ? 'true' : 'false'}</${name}>`;
  }
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function formatNumber(v: number | null | undefined): string | null {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
  return Number(v).toFixed(2);
}

function indent(xml: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return xml
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => pad + line)
    .join('\n');
}

// ── Generador principal ───────────────────────────────────────────

export function generarXmlSHF(avaluo: AvaluoSHF, comparables: ComparableSHF[]): string {
  const emisionISO = new Date().toISOString();

  const datosGenerales = [
    tag('Folio', avaluo.folio),
    tag('FolioInfonavit', avaluo.folio_infonavit),
    tag('ClaveUnicaVivienda', avaluo.clave_unica_vivienda),
    tag('ClaveAvaluo', avaluo.clave_avaluo),
    tag('Vigencia', avaluo.vigencia),
    tag('UnidadValuacion', avaluo.unidad_valuacion),
    tag('FechaEmision', emisionISO),
    tag('FechaSolicitud', avaluo.fecha_solicitud),
    tag('FechaAprobacion', avaluo.fecha_aprobacion),
    tag('TipoAvaluo', avaluo.tipo_inmueble),
    tag('Propietario', avaluo.propietario),
    tag('Solicitante', avaluo.solicitante),
    tag('RegimenPropiedad', avaluo.regimen_propiedad),
    tag('Moneda', avaluo.moneda ?? 'MXN'),
  ]
    .filter(Boolean)
    .join('\n');

  const ubicacion = [
    tag('Calle', avaluo.calle),
    tag('NumeroExterior', avaluo.numero_ext),
    tag('NumeroInterior', avaluo.numero_int),
    tag('Colonia', avaluo.colonia),
    tag('Municipio', avaluo.municipio),
    tag('Estado', avaluo.estado_inmueble),
    tag('CodigoPostal', avaluo.cp),
    tag('Latitud', avaluo.lat !== null && avaluo.lat !== undefined ? String(avaluo.lat) : null),
    tag('Longitud', avaluo.lng !== null && avaluo.lng !== undefined ? String(avaluo.lng) : null),
    tag('MedidasColindancias', avaluo.medidas_colindancias),
  ]
    .filter(Boolean)
    .join('\n');

  const inmuebleSuperficies = [
    tag('SuperficieTerreno', formatNumber(avaluo.superficie_terreno)),
    tag('SuperficieConstruccion', formatNumber(avaluo.superficie_construccion)),
  ]
    .filter(Boolean)
    .join('\n');

  const inmuebleCaracteristicas = [
    tag('Recamaras', avaluo.num_recamaras),
    tag('Banos', avaluo.num_banos),
    tag('Estacionamientos', avaluo.num_estacionamientos),
    tag('EdadInmueble', avaluo.edad_inmueble),
    tag('TopografiaForma', avaluo.topografia_forma),
    tag('DescripcionFisica', avaluo.descripcion_fisica),
    tag('Construcciones', avaluo.construcciones),
    tag('Instalaciones', avaluo.instalaciones),
    tag('EstadoConservacion', avaluo.estado_conservacion),
    tag('UsoSuelo', avaluo.uso_suelo),
    tag('CuentaAgua', avaluo.cuenta_agua),
  ]
    .filter(Boolean)
    .join('\n');

  const inmueble = [
    tag('Tipo', avaluo.tipo_inmueble),
    `<Superficies>\n${indent(inmuebleSuperficies, 2)}\n</Superficies>`,
    inmuebleCaracteristicas.length > 0
      ? `<Caracteristicas>\n${indent(inmuebleCaracteristicas, 2)}\n</Caracteristicas>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const marcoLegal = [
    tag('CuentaPredial', avaluo.cuenta_predial),
    tag('ValorCatastral', formatNumber(avaluo.valor_catastral)),
    tag('DocumentacionAnalizada', avaluo.documentacion_analizada),
    tag('SituacionLegal', avaluo.situacion_legal),
    tag('RestriccionesServidumbres', avaluo.restricciones_servidumbres),
  ]
    .filter(Boolean)
    .join('\n');

  const analisisUrbano = [
    tag('ClasificacionZona', avaluo.clasificacion_zona),
    tag('TipoZona', avaluo.tipo_zona),
    tag('Infraestructura', avaluo.infraestructura),
    tag('ServiciosUrbanos', avaluo.servicios_urbanos),
    tag('Equipamiento', avaluo.equipamiento),
    tag('Vialidades', avaluo.vialidades),
    tag('ConstruccionPredominante', avaluo.construccion_predominante),
    tag('ViasAcceso', avaluo.vias_acceso),
    tag('UsoPredominante', avaluo.uso_predominante),
    tag('UsoLegal', avaluo.uso_legal),
    tag('UsoFisico', avaluo.uso_fisico),
    tag('UsoFinanciero', avaluo.uso_financiero),
    tag('UsoOptimo', avaluo.uso_optimo),
  ]
    .filter(Boolean)
    .join('\n');

  const enfoqueFisico = [
    tag('ValorUnitario', formatNumber(avaluo.valor_unitario)),
    tag('ValorTerreno', formatNumber(avaluo.valor_terreno)),
    tag('ValorConstrucciones', formatNumber(avaluo.valor_construcciones)),
    tag('Depreciacion', formatNumber(avaluo.depreciacion)),
    tag('ValorFisicoTotal', formatNumber(avaluo.valor_fisico_total)),
  ]
    .filter(Boolean)
    .join('\n');

  const comparablesXml = comparables
    .map((c) =>
      [
        tag('Id', c.id),
        tag('Calle', c.calle),
        tag('Colonia', c.colonia),
        tag('Municipio', c.municipio),
        tag('Estado', c.estado_inmueble),
        tag('TipoInmueble', c.tipo_inmueble),
        tag('TipoOperacion', c.tipo),
        tag('SuperficieTerreno', formatNumber(c.superficie_terreno)),
        tag('SuperficieConstruccion', formatNumber(c.superficie_construccion)),
        tag('Precio', formatNumber(c.precio)),
        tag('PrecioM2', formatNumber(c.precio_m2)),
        tag('Moneda', c.moneda ?? 'MXN'),
        tag('Fuente', c.fuente),
        tag('UrlFuente', c.url_fuente),
        tag('FechaPublicacion', c.fecha_publicacion),
        tag('Estado', c.estado),
        tag('Notas', c.notas),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .map((body) => `<Comparable>\n${indent(body, 2)}\n</Comparable>`)
    .join('\n');

  const enfoqueMercado = [
    tag('InvestigacionMercado', avaluo.investigacion_mercado),
    tag('RangoValores', avaluo.rango_valores),
    tag('Homologacion', avaluo.homologacion),
    tag('ResultadoMercado', avaluo.resultado_mercado),
    comparablesXml.length > 0
      ? `<Comparables>\n${indent(comparablesXml, 2)}\n</Comparables>`
      : '<Comparables/>',
  ]
    .filter(Boolean)
    .join('\n');

  const enfoqueIngresos = [
    tag('Ingresos', formatNumber(avaluo.cap_ingresos)),
    tag('Tasa', formatNumber(avaluo.cap_tasa)),
    tag('ValorCapitalizado', formatNumber(avaluo.cap_valor)),
  ]
    .filter(Boolean)
    .join('\n');

  const conciliacion = [
    tag('Comparacion', avaluo.conciliacion_comparacion),
    tag('Ponderacion', avaluo.conciliacion_ponderacion),
    tag('Justificacion', avaluo.conciliacion_justificacion),
    tag('ValorUV', formatNumber(avaluo.valor_uv)),
    tag('ValorValuador', formatNumber(avaluo.valor_valuador)),
    tag('ValorEstimado', formatNumber(avaluo.valor_estimado)),
  ]
    .filter(Boolean)
    .join('\n');

  const declaraciones = [
    tag('Alcance', avaluo.declaracion_alcance),
    tag('Supuestos', avaluo.declaracion_supuestos),
    tag('Limitaciones', avaluo.declaracion_limitaciones),
  ]
    .filter(Boolean)
    .join('\n');

  const firmas = [
    `<FirmaUV>\n${indent(
      [
        tag('Firmado', !!avaluo.firmado_uv),
        tag('Fecha', avaluo.fecha_firma_uv),
      ]
        .filter(Boolean)
        .join('\n'),
      2,
    )}\n</FirmaUV>`,
    `<FirmaValuador>\n${indent(
      [
        tag('Firmado', !!avaluo.firmado_valuador),
        tag('Fecha', avaluo.fecha_firma_valuador),
      ]
        .filter(Boolean)
        .join('\n'),
      2,
    )}\n</FirmaValuador>`,
  ].join('\n');

  const secciones = [
    { nombre: 'DatosGenerales', body: datosGenerales },
    { nombre: 'Ubicacion', body: ubicacion },
    { nombre: 'Inmueble', body: inmueble },
    { nombre: 'MarcoLegal', body: marcoLegal },
    { nombre: 'AnalisisUrbano', body: analisisUrbano },
    { nombre: 'EnfoqueFisico', body: enfoqueFisico },
    { nombre: 'EnfoqueMercado', body: enfoqueMercado },
    { nombre: 'EnfoqueIngresos', body: enfoqueIngresos },
    { nombre: 'Conciliacion', body: conciliacion },
    { nombre: 'Declaraciones', body: declaraciones },
    { nombre: 'Firmas', body: firmas },
  ];

  const seccionesXml = secciones
    .map(({ nombre, body }) =>
      body.trim().length === 0
        ? `<${nombre}/>`
        : `<${nombre}>\n${indent(body, 2)}\n</${nombre}>`,
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- ESTRUCTURA PROVISIONAL basada en normativa pública SHF. Ajustar al XSD exacto cuando se reciban accesos WS SMA. -->',
    '<AvaluoSHF version="1.0" xmlns="http://shf.gob.mx/xsd/avaluo">',
    indent(seccionesXml, 2),
    '</AvaluoSHF>',
    '',
  ].join('\n');
}
