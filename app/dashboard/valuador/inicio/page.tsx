'use client';

import Link from 'next/link';
import ValuadorTopbar from '../ValuadorTopbar';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/util/supabase/client';

// ─────────────────────────────────────────────────────────
// Columnas de estado del flujo ARQOS (inspirado en tabla SAX)
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

interface AvaluoLigero {
  id: string;
  folio: string | null;
  estado: string;
  fecha_solicitud: string;
  banco_id: string | null;
  banco: { nombre: string } | null;
}

interface FilaCliente {
  nombre: string;
  slug: string;        // para el filtro en el link
  total: number;
  porEstado: Record<EstadoKey, number>;
}

const SIN_BANCO_SLUG = 'sin-banco';
const SIN_BANCO_LABEL = 'CLIENTES PARTICULARES';

function filaVacia(nombre: string, slug: string): FilaCliente {
  return {
    nombre,
    slug,
    total: 0,
    porEstado: COLUMNAS_ESTADO.reduce((acc, c) => {
      acc[c.key] = 0;
      return acc;
    }, {} as Record<EstadoKey, number>),
  };
}

export default function ValuadorInicio() {
  const [avaluos, setAvaluos] = useState<AvaluoLigero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Nombre del valuador para el mensaje de bienvenida
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, apellidos')
        .eq('id', user.id)
        .single();
      if (perfil) {
        setNombreUsuario(`${perfil.nombre ?? ''} ${perfil.apellidos ?? ''}`.trim());
      }

      // Rango del año seleccionado
      const inicioAnio = new Date(anio, 0, 1).toISOString();
      const inicioSiguiente = new Date(anio + 1, 0, 1).toISOString();

      const { data } = await supabase
        .from('avaluos')
        .select(`
          id, folio, estado, fecha_solicitud, banco_id,
          banco:banco_id (nombre)
        `)
        .or(`valuador_id.eq.${user.id},solicitante_id.eq.${user.id}`)
        .gte('fecha_solicitud', inicioAnio)
        .lt('fecha_solicitud', inicioSiguiente)
        .order('fecha_solicitud', { ascending: false });

      if (data) {
        // Supabase devuelve banco como array aunque sea *-to-one; aplanamos
        const aplanados = (data as unknown as Array<Omit<AvaluoLigero, 'banco'> & { banco: { nombre: string }[] | { nombre: string } | null }>).map((a) => ({
          ...a,
          banco: Array.isArray(a.banco) ? a.banco[0] ?? null : a.banco,
        })) as AvaluoLigero[];
        setAvaluos(aplanados);
      }
      setCargando(false);
    }
    cargar();
  }, [anio]);

  // Agrupar avalúos por banco (o "Sin banco") y contar por estado
  const { filas, totalGeneral } = useMemo(() => {
    const porBanco = new Map<string, FilaCliente>();
    for (const a of avaluos) {
      const nombreBanco = a.banco?.nombre ?? SIN_BANCO_LABEL;
      const slug = a.banco?.nombre ? a.banco.nombre.toLowerCase().replace(/\s+/g, '-') : SIN_BANCO_SLUG;
      if (!porBanco.has(nombreBanco)) porBanco.set(nombreBanco, filaVacia(nombreBanco, slug));
      const fila = porBanco.get(nombreBanco)!;
      fila.total += 1;
      if (COLUMNAS_ESTADO.some((c) => c.key === a.estado)) {
        fila.porEstado[a.estado as EstadoKey] += 1;
      }
    }

    // Fila de TOTAL al final
    const total = filaVacia('TOTAL', 'total');
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
    <main className="flex-1 flex flex-col overflow-hidden">
      <ValuadorTopbar paginaActiva="Valuaciones" />

      <div className="flex-1 overflow-y-auto">
        {/* Barra superior: DASHBOARD */}
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Dashboard</p>
          <h1 className="text-xl font-black text-slate-900 mt-1">Panel del valuador</h1>
        </div>

        {/* Mensaje de bienvenida */}
        <div className="mx-6 mt-6 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
          <p className="text-xs text-sky-900 leading-relaxed">
            Estimad@ <span className="font-black">{nombreUsuario || 'Valuador'}</span>, bienvenido al sistema{' '}
            <span className="font-black">ARQOS</span>. A continuación verás el resumen consolidado de tu actividad,
            agrupada por cliente / banco y por estado del flujo. Haz click en cualquier número para ver el detalle.
          </p>
        </div>

        {/* SECCIÓN: Últimas noticias (placeholder) */}
        <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-xl">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-center">
            <h2 className="text-xs font-black text-slate-700 border-b-2 border-slate-900 pb-1">
              Últimas noticias
            </h2>
          </div>
          <div className="py-10 text-center">
            <p className="text-xs text-slate-400 font-semibold">No se ha encontrado ninguna noticia</p>
          </div>
        </div>

        {/* SECCIÓN: Reporte inicial */}
        <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-900 px-5 py-3">
            <h2 className="text-xs font-black text-white uppercase tracking-widest">Reporte Inicial</h2>
          </div>
          <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-100">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Año
              </label>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECCIÓN: Reporte inicial por cliente (la tabla grande) */}
          <div className="overflow-x-auto">
            <div className="bg-slate-900 px-5 py-3">
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Reporte Inicial por Cliente</h2>
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
                <Link
                  href="/dashboard/valuador"
                  className="mt-3 inline-block bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  + Crear primer avalúo
                </Link>
              </div>
            ) : (
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
                            {n > 0 ? (
                              <Link
                                href={`/dashboard/valuador/expedientes?estado=${col.key}`}
                                className="text-xs font-black text-sky-600 hover:text-sky-800 hover:underline"
                              >
                                {n}
                              </Link>
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
                  {/* Fila de TOTAL */}
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
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </main>
  );
}
