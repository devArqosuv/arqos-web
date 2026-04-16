'use client';

import { useState, useMemo, useTransition } from 'react';
import { toggleUsuarioActivo, cambiarRolUsuario, type RolUsuario } from './actions';

export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string | null;
  avatar_url: string | null;
}

interface Props {
  usuarios: Usuario[];
  adminId: string;
}

const ROL_COLORS: Record<RolUsuario, string> = {
  administrador: 'bg-violet-100 text-violet-700',
  evaluador: 'bg-blue-100 text-blue-700',
  controlador: 'bg-emerald-100 text-emerald-700',
};

function iniciales(nombre: string, apellidos: string | null): string {
  const a = nombre?.trim()?.[0] ?? '?';
  const b = apellidos?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

function formatFecha(f: string | null): string {
  if (!f) return '—';
  try {
    return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

export default function UsuariosClient({ usuarios, adminId }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [filtroActivo, setFiltroActivo] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    let r = usuarios;
    if (filtroRol) r = r.filter((u) => u.rol === filtroRol);
    if (filtroActivo) r = r.filter((u) => u.activo === (filtroActivo === 'activo'));
    if (busqueda) {
      const q = busqueda.toLowerCase();
      r = r.filter((u) =>
        u.nombre.toLowerCase().includes(q) ||
        (u.apellidos ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return r;
  }, [usuarios, busqueda, filtroRol, filtroActivo]);

  const toggleActivo = (u: Usuario) => {
    setLoadingId(u.id);
    startTransition(async () => {
      const res = await toggleUsuarioActivo(u.id, !u.activo);
      setLoadingId(null);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  const cambiarRol = (u: Usuario, nuevoRol: RolUsuario) => {
    if (nuevoRol === u.rol) return;
    setLoadingId(u.id);
    startTransition(async () => {
      const res = await cambiarRolUsuario(u.id, nuevoRol);
      setLoadingId(null);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gestión</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Usuarios</h1>
          <p className="text-xs text-slate-500 mt-1">{filtrados.length} de {usuarios.length} usuarios</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar nombre, email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 w-60 focus:ring-2 focus:ring-slate-900 outline-none"
          />
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="evaluador">Evaluador</option>
            <option value="controlador">Controlador</option>
          </select>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Usuario</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Email</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Rol</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Activo</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const esSelf = u.id === adminId;
                const busy = loadingId === u.id && isPending;
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">
                          {iniciales(u.nombre, u.apellidos)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {u.nombre} {u.apellidos ?? ''}
                            {esSelf && <span className="ml-2 text-[10px] font-bold text-slate-400">(tú)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[12px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRol(u, e.target.value as RolUsuario)}
                        disabled={busy || (esSelf && true)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-slate-900 outline-none disabled:opacity-60 ${ROL_COLORS[u.rol]}`}
                      >
                        <option value="administrador">Administrador</option>
                        <option value="evaluador">Evaluador</option>
                        <option value="controlador">Controlador</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActivo(u)}
                        disabled={busy || esSelf}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${u.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        aria-label="Toggle activo"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${u.activo ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{formatFecha(u.created_at)}</td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No se encontraron usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 px-1">
          La creación de usuarios nuevos se maneja desde el panel principal admin (crea vía auth.admin del servidor).
        </p>
      </div>
    </div>
  );
}
