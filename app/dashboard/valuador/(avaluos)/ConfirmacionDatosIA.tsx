'use client';

/**
 * Paso OBLIGATORIO de confirmación de datos IA.
 *
 * Cuando la IA termina de extraer datos del expediente, el valuador
 * DEBE revisar y confirmar los campos antes de que se cree el avalúo.
 * Esto protege legalmente al valuador (él firma, la IA sólo sugiere) y
 * alimenta el loop de mejora de prompts vía la tabla shf_correcciones.
 *
 * Convenciones visuales:
 *  - Borde azul + ✨ = valor original de la IA (no tocado)
 *  - Borde verde + ✎ = valor corregido manualmente por el humano
 *  - Badge de confianza (alta/media/baja) por campo pre-llenado
 */

import { useMemo, useState } from 'react';

export interface DatosIA {
  [campo: string]: string | null;
}

export interface Correccion {
  campo: string;
  valor_ia: string | null;
  valor_humano: string | null;
  confianza_ia: number | null;
}

interface Seccion {
  titulo: string;
  campos: { key: string; label: string; multiline?: boolean }[];
}

const SECCIONES: Seccion[] = [
  {
    titulo: 'Propietario y solicitante',
    campos: [
      { key: 'propietario', label: 'Propietario' },
      { key: 'solicitante', label: 'Solicitante' },
    ],
  },
  {
    titulo: 'Ubicación',
    campos: [
      { key: 'ubicacion', label: 'Dirección completa' },
      { key: 'calle', label: 'Calle y número' },
      { key: 'colonia', label: 'Colonia / Fraccionamiento' },
      { key: 'municipio', label: 'Municipio' },
      { key: 'estado', label: 'Estado' },
      { key: 'cp', label: 'Código postal' },
    ],
  },
  {
    titulo: 'Datos catastrales',
    campos: [
      { key: 'clave_catastral', label: 'Clave catastral' },
      { key: 'cuenta_predial', label: 'Cuenta predial' },
      { key: 'valor_catastral', label: 'Valor catastral ($)' },
      { key: 'cuenta_agua', label: 'Cuenta de agua' },
    ],
  },
  {
    titulo: 'Superficies',
    campos: [
      { key: 'superficie_terreno', label: 'Superficie de terreno (m²)' },
      { key: 'superficie_construccion', label: 'Superficie de construcción (m²)' },
    ],
  },
  {
    titulo: 'Datos legales (escritura)',
    campos: [
      { key: 'regimen_propiedad', label: 'Régimen de propiedad' },
      { key: 'numero_escritura', label: 'Número de escritura' },
      { key: 'notario', label: 'Notario' },
      { key: 'fecha_escritura', label: 'Fecha de escritura' },
      { key: 'rpp_folio', label: 'Folio RPP' },
      { key: 'situacion_legal', label: 'Situación legal', multiline: true },
      { key: 'restricciones_servidumbres', label: 'Restricciones / Servidumbres', multiline: true },
      { key: 'medidas_colindancias', label: 'Medidas y colindancias', multiline: true },
    ],
  },
  {
    titulo: 'Descripción del inmueble',
    campos: [
      { key: 'tipo_inmueble_detectado', label: 'Tipo de inmueble' },
      { key: 'edad_inmueble', label: 'Edad (años)' },
      { key: 'uso_suelo_detectado', label: 'Uso de suelo' },
      { key: 'descripcion_fisica', label: 'Descripción física', multiline: true },
      { key: 'construcciones', label: 'Construcciones', multiline: true },
      { key: 'instalaciones', label: 'Instalaciones', multiline: true },
      { key: 'estado_conservacion', label: 'Estado de conservación' },
      { key: 'topografia_forma', label: 'Topografía / Forma' },
      { key: 'num_recamaras', label: 'Recámaras' },
      { key: 'num_banos', label: 'Baños' },
      { key: 'num_estacionamientos', label: 'Estacionamientos' },
    ],
  },
  {
    titulo: 'Características urbanas',
    campos: [
      { key: 'clasificacion_zona', label: 'Clasificación de zona' },
      { key: 'uso_predominante', label: 'Uso predominante' },
      { key: 'tipo_zona', label: 'Tipo de zona' },
    ],
  },
  {
    titulo: 'Folios e identificadores',
    campos: [
      { key: 'folio_infonavit', label: 'Folio Infonavit' },
      { key: 'clave_unica_vivienda', label: 'Clave única de vivienda' },
    ],
  },
  {
    titulo: 'Observaciones',
    campos: [
      { key: 'documentacion_analizada', label: 'Documentación analizada', multiline: true },
      { key: 'observaciones', label: 'Observaciones', multiline: true },
    ],
  },
];

