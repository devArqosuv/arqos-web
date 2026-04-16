'use client';

import { useState, useTransition } from 'react';
import {
  crearBanco,
  actualizarBanco,
  eliminarBanco,
  crearBancoDocumento,
  actualizarBancoDocumento,
  eliminarBancoDocumento,
  type BancoInput,
  type BancoDocumentoInput,
} from './actions';

interface BancoDocumento {
  id: string;
  banco_id: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  orden: number;
}

export interface BancoConDocs {
  id: string;
  nombre: string;
  logo_url: string | null;
  color_hex: string | null;
  activo: boolean;
  orden: number;
  documentos: BancoDocumento[];
}

interface Props {
  bancos: BancoConDocs[];
}

const EMPTY_BANCO: BancoInput = {
  nombre: '',
  logo_url: null,
  color_hex: '#0F172A',
  activo: true,
  orden: 0,
};

const EMPTY_DOC: BancoDocumentoInput = {
  nombre: '',
  descripcion: null,
  obligatorio: true,
  orden: 0,
};

export default function BancosClient({ bancos }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(bancos[0]?.id ?? null);
  const [modalBanco, setModalBanco] = useState<{ open: boolean; id: string | null; form: BancoInput }>({
    open: false, id: null, form: EMPTY_BANCO,
  });
  const [modalDoc, setModalDoc] = useState<{ open: boolean; id: string | null; form: BancoDocumentoInput }>({
    open: false, id: null, form: EMPTY_DOC,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bancoSel = bancos.find((b) => b.id === selectedId) ?? null;

  const abrirNuevoBanco = () => {
    setModalBanco({ open: true, id: null, form: { ...EMPTY_BANCO, orden: bancos.length } });
    setError(null);
  };

  const abrirEditarBanco = (b: BancoConDocs) => {
    setModalBanco({
      open: true,
      id: b.id,
      form: {
        nombre: b.nombre,
        logo_url: b.logo_url,
        color_hex: b.color_hex,
        activo: b.activo,
        orden: b.orden,
      },
    });
    setError(null);
  };

  const guardarBanco = () => {
    setError(null);
    if (!modalBanco.form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    startTransition(async () => {
      const res = modalBanco.id
        ? await actualizarBanco(modalBanco.id, modalBanco.form)
        : await crearBanco(modalBanco.form);
      if (!res.ok) return setError(res.error);
      setModalBanco({ open: false, id: null, form: EMPTY_BANCO });
    });
  };

  const borrarBanco = (b: BancoConDocs) => {
    if (!confirm(`¿Eliminar banco "${b.nombre}"? Esto también eliminará sus documentos.`)) return;
    startTransition(async () => {
      const res = await eliminarBanco(b.id);
      if (!res.ok) return alert(`Error: ${res.error}`);
      if (selectedId === b.id) setSelectedId(null);
    });
  };

  const abrirNuevoDoc = () => {
    if (!bancoSel) return;
    setModalDoc({
      open: true,
      id: null,
      form: { ...EMPTY_DOC, orden: bancoSel.documentos.length },
    });
    setError(null);
  };

  const abrirEditarDoc = (d: BancoDocumento) => {
    setModalDoc({
      open: true,
      id: d.id,
      form: {
        nombre: d.nombre,
        descripcion: d.descripcion,
        obligatorio: d.obligatorio,
        orden: d.orden,
      },
    });
    setError(null);
  };

  const guardarDoc = () => {
    if (!bancoSel) return;
    setError(null);
    if (!modalDoc.form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    startTransition(async () => {
      const res = modalDoc.id
        ? await actualizarBancoDocumento(modalDoc.id, modalDoc.form)
        : await crearBancoDocumento(bancoSel.id, modalDoc.form);
      if (!res.ok) return setError(res.error);
      setModalDoc({ open: false, id: null, form: EMPTY_DOC });
    });
  };

  const borrarDoc = (d: BancoDocumento) => {
    if (!confirm(`¿Eliminar documento "${d.nombre}"?`)) return;
    startTransition(async () => {
      const res = await eliminarBancoDocumento(d.id);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catálogo</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Bancos</h1>
          <p className="text-xs text-slate-500 mt-1">{bancos.length} bancos configurados</p>
        </div>
        <button
          onClick={abrirNuevoBanco}
          className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          NUEVO BANCO
        </button>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_1fr] gap-6 p-8">
        {/* LISTA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lista de bancos</p>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {bancos.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No hay bancos registrados</div>
            )}
            {bancos.map((b) => (
              <div
                key={b.id}
                className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition flex items-center gap-3 ${selectedId === b.id ? 'bg-slate-50' : ''}`}
                onClick={() => setSelectedId(b.id)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: b.color_hex ?? '#0F172A' }}
                >
                  {b.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{b.nombre}</div>
                  <div className="text-[11px] text-slate-400">
                    {b.documentos.length} docs · orden {b.orden} · {b.activo ? 'activo' : 'inactivo'}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); abrirEditarBanco(b); }}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-900"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); borrarBanco(b); }}
                  disabled={isPending}
                  className="text-[11px] font-bold text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DOCUMENTOS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documentos requeridos</p>
              {bancoSel && <p className="text-sm font-bold text-slate-900 mt-0.5">{bancoSel.nombre}</p>}
            </div>
            {bancoSel && (
              <button
                onClick={abrirNuevoDoc}
                className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                + DOCUMENTO
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {!bancoSel && (
              <div className="p-8 text-center text-slate-400 text-sm">Selecciona un banco para ver sus documentos</div>
            )}
            {bancoSel && bancoSel.documentos.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">Sin documentos. Agrega el primero.</div>
            )}
            {bancoSel && bancoSel.documentos.map((d) => (
              <div key={d.id} className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${d.obligatorio ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                  {d.obligatorio ? 'Obligatorio' : 'Opcional'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900">{d.nombre}</div>
                  {d.descripcion && <div className="text-[11px] text-slate-400 mt-0.5">{d.descripcion}</div>}
                </div>
                <button
                  onClick={() => abrirEditarDoc(d)}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => borrarDoc(d)}
                  disabled={isPending}
                  className="text-[11px] font-bold text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL BANCO */}
      {modalBanco.open && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {modalBanco.id ? 'Editar Banco' : 'Nuevo Banco'}
              </h2>
              <button
                onClick={() => setModalBanco({ open: false, id: null, form: EMPTY_BANCO })}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">{error}</div>}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
                <input
                  type="text"
                  value={modalBanco.form.nombre}
                  onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, nombre: e.target.value } })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logo URL</label>
                <input
                  type="url"
                  value={modalBanco.form.logo_url ?? ''}
                  onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, logo_url: e.target.value || null } })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Color hex</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={modalBanco.form.color_hex ?? '#0F172A'}
                      onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, color_hex: e.target.value } })}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={modalBanco.form.color_hex ?? ''}
                      onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, color_hex: e.target.value || null } })}
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Orden</label>
                  <input
                    type="number"
                    value={modalBanco.form.orden}
                    onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, orden: Number(e.target.value) } })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={modalBanco.form.activo}
                  onChange={(e) => setModalBanco({ ...modalBanco, form: { ...modalBanco.form, activo: e.target.checked } })}
                />
                <span className="font-semibold text-slate-700">Activo</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalBanco({ open: false, id: null, form: EMPTY_BANCO })}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarBanco}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOCUMENTO */}
      {modalDoc.open && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {modalDoc.id ? 'Editar Documento' : 'Nuevo Documento'}
              </h2>
              <button
                onClick={() => setModalDoc({ open: false, id: null, form: EMPTY_DOC })}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">{error}</div>}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
                <input
                  type="text"
                  value={modalDoc.form.nombre}
                  onChange={(e) => setModalDoc({ ...modalDoc, form: { ...modalDoc.form, nombre: e.target.value } })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descripción</label>
                <textarea
                  rows={2}
                  value={modalDoc.form.descripcion ?? ''}
                  onChange={(e) => setModalDoc({ ...modalDoc, form: { ...modalDoc.form, descripcion: e.target.value || null } })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Orden</label>
                <input
                  type="number"
                  value={modalDoc.form.orden}
                  onChange={(e) => setModalDoc({ ...modalDoc, form: { ...modalDoc.form, orden: Number(e.target.value) } })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={modalDoc.form.obligatorio}
                  onChange={(e) => setModalDoc({ ...modalDoc, form: { ...modalDoc.form, obligatorio: e.target.checked } })}
                />
                <span className="font-semibold text-slate-700">Obligatorio</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalDoc({ open: false, id: null, form: EMPTY_DOC })}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarDoc}
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
