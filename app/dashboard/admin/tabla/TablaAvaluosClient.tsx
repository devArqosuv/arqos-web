'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface Documento {
  id: string;
  avaluo_id: string;
  nombre: string;
  categoria: string | null;
  storage_path: string;
  tipo_mime: string | null;
  url: string | null;
}

interface AvaluoCompleto {
  id: string;
  folio: string | null;
  estado: string;
  // Datos generales
  folio_infonavit: string | null;
  clave_unica_vivienda: string | null;
  clave_avaluo: string | null;
  vigencia: string | null;
  unidad_valuacion: string | null;
  proposito_avaluo: string | null;
  tipo_inmueble: string | null;
  tipo_avaluo_codigo: string | null;
  banco_id: string | null;
  // Ubicación
  calle: string;
  numero_ext: string | null;
  colonia: string | null;
  municipio: string;
  estado_inmueble: string;
  cp: string | null;
  lat: number | null;
  lng: number | null;
  // Catastral y legal
  cuenta_predial: string | null;
  cuenta_agua: string | null;
  regimen_propiedad: string | null;
  propietario: string | null;
  solicitante: string | null;
  // Marco legal
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
  // Descripción inmueble
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  uso_suelo: string | null;
  topografia_forma: string | null;
  descripcion_fisica: string | null;
  construcciones: string | null;
  instalaciones: string | null;
  estado_conservacion: string | null;
  num_recamaras: number | null;
  num_banos: number | null;
  num_estacionamientos: number | null;
  edad_inmueble: number | null;
  // Entorno
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
  // Valores
  valor_estimado: number | null;
  valor_terreno: number | null;
  valor_construccion: number | null;
  valor_uv: number | null;
  valor_valuador: number | null;
  valor_unitario: number | null;
  valor_construcciones: number | null;
  depreciacion: number | null;
  valor_fisico_total: number | null;
  // Capitalización
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
  // Verificación
  verificacion_servicios: Record<string, string> | null;
  // Firma
  firmado_uv: boolean;
  firmado_valuador: boolean;
  fecha_firma_uv: string | null;
  fecha_firma_valuador: string | null;
  pdf_oficial_path: string | null;
  // Fechas
  fecha_solicitud: string | null;
  fecha_visita_agendada: string | null;
  fecha_visita_realizada: string | null;
  fecha_aprobacion: string | null;
  created_at: string | null;
  moneda: string | null;
  notas: string | null;
  // Joins
  valuador_nombre: string | null;
  controlador_nombre: string | null;
  documentos: Documento[];
  [key: string]: unknown;
}

interface ColumnDef {
  key: string;
  label: string;
  type?: 'date' | 'number' | 'money' | 'boolean' | 'docs';
}

