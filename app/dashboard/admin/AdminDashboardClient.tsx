'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/util/supabase/client';
import TablaResumenBanco, { type AvaluoParaTabla } from '@/app/components/TablaResumenBanco';
import {
  crearUsuarioAction,
  actualizarUsuarioAction,
  eliminarUsuarioAction,
} from './actions';

// ── Tipos ─────────────────────────────────────────────────
interface Usuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  rol: 'administrador' | 'controlador' | 'evaluador';
  activo: boolean;
  created_at: string;
}

interface ProyectoAprobado {
  id: string;
  folio: string | null;
  estado: string;
  calle: string;
  colonia: string | null;
  municipio: string;
  estado_inmueble: string;
  valor_estimado: number | null;
  moneda: string;
  fecha_aprobacion: string | null;
  valuador: { nombre: string; apellidos: string | null } | null;
  controlador: { nombre: string; apellidos: string | null } | null;
}

type Tab = 'resumen' | 'usuarios' | 'proyectos';

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  controlador: 'Controlador',
  evaluador: 'Valuador',
};

const ROL_COLOR: Record<string, string> = {
  administrador: 'bg-slate-800',
  controlador: 'bg-teal-700',
  evaluador: 'bg-slate-500',
};

function iniciales(nombre: string, apellidos: string | null) {
  const a = nombre?.trim()?.[0] ?? '?';
  const b = apellidos?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

function nombreCompleto(u: { nombre: string; apellidos: string | null } | null) {
  if (!u) return '—';
  return `${u.nombre} ${u.apellidos ?? ''}`.trim();
}

export default function AdminDashboardClient({
  usuarios,
  proyectos,
  adminId,
}: {
  usuarios: Usuario[];
  proyectos: ProyectoAprobado[];
  adminId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('resumen');
  const [modalCrear, setModalCrear] = useState(false);

  // Tabla resumen por banco (TODOS los avalúos del sistema)
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear());
  const [avaluosResumen, setAvaluosResumen] = useState<AvaluoParaTabla[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  useEffect(() => {
    if (tab !== 'resumen') return;
    let cancelado = false;
    async function cargar() {
      setCargandoResumen(true);
      const supabase = createClient();
      const inicio = new Date(anioResumen, 0, 1).toISOString();
      const fin = new Date(anioResumen + 1, 0, 1).toISOString();
      const { data } = await supabase
        .from('avaluos')
        .select('id, estado, banco_id, banco:banco_id (nombre)')
        .gte('fecha_solicitud', inicio)
        .lt('fecha_solicitud', fin);
      if (cancelado) return;
      const aplanados = ((data ?? []) as Array<Omit<AvaluoParaTabla, 'banco'> & { banco: { nombre: string }[] | { nombre: string } | null }>).map((a) => ({
        ...a,
        banco: Array.isArray(a.banco) ? a.banco[0] ?? null : a.banco,
      }));
      setAvaluosResumen(aplanados);
      setCargandoResumen(false);
    }
    cargar();
    return () => { cancelado = true; };
  }, [tab, anioResumen]);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Usuario | null>(null);
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const mostrarToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCrear = async (formData: FormData) => {
    startTransition(async () => {
      const res = await crearUsuarioAction(formData);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setModalCrear(false);
        router.refresh();
      }
    });
  };

  const handleActualizar = async (formData: FormData) => {
    startTransition(async () => {
      const res = await actualizarUsuarioAction(formData);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setEditando(null);
        router.refresh();
      }
    });
  };

  const handleEliminar = async (id: string) => {
    startTransition(async () => {
      const res = await eliminarUsuarioAction(id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) {
        setConfirmarEliminar(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="p-8 overflow-y-auto flex-1">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Panel Administrativo</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {tab === 'resumen' ? 'Resumen General' : tab === 'usuarios' ? 'Gestión de Usuarios' : 'Proyectos Aprobados'}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {([
            { key: 'resumen' as Tab, label: 'RESUMEN' },
            { key: 'usuarios' as Tab, label: 'USUARIOS' },
            { key: 'proyectos' as Tab, label: 'PROYECTOS APROBADOS' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-bold transition border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-xs font-semibold ${
              toast.tipo === 'exito'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {toast.texto}
          </div>
        )}

        {/* TAB: RESUMEN (tabla SAX con TODOS los avalúos del sistema) */}
        {tab === 'resumen' && (
          <TablaResumenBanco
            avaluos={avaluosResumen}
            cargando={cargandoResumen}
            anio={anioResumen}
            setAnio={setAnioResumen}
            titulo="Reporte General — Todos los Avalúos"
          />
        )}

        {/* TAB: USUARIOS */}
        {tab === 'usuarios' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {usuarios.length} usuario{usuarios.length === 1 ? '' : 's'} registrado{usuarios.length === 1 ? '' : 's'}
              </p>
              <button
                onClick={() => setModalCrear(true)}
                className="bg-[#0F172A] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                NUEVO USUARIO
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-semibold">
                        No hay usuarios registrados todavía.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded ${ROL_COLOR[u.rol] || 'bg-slate-400'} text-white flex items-center justify-center text-xs font-bold`}>
                              {iniciales(u.nombre, u.apellidos)}
                            </div>
                            <span className="text-slate-900 font-bold">
                              {u.nombre} {u.apellidos ?? ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{u.email}</td>
                        <td className="px-6 py-4">{ROL_LABEL[u.rol] || u.rol}</td>
                        <td className="px-6 py-4">
                          {u.activo ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Activo</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Inactivo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditando(u)}
                              className="text-[10px] font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                            >
                              EDITAR
                            </button>
                            <button
                              onClick={() => setConfirmarEliminar(u)}
                              disabled={u.id === adminId}
                              className="text-[10px] font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:text-slate-300 disabled:border-slate-200 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition"
                              title={u.id === adminId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                            >
                              ELIMINAR
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB: PROYECTOS APROBADOS */}
        {tab === 'proyectos' && (
          <section className="space-y-4">
            <p className="text-xs font-bold text-slate-500">
              {proyectos.length} proyecto{proyectos.length === 1 ? '' : 's'} aprobado{proyectos.length === 1 ? '' : 's'} por controlador
            </p>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Folio</th>
                    <th className="px-6 py-4">Inmueble</th>
                    <th className="px-6 py-4">Valuador</th>
                    <th className="px-6 py-4">Controlador</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Aprobado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {proyectos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold">
                        Aún no hay proyectos aprobados.
                      </td>
                    </tr>
                  ) : (
                    proyectos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-slate-900">{p.folio ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-800 font-semibold truncate max-w-[240px]">
                            {p.calle}
                            {p.colonia ? `, ${p.colonia}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.municipio}, {p.estado_inmueble}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {nombreCompleto(p.valuador)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {nombreCompleto(p.controlador)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-800">
                          {p.valor_estimado
                            ? `${p.moneda} $${Number(p.valor_estimado).toLocaleString('es-MX')}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-[11px] text-slate-500">
                          {p.fecha_aprobacion
                            ? new Date(p.fecha_aprobacion).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* MODAL: CREAR USUARIO */}
      {modalCrear && (
        <Modal titulo="Nuevo usuario" onClose={() => setModalCrear(false)}>
          <form action={handleCrear} className="space-y-4">
            <CampoTexto label="Nombre *" name="nombre" required />
            <CampoTexto label="Apellidos" name="apellidos" />
            <CampoTexto label="Correo *" name="email" type="email" required />
            <CampoTexto label="Contraseña *" name="password" type="password" required minLength={5} />
            <CampoRol name="rol" defaultValue="evaluador" />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalCrear(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
              >
                {pending ? 'CREANDO…' : 'CREAR USUARIO'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: EDITAR USUARIO */}
      {editando && (
        <Modal titulo={`Editar ${editando.email}`} onClose={() => setEditando(null)}>
          <form action={handleActualizar} className="space-y-4">
            <input type="hidden" name="id" value={editando.id} />
            <CampoTexto label="Nombre *" name="nombre" defaultValue={editando.nombre} required />
            <CampoTexto label="Apellidos" name="apellidos" defaultValue={editando.apellidos ?? ''} />
            <CampoTexto label="Correo *" name="email" type="email" defaultValue={editando.email} required />
            <CampoTexto
              label="Nueva contraseña (dejar vacío para no cambiar)"
              name="password"
              type="password"
              minLength={5}
            />
            <CampoRol name="rol" defaultValue={editando.rol} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="activo" value="false" />
              <input
                type="checkbox"
                name="activo"
                value="true"
                defaultChecked={editando.activo}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700">Usuario activo</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
              >
                {pending ? 'GUARDANDO…' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR */}
      {confirmarEliminar && (
        <Modal titulo="¿Eliminar usuario?" onClose={() => setConfirmarEliminar(null)}>
          <p className="text-sm text-slate-600 mb-6">
            Vas a eliminar permanentemente a <span className="font-bold text-slate-900">{confirmarEliminar.email}</span>.
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmarEliminar(null)}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={() => handleEliminar(confirmarEliminar.id)}
              disabled={pending}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs font-bold transition"
            >
              {pending ? 'ELIMINANDO…' : 'SÍ, ELIMINAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────
function Modal({
  titulo,
  children,
  onClose,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        minLength={minLength}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
      />
    </div>
  );
}

function CampoRol({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rol *</label>
      <select
        name={name}
        defaultValue={defaultValue}
        required
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
      >
        <option value="evaluador">Valuador</option>
        <option value="controlador">Controlador</option>
        <option value="administrador">Administrador</option>
      </select>
    </div>
  );
}