function confianzaLabel(n: number | undefined): { texto: string; color: string } {
  if (n === undefined) return { texto: 'sin dato', color: 'bg-slate-100 text-slate-500' };
  if (n >= 0.85) return { texto: `IA ${Math.round(n * 100)}%`, color: 'bg-emerald-100 text-emerald-700' };
  if (n >= 0.6) return { texto: `IA ${Math.round(n * 100)}%`, color: 'bg-amber-100 text-amber-700' };
  return { texto: `IA ${Math.round(n * 100)}% (revisa)`, color: 'bg-red-100 text-red-700' };
}

interface Props {
  datosIA: DatosIA;
  confianza: Record<string, number>;
  onConfirmar: (datosFinales: DatosIA, correcciones: Correccion[]) => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function ConfirmacionDatosIA({
  datosIA,
  confianza,
  onConfirmar,
  onCancelar,
  cargando = false,
}: Props) {
  // Estado local: copia editable de los datos IA
  const [datos, setDatos] = useState<DatosIA>(() => ({ ...datosIA }));

  const campoModificado = (campo: string): boolean => {
    const original = datosIA[campo];
    const actual = datos[campo];
    // Normalizamos null vs "" como equivalentes para no marcar corrección falsa
    const n = (v: string | null | undefined) => (v === null || v === undefined ? '' : String(v).trim());
    return n(original) !== n(actual);
  };

  const totalPrellenados = useMemo(
    () => Object.entries(datosIA).filter(([, v]) => v !== null && v !== '').length,
    [datosIA],
  );
  const totalCorregidos = useMemo(
    () => SECCIONES.flatMap(s => s.campos).filter(c => campoModificado(c.key)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos],
  );

  const handleConfirmar = () => {
    const correcciones: Correccion[] = [];
    for (const seccion of SECCIONES) {
      for (const { key } of seccion.campos) {
        if (campoModificado(key)) {
          correcciones.push({
            campo: key,
            valor_ia: datosIA[key] ?? null,
            valor_humano: datos[key] ?? null,
            confianza_ia: confianza[key] ?? null,
          });
        }
      }
    }
    onConfirmar(datos, correcciones);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-blue-500">✨</span>
              Revisa los datos extraídos por la IA
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              La IA pre-llenó <b>{totalPrellenados} campos</b> desde los documentos.
              Corrige cualquier error antes de continuar. Tú firmas este avalúo — la IA sólo sugiere.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-slate-500">
              Corregidos: <b className="text-emerald-700">{totalCorregidos}</b>
            </span>
            <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">✨ IA</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">✎ Corregido</span>
            </div>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {SECCIONES.map((seccion) => (
            <div key={seccion.titulo} className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
                {seccion.titulo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {seccion.campos.map(({ key, label, multiline }) => {
                  const valorIA = datosIA[key];
                  const vieneDeIA = valorIA !== null && valorIA !== undefined && valorIA !== '';
                  const modificado = campoModificado(key);
                  const conf = confianza[key];
                  const { texto: confTexto, color: confColor } = confianzaLabel(conf);

                  const borderClass = modificado
                    ? 'border-emerald-500 ring-1 ring-emerald-200'
                    : vieneDeIA
                    ? 'border-blue-400 ring-1 ring-blue-100'
                    : 'border-slate-200';

                  const InputTag = multiline ? 'textarea' : 'input';

                  return (
                    <div key={key} className={multiline ? 'md:col-span-2' : ''}>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                        {label}
                        {vieneDeIA && !modificado && <span className="text-blue-500" title="Llenado por IA">✨</span>}
                        {modificado && <span className="text-emerald-600" title="Corregido por humano">✎</span>}
                        {vieneDeIA && !modificado && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${confColor}`}>
                            {confTexto}
                          </span>
                        )}
                      </label>
                      <InputTag
                        value={datos[key] ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          setDatos((prev) => ({ ...prev, [key]: e.target.value || null }))
                        }
                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${borderClass} ${multiline ? 'min-h-[60px] resize-y' : ''}`}
                        {...(multiline ? { rows: 3 } : {})}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Cancelar y volver
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={cargando}
            className="px-6 py-3 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-400 text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
          >
            {cargando ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando…
              </>
            ) : (
              <>
                Confirmar datos y crear expediente
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