// Definición de columnas agrupadas por sección del template SHF
const COLUMN_GROUPS: { label: string; columns: ColumnDef[] }[] = [
  {
    label: 'Datos Generales',
    columns: [
      { key: 'folio', label: 'Folio' },
      { key: 'estado', label: 'Estado' },
      { key: 'tipo_avaluo_codigo', label: 'Tipo' },
      { key: 'banco_id', label: 'Banco' },
      { key: 'folio_infonavit', label: 'Folio Infonavit' },
      { key: 'clave_unica_vivienda', label: 'Clave Vivienda' },
      { key: 'clave_avaluo', label: 'Clave Avalúo' },
      { key: 'fecha_solicitud', label: 'Fecha', type: 'date' },
      { key: 'vigencia', label: 'Vigencia' },
      { key: 'unidad_valuacion', label: 'UV' },
      { key: 'valuador_nombre', label: 'Valuador' },
      { key: 'controlador_nombre', label: 'Controlador' },
      { key: 'proposito_avaluo', label: 'Propósito' },
      { key: 'tipo_inmueble', label: 'Tipo Inmueble' },
    ],
  },
  {
    label: 'Ubicación',
    columns: [
      { key: 'calle', label: 'Calle y Número' },
      { key: 'colonia', label: 'Colonia' },
      { key: 'municipio', label: 'Municipio' },
      { key: 'estado_inmueble', label: 'Estado' },
      { key: 'cp', label: 'CP' },
      { key: 'lat', label: 'Latitud' },
      { key: 'lng', label: 'Longitud' },
      { key: 'cuenta_predial', label: 'Cuenta Predial' },
      { key: 'cuenta_agua', label: 'Cuenta Agua' },
      { key: 'regimen_propiedad', label: 'Régimen Propiedad' },
      { key: 'propietario', label: 'Propietario' },
      { key: 'solicitante', label: 'Solicitante' },
    ],
  },
  {
    label: 'Marco Legal',
    columns: [
      { key: 'documentacion_analizada', label: 'Doc. Analizada' },
      { key: 'situacion_legal', label: 'Situación Legal' },
      { key: 'restricciones_servidumbres', label: 'Restricciones' },
    ],
  },
  {
    label: 'Características Urbanas',
    columns: [
      { key: 'clasificacion_zona', label: 'Clasif. Zona' },
      { key: 'infraestructura', label: 'Infraestructura' },
      { key: 'servicios_urbanos', label: 'Servicios' },
      { key: 'equipamiento', label: 'Equipamiento' },
      { key: 'vialidades', label: 'Vialidades' },
      { key: 'construccion_predominante', label: 'Const. Predominante' },
      { key: 'vias_acceso', label: 'Vías Acceso' },
      { key: 'uso_predominante', label: 'Uso Predominante' },
    ],
  },
  {
    label: 'Descripción Inmueble',
    columns: [
      { key: 'uso_suelo', label: 'Uso de Suelo' },
      { key: 'superficie_terreno', label: 'Sup. Terreno', type: 'number' },
      { key: 'superficie_construccion', label: 'Sup. Construcción', type: 'number' },
      { key: 'topografia_forma', label: 'Topografía' },
      { key: 'descripcion_fisica', label: 'Desc. Física' },
      { key: 'construcciones', label: 'Construcciones' },
      { key: 'instalaciones', label: 'Instalaciones' },
      { key: 'estado_conservacion', label: 'Conservación' },
      { key: 'num_recamaras', label: 'Recámaras' },
      { key: 'num_banos', label: 'Baños' },
      { key: 'num_estacionamientos', label: 'Estac.' },
      { key: 'edad_inmueble', label: 'Edad' },
    ],
  },
  {
    label: 'Análisis Urbano',
    columns: [
      { key: 'tipo_zona', label: 'Tipo Zona' },
      { key: 'uso_legal', label: 'Uso Legal' },
      { key: 'uso_fisico', label: 'Uso Físico' },
      { key: 'uso_financiero', label: 'Uso Financiero' },
      { key: 'uso_optimo', label: 'Uso Óptimo' },
    ],
  },
  {
    label: 'Valores',
    columns: [
      { key: 'valor_estimado', label: 'Valor Estimado', type: 'money' },
      { key: 'valor_terreno', label: 'Valor Terreno', type: 'money' },
      { key: 'valor_construccion', label: 'Valor Construcción', type: 'money' },
      { key: 'valor_uv', label: 'Valor UV', type: 'money' },
      { key: 'valor_valuador', label: 'Valor Valuador', type: 'money' },
      { key: 'valor_unitario', label: 'Valor Unitario', type: 'money' },
      { key: 'valor_construcciones', label: 'Valor Construcc.', type: 'money' },
      { key: 'depreciacion', label: 'Depreciación', type: 'money' },
      { key: 'valor_fisico_total', label: 'Valor Físico Total', type: 'money' },
    ],
  },
  {
    label: 'Capitalización',
    columns: [
      { key: 'cap_ingresos', label: 'Ingresos', type: 'money' },
      { key: 'cap_tasa', label: 'Tasa', type: 'number' },
      { key: 'cap_valor', label: 'Valor Cap.', type: 'money' },
    ],
  },
  {
    label: 'Conciliación',
    columns: [
      { key: 'conciliacion_comparacion', label: 'Comparación' },
      { key: 'conciliacion_ponderacion', label: 'Ponderación' },
      { key: 'conciliacion_justificacion', label: 'Justificación' },
    ],
  },
  {
    label: 'Firma',
    columns: [
      { key: 'firmado_uv', label: 'Firmado UV', type: 'boolean' },
      { key: 'firmado_valuador', label: 'Firmado Val.', type: 'boolean' },
      { key: 'fecha_firma_uv', label: 'Fecha Firma UV', type: 'date' },
      { key: 'fecha_firma_valuador', label: 'Fecha Firma Val.', type: 'date' },
    ],
  },
  {
    label: 'Documentación',
    columns: [
      { key: '_documentos', label: 'Documentos', type: 'docs' },
    ],
  },
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap((g) => g.columns);

const ESTADO_COLORS: Record<string, string> = {
  solicitud: 'bg-blue-100 text-blue-700',
  captura: 'bg-amber-100 text-amber-700',
  agenda_visita: 'bg-orange-100 text-orange-700',
  visita_realizada: 'bg-purple-100 text-purple-700',
  preavaluo: 'bg-cyan-100 text-cyan-700',
  revision: 'bg-violet-100 text-violet-700',
  firma: 'bg-sky-100 text-sky-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
};

function formatCell(value: unknown, type?: string): string {
  if (value == null || value === '') return '';
  if (type === 'date') {
    try {
      return new Date(value as string).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(value); }
  }
  if (type === 'money') return `$${Number(value).toLocaleString('es-MX')}`;
  if (type === 'number') return Number(value).toLocaleString('es-MX');
  if (type === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

interface Props {
  avaluos: AvaluoCompleto[];
}

export default function TablaAvaluosClient({ avaluos }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const avaluosFiltrados = useMemo(() => {
    let result = avaluos;
    if (filtroEstado) result = result.filter((a) => a.estado === filtroEstado);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      result = result.filter((a) =>
        (a.folio ?? '').toLowerCase().includes(q) ||
        a.calle.toLowerCase().includes(q) ||
        a.municipio.toLowerCase().includes(q) ||
        (a.propietario ?? '').toLowerCase().includes(q) ||
        (a.valuador_nombre ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [avaluos, busqueda, filtroEstado]);

  const handleExportExcel = () => {
    const rows = avaluosFiltrados.map((a) => {
      const row: Record<string, string> = {};
      ALL_COLUMNS.forEach((col) => {
        if (col.type === 'docs') {
          row[col.label] = a.documentos.map((d) => d.url ?? d.nombre).join(' | ');
        } else {
          row[col.label] = formatCell(a[col.key], col.type);
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avalúos');
    XLSX.writeFile(wb, `ARQOS_Avaluos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const estados = [...new Set(avaluos.map((a) => a.estado))].sort();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-900">Tabla de Avalúos SHF</h1>
          <p className="text-xs text-slate-500">{avaluosFiltrados.length} de {avaluos.length} avalúos</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar folio, calle, propietario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-slate-900 outline-none"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={handleExportExcel}
            className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="text-[11px] border-collapse">
          {/* Group Headers */}
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800">
              {COLUMN_GROUPS.map((group) => (
                <th
                  key={group.label}
                  colSpan={group.columns.length}
                  className="text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1.5 border-r border-slate-700 text-center"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-100">
              {ALL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="font-bold text-slate-600 text-[10px] uppercase tracking-wider px-2 py-2 border-r border-slate-200 text-left whitespace-nowrap sticky top-[30px] bg-slate-100 z-10"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {avaluosFiltrados.map((avaluo) => (
              <tr key={avaluo.id} className="hover:bg-blue-50/50 border-b border-slate-100 transition">
                {ALL_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap max-w-[200px] truncate"
                  >
                    {col.key === 'estado' ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_COLORS[avaluo.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                        {avaluo.estado.replace(/_/g, ' ')}
                      </span>
                    ) : col.type === 'docs' ? (
                      <div className="flex gap-1 flex-wrap">
                        {avaluo.documentos.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          avaluo.documentos.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.url ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={doc.nombre}
                              className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-blue-100 transition"
                            >
                              {doc.tipo_mime?.startsWith('image/') ? '🖼' : '📄'}
                              <span className="max-w-[60px] truncate">{doc.nombre.split('.')[0]}</span>
                            </a>
                          ))
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-700" title={String(avaluo[col.key] ?? '')}>
                        {formatCell(avaluo[col.key], col.type)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {avaluosFiltrados.length === 0 && (
              <tr>
                <td colSpan={ALL_COLUMNS.length} className="text-center py-12 text-slate-400 text-sm">
                  No se encontraron avalúos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
