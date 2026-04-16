'use client';

import { useState, useMemo, useTransition } from 'react';
import { crearCosto, actualizarCosto, eliminarCosto, type CostoInput } from './actions';

export interface Costo {
  id: string;
  servicio: string;
  plan: string | null;
  costo_mensual: number;
  moneda: string;
  notas: string | null;
  created_at: string | null;
}

interface Props {
  costos: Costo[];
  numAvaluosMes: number;
}

const EMPTY: CostoInput = {
  servicio: '',
  plan: null,
  costo_mensual: 0,
  moneda: 'USD',
  notas: null,
};

function formatMoney(n: number, moneda = 'USD'): string {
  return `${moneda === 'USD' ? 'US$' : '$'}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export default function CostosClient({ costos, numAvaluosMes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<CostoInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { totalMensual, totalAnual, maxCosto } = useMemo(() => {
    // Nota: Normalizamos a USD asumiendo un tipo de cambio fijo para la gráfica.
    // Si hay monedas mezcladas MXN/USD, solo sumamos los que coinciden en moneda dominante (USD).
    const enUSD = costos.filter((c) => c.moneda === 'USD');
    const total = enUSD.reduce((acc, c) => acc + Number(c.costo_mensual), 0);
    const max = Math.max(...enUSD.map((c) => Number(c.costo_mensual)), 1);
    return { totalMensual: total, totalAnual: total * 12, maxCosto: max };
  }, [costos]);

  const costoPromedioPorAvaluo = numAvaluosMes > 0 ? totalMensual / numAvaluosMes : 0;

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(EMPTY);
    setError(null);
    setModalOpen(true);
  };

  const abrirEditar = (c: Costo) => {
    setEditandoId(c.id);
    setForm({
      servicio: c.servicio,
      plan: c.plan,
      costo_mensual: c.costo_mensual,
      moneda: c.moneda,
      notas: c.notas,
    });
    setError(null);
    setModalOpen(true);
  };

  const guardar = () => {
    setError(null);
    if (!form.servicio.trim()) {
      setError('El servicio es obligatorio.');
      return;
    }
    if (!Number.isFinite(form.costo_mensual) || form.costo_mensual < 0) {
      setError('El costo debe ser un número ≥ 0.');
      return;
    }
    startTransition(async () => {
      const res = editandoId ? await actualizarCosto(editandoId, form) : await crearCosto(form);
      if (!res.ok) return setError(res.error);
      setModalOpen(false);
    });
  };

  const eliminar = (c: Costo) => {
    if (!confirm(`¿Eliminar costo de "${c.servicio}"?`)) return;
    startTransition(async () => {
      const res = await eliminarCosto(c.id);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operación</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Costos</h1>
          <p className="text-xs text-slate-500 mt-1">Infraestructura y servicios externos</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          NUEVO SERVICIO
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo Total Mensual</p>
            <p className="text-3xl font-black tracking-tight text-slate-900 mt-2">{formatMoney(totalMensual, 'USD')}</p>
            <p className="text-[11px] text-slate-500 mt-1">{costos.length} servicios contratados</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo Anual Proyectado</p>
            <p className="text-3xl font-black tracking-tight text-slate-900 mt-2">{formatMoney(totalAnual, 'USD')}</p>
            <p className="text-[11px] text-slate-500 mt-1">× 12 meses</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo por Avalúo (mes)</p>
            <p className="text-3xl font-black tracking-tight text-slate-900 mt-2">
              {numAvaluosMes > 0 ? formatMoney(costoPromedioPorAvaluo, 'USD') : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{numAvaluosMes} avalúos este mes</p>
          </div>
        </div>

        {/* GRÁFICA BARRAS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Distribución por servicio</p>
          <div className="space-y-3">
            {costos.length === 0 && <p className="text-sm text-slate-400">Sin servicios configurados</p>}
            {costos.map((c) => {
              const pct = c.moneda === 'USD' ? (Number(c.costo_mensual) / maxCosto) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="w-32 font-semibold text-slate-700 truncate">{c.servicio}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[11px] font-bold text-white mix-blend-difference">
                      {formatMoney(Number(c.costo_mensual), c.moneda)}
                      {c.plan && <span className="ml-2 opacity-60">· {c.plan}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Servicio</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Plan</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Costo Mensual</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Notas</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {costos.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900 capitalize">{c.servicio}</td>
                  <td className="px-4 py-3 text-slate-600">{c.plan ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatMoney(Number(c.costo_mensual), c.moneda)}</td>
                  <td className="px-4 py-3 text-slate-500 text-[12px] max-w-xs truncate">{c.notas ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => abrirEditar(c)}
                      className="text-[11px] font-bold text-slate-700 hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(c)}
                      disabled={isPending}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {costos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Sin costos configurados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {editandoId ? 'Editar Costo' : 'Nuevo Costo'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">{error}</div>}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Servicio</label>
                <input
                  type="text"
                  value={form.servicio}
                  onChange={(e) => setForm({ ...form, servicio: e.target.value })}
                  placeholder="supabase, vercel, openrouter..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan</label>
                  <input
                    type="text"
                    value={form.plan ?? ''}
                    onChange={(e) => setForm({ ...form, plan: e.target.value || null })}
                    placeholder="pro, free, enterprise"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Moneda</label>
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo mensual</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costo_mensual}
                  onChange={(e) => setForm({ ...form, costo_mensual: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notas</label>
                <textarea
                  rows={2}
                  value={form.notas ?? ''}
                  onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
