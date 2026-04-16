'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  crearTarifa,
  actualizarTarifa,
  toggleTarifaActiva,
  eliminarTarifa,
  type TarifaInput,
} from './actions';

export interface Tarifa {
  id: string;
  tipo_avaluo_codigo: string;
  nombre: string;
  rango_valor_min: number | null;
  rango_valor_max: number | null;
  precio: number;
  moneda: string;
  activa: boolean;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Props {
  tarifas: Tarifa[];
  errorCarga: string | null;
}

function formatMoney(n: number | null, moneda = 'MXN'): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-MX')} ${moneda}`;
}

function formatRango(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `$${min.toLocaleString('es-MX')} – $${max.toLocaleString('es-MX')}`;
  if (min != null) return `≥ $${min.toLocaleString('es-MX')}`;
  if (max != null) return `≤ $${max.toLocaleString('es-MX')}`;
  return '—';
}

const EMPTY_INPUT: TarifaInput = {
  tipo_avaluo_codigo: '1.0',
  nombre: '',
  rango_valor_min: null,
  rango_valor_max: null,
  precio: 0,
  moneda: 'MXN',
  activa: true,
  notas: null,
};

export default function TarifasClient({ tarifas, errorCarga }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<TarifaInput>(EMPTY_INPUT);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tarifasFiltradas = useMemo(() => {
    let r = tarifas;
    if (filtroTipo) r = r.filter((t) => t.tipo_avaluo_codigo === filtroTipo);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      r = r.filter((t) =>
        t.nombre.toLowerCase().includes(q) ||
        (t.notas ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [tarifas, filtroTipo, busqueda]);

  const abrirNueva = () => {
    setEditandoId(null);
    setForm(EMPTY_INPUT);
    setError(null);
    setModalOpen(true);
  };

  const abrirEditar = (t: Tarifa) => {
    setEditandoId(t.id);
    setForm({
      tipo_avaluo_codigo: t.tipo_avaluo_codigo,
      nombre: t.nombre,
      rango_valor_min: t.rango_valor_min,
      rango_valor_max: t.rango_valor_max,
      precio: t.precio,
      moneda: t.moneda,
      activa: t.activa,
      notas: t.notas,
    });
    setError(null);
    setModalOpen(true);
  };

  const guardar = () => {
    setError(null);
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isFinite(form.precio) || form.precio < 0) {
      setError('El precio debe ser un número mayor o igual a 0.');
      return;
    }
    startTransition(async () => {
      const res = editandoId
        ? await actualizarTarifa(editandoId, form)
        : await crearTarifa(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setModalOpen(false);
    });
  };

  const toggle = (t: Tarifa) => {
    startTransition(async () => {
      const res = await toggleTarifaActiva(t.id, !t.activa);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  const eliminar = (t: Tarifa) => {
    if (!confirm(`¿Eliminar tarifa "${t.nombre}"?`)) return;
    startTransition(async () => {
      const res = await eliminarTarifa(t.id);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catálogo</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Tarifas</h1>
          <p className="text-xs text-slate-500 mt-1">{tarifasFiltradas.length} de {tarifas.length} tarifas</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar nombre, notas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 w-60 focus:ring-2 focus:ring-slate-900 outline-none"
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="1.0">Tipo 1.0</option>
            <option value="2.0">Tipo 2.0</option>
          </select>
          <button
            onClick={abrirNueva}
            className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            NUEVA TARIFA
          </button>
        </div>
      </div>

      {errorCarga && (
        <div className="mx-8 mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
          Error cargando tarifas: {errorCarga}
        </div>
      )}

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Tipo</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Nombre</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Rango Valor</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Precio</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Activa</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tarifasFiltradas.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.tipo_avaluo_codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{t.nombre}</div>
                    {t.notas && <div className="text-[11px] text-slate-400 mt-0.5">{t.notas}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-[12px]">{formatRango(t.rango_valor_min, t.rango_valor_max)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatMoney(t.precio, t.moneda)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(t)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${t.activa ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      aria-label="Toggle activa"
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${t.activa ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => abrirEditar(t)}
                      className="text-[11px] font-bold text-slate-700 hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(t)}
                      disabled={isPending}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {tarifasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No hay tarifas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {editandoId ? 'Editar Tarifa' : 'Nueva Tarifa'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</label>
                  <select
                    value={form.tipo_avaluo_codigo}
                    onChange={(e) => setForm({ ...form, tipo_avaluo_codigo: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="1.0">1.0</option>
                    <option value="2.0">2.0</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Moneda</label>
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Primera Enajenación - Vivienda Básica"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rango Mín</label>
                  <input
                    type="number"
                    value={form.rango_valor_min ?? ''}
                    onChange={(e) => setForm({ ...form, rango_valor_min: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rango Máx</label>
                  <input
                    type="number"
                    value={form.rango_valor_max ?? ''}
                    onChange={(e) => setForm({ ...form, rango_valor_max: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio</label>
                <input
                  type="number"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
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
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  className="rounded"
                />
                <span className="font-semibold text-slate-700">Activa</span>
              </label>
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
