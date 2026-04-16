'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RolUsuario } from '@/types/arqos';
import {
  crearNoticia,
  editarNoticia,
  eliminarNoticia,
  type TipoNoticia,
} from './actions';

export interface NoticiaRow {
  id: string;
  titulo: string;
  contenido: string;
  tipo: TipoNoticia;
  roles_destinatarios: RolUsuario[];
  activa: boolean;
  fecha_publicacion: string;
  fecha_expiracion: string | null;
  created_at: string;
}

const ROLES_DISPONIBLES: { key: RolUsuario; label: string }[] = [
  { key: 'administrador', label: 'Administradores' },
  { key: 'evaluador', label: 'Valuadores' },
  { key: 'controlador', label: 'Controladores' },
];

const TIPOS: { key: TipoNoticia; label: string; color: string }[] = [
  { key: 'info', label: 'Información', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'actualizacion', label: 'Actualización', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'alerta', label: 'Alerta', color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'mantenimiento', label: 'Mantenimiento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

function colorBadge(tipo: TipoNoticia): string {
  return TIPOS.find((t) => t.key === tipo)?.color ?? TIPOS[0].color;
}

function etiquetaTipo(tipo: TipoNoticia): string {
  return TIPOS.find((t) => t.key === tipo)?.label ?? tipo;
}

interface FormState {
  id: string | null;
  titulo: string;
  contenido: string;
  tipo: TipoNoticia;
  roles: RolUsuario[];
  fecha_expiracion: string;
  activa: boolean;
}

const FORM_VACIO: FormState = {
  id: null,
  titulo: '',
  contenido: '',
  tipo: 'info',
  roles: ['administrador', 'evaluador', 'controlador'],
  fecha_expiracion: '',
  activa: true,
};

export default function NoticiasAdminClient({ noticias }: { noticias: NoticiaRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  function abrirCrear() {
    setForm(FORM_VACIO);
    setModalAbierto(true);
  }

  function abrirEditar(n: NoticiaRow) {
    setForm({
      id: n.id,
      titulo: n.titulo,
      contenido: n.contenido,
      tipo: n.tipo,
      roles: n.roles_destinatarios,
      fecha_expiracion: n.fecha_expiracion ? n.fecha_expiracion.slice(0, 16) : '',
      activa: n.activa,
    });
    setModalAbierto(true);
  }

  function toggleRol(rol: RolUsuario) {
    setForm((f) =>
      f.roles.includes(rol)
        ? { ...f, roles: f.roles.filter((r) => r !== rol) }
        : { ...f, roles: [...f.roles, rol] }
    );
  }

  function handleGuardar() {
    if (!form.titulo.trim() || !form.contenido.trim()) {
      setMensaje({ texto: 'Título y contenido son obligatorios.', tipo: 'error' });
      return;
    }
    if (form.roles.length === 0) {
      setMensaje({ texto: 'Selecciona al menos un rol destinatario.', tipo: 'error' });
      return;
    }

    startTransition(async () => {
      const fechaExp = form.fecha_expiracion ? new Date(form.fecha_expiracion).toISOString() : null;
      const res = form.id
        ? await editarNoticia({
            id: form.id,
            titulo: form.titulo,
            contenido: form.contenido,
            tipo: form.tipo,
            roles_destinatarios: form.roles,
            fecha_expiracion: fechaExp,
            activa: form.activa,
          })
        : await crearNoticia({
            titulo: form.titulo,
            contenido: form.contenido,
            tipo: form.tipo,
            roles_destinatarios: form.roles,
            fecha_expiracion: fechaExp,
          });

      setMensaje({ texto: res.mensaje, tipo: res.exito ? 'exito' : 'error' });
      if (res.exito) {
        setModalAbierto(false);
        router.refresh();
      }
    });
  }

  function handleEliminar(id: string, titulo: string) {
    if (!confirm(`¿Archivar la noticia "${titulo}"? Dejará de mostrarse a los usuarios.`)) return;
    startTransition(async () => {
      const res = await eliminarNoticia(id);
      setMensaje({ texto: res.mensaje, tipo: res.exito ? 'exito' : 'error' });
      if (res.exito) router.refresh();
    });
  }

  return (
    <div className="p-8 overflow-y-auto flex-1">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              Comunicaciones
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Noticias</h2>
            <p className="text-xs text-slate-500 mt-1">
              Publica avisos internos que se muestran en el panel de cada rol.
            </p>
          </div>
          <button
            onClick={abrirCrear}
            className="bg-[#0F172A] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl tracking-wide transition"
          >
            + NUEVA NOTICIA
          </button>
        </div>

        {mensaje && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              mensaje.tipo === 'exito'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <p className="text-sm font-bold">{mensaje.texto}</p>
            <button
              onClick={() => setMensaje(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {noticias.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-700 font-bold text-sm">Aún no hay noticias</p>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Publica la primera para informar al equipo.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Destinatarios</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Publicada</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {noticias.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border ${colorBadge(
                          n.tipo
                        )}`}
                      >
                        {etiquetaTipo(n.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-900">{n.titulo}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-md">{n.contenido}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {n.roles_destinatarios.map((r) =>
                          r === 'evaluador' ? 'Valuador' : r === 'controlador' ? 'Controlador' : 'Admin'
                        ).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {n.activa ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Activa
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          Archivada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-500 font-semibold">
                      {new Date(n.fecha_publicacion).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => abrirEditar(n)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded"
                      >
                        Editar
                      </button>
                      {n.activa && (
                        <button
                          onClick={() => handleEliminar(n.id, n.titulo)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded"
                        >
                          Archivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {form.id ? 'Editar noticia' : 'Nueva noticia'}
                </p>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {form.id ? 'Actualizar publicación' : 'Publicar aviso'}
                </h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
                disabled={isPending}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Nuevo módulo disponible..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Contenido
                </label>
                <textarea
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                  placeholder="Explica el aviso con detalle..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoNoticia })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Expira (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_expiracion}
                    onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Destinatarios
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES_DISPONIBLES.map((r) => {
                    const activo = form.roles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => toggleRol(r.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          activo
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {activo ? '✓ ' : ''}
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.id && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.activa}
                    onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Noticia activa (visible para los destinatarios)
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0F172A] hover:bg-slate-700 transition disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
