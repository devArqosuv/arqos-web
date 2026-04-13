'use client';

import Link from 'next/link';
import { useMemo } from 'react';

// ─────────────────────────────────────────────────────────
// Componente reutilizable: tabla SAX de avalúos agrupados
// por banco/cliente con conteos por estado del flujo.
//
// Se usa en:
//   - /dashboard/valuador/inicio (avalúos del valuador)
//   - /dashboard/admin (TODOS los avalúos)
//   - /dashboard/controlador (avalúos asignados al controlador)
// ─────────────────────────────────────────────────────────

const COLUMNAS_ESTADO = [
  { key: 'captura',          label: 'Captura' },
  { key: 'agenda_visita',    label: 'Agenda Visita' },
  { key: 'visita_realizada', label: 'Visita' },
  { key: 'preavaluo',        label: 'Preavalúo' },
  { key: 'revision',         label: 'Revisión' },
  { key: 'firma',            label: 'Firma' },
  { key: 'aprobado',         label: 'Aprobado' },
  { key: 'rechazado',        label: 'Rechazado' },
] as const;

type EstadoKey = typeof COLUMNAS_ESTADO[number]['key'];

export interface AvaluoParaTabla {
  id: string;
  estado: string;
  banco_id: string | null;
  banco: { nombre: string } | null;
}

interface FilaCliente {
  nombre: string;
  total: number;
  porEstado: Record<EstadoKey, number>;
}

const SIN_BANCO_LABEL = 'CLIENTES PARTICULARES';

function filaVacia(nombre: string): FilaCliente {
  return {
    nombre,
    total: 0,
    porEstado: COLUMNAS_ESTADO.reduce((acc, c) => {
      acc[c.key] = 0;
      return acc;
    }, {} as Record<EstadoKey, number>),
  };
}

interface Props {
  avaluos: AvaluoParaTabla[];
  cargando: boolean;
  anio: number;
  setAnio: (anio: number) => void;
  titulo?: string;
  /** Base URL para links al hacer click en números. Ej: '/dashboard/valuador/expedientes' */
  linkBase?: string;
}

export default function TablaResumenBanco({
  avaluos,
  cargando,
  anio,
  setAnio,
  titulo = 'Reporte por Cliente / Banco',
  linkBase,
}: Props) {
  const { filas, totalGeneral } = useMemo(() => {
    const porBanco = new Map<string, FilaCliente>();
    for (const a of avaluos) {
      const nombreBanco = a.banco?.nombre ?? SIN_BANCO_LABEL;
      if (!porBanco.has(nombreBanco)) porBanco.set(nombreBanco, filaVacia(nombreBanco));
      const fila = porBanco.get(nombreBanco)!;
      fila.total += 1;
      if (COLUMNAS_ESTADO.some((c) => c.key === a.estado)) {
        fila.porEstado[a.estado as EstadoKey] += 1;
      }
    }

    const total = filaVacia('TOTAL');
    for (const fila of porBanco.values()) {
      total.total += fila.total;
      for (const col of COLUMNAS_ESTADO) {
        total.porEstado[col.key] += fila.porEstado[col.key];
      }
    }

    return {
      filas: Array.from(porBanco.values()).sort((a, b) => b.total - a.total),
      totalGeneral: total,
    };
  }, [avaluos]);

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual, actual - 1, actual - 2, actual - 3];
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
        <h2 className="text-xs font-black text-white uppercase tracking-widest">{titulo}</h2>
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Año
          </label>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="text-xs font-semibold text-white bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="p-6 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400 text-sm font-semibold">No hay avalúos en {anio}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-sky-100 border-y border-sky-200">
                <th className="px-4 py-2.5 text-left text-[10px] font-black text-sky-900 uppercase tracking-wider sticky left-0 bg-sky-100 z-10">
                  Cliente
                </th>
                {COLUMNAS_ESTADO.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-center text-[9px] font-black text-sky-900 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-center text-[10px] font-black text-sky-900 uppercase tracking-wider bg-sky-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((fila) => (
                <tr key={fila.nombre} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2.5 text-[11px] font-black text-slate-800 sticky left-0 bg-white hover:bg-slate-50 whitespace-nowrap">
                    {fila.nombre}
                  </td>
                  {COLUMNAS_ESTADO.map((col) => {
                    const n = fila.porEstado[col.key];
                    return (
                      <td key={col.key} className="px-3 py-2.5 text-center">
                        {n > 0 && linkBase ? (
                          <Link
                            href={`${linkBase}?estado=${col.key}`}
                            className="text-xs font-black text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            {n}
                          </Link>
                        ) : n > 0 ? (
                          <span className="text-xs font-black text-sky-600">{n}</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-center text-xs font-black text-slate-900 bg-slate-50">
                    {fila.total}
                  </td>
                </tr>
              ))}
              {/* Fila TOTAL */}
              <tr className="bg-slate-900 text-white">
                <td className="px-4 py-3 text-[11px] font-black uppercase tracking-wider sticky left-0 bg-slate-900">
                  Total
                </td>
                {COLUMNAS_ESTADO.map((col) => (
                  <td key={col.key} className="px-3 py-3 text-center text-xs font-black">
                    {totalGeneral.porEstado[col.key]}
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-sm font-black bg-black">
                  {totalGeneral.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
