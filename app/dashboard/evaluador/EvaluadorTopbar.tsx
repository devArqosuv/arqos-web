'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function EvaluadorTopbar({ paginaActiva }: { paginaActiva: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminFromUrl = new URLSearchParams(window.location.search).get('admin') === 'true';
    if (adminFromUrl) {
      localStorage.setItem('arqos_admin_mode', 'true');
      setIsAdmin(true);
    } else {
      setIsAdmin(localStorage.getItem('arqos_admin_mode') === 'true');
    }
  }, []);

  const activeClass = 'font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]';
  const inactiveClass = 'text-slate-400 font-semibold hover:text-slate-900 transition';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-8">
        <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
        <nav className="flex gap-6 text-sm h-full items-center">
          {isAdmin ? (
            <>
              <Link href="/dashboard/admin" className={inactiveClass}>Admin</Link>
              <Link href="/dashboard/controlador?admin=true" className={inactiveClass}>Controladores</Link>
              <span className={activeClass}>Valuadores</span>
              <span className="text-slate-300">|</span>
              <Link href="/dashboard/evaluador/expedientes?admin=true" className={paginaActiva === 'Expedientes' ? activeClass : inactiveClass}>Expedientes</Link>
              <Link href="/dashboard/evaluador/inmuebles?admin=true" className={paginaActiva === 'Inmuebles' ? activeClass : inactiveClass}>Inmuebles</Link>
            </>
          ) : (
            <>
              <span className={activeClass}>Valuadores</span>
              <span className="text-slate-300">|</span>
              <Link href="/dashboard/evaluador/expedientes" className={paginaActiva === 'Expedientes' ? activeClass : inactiveClass}>Expedientes</Link>
              <Link href="/dashboard/evaluador/inmuebles" className={paginaActiva === 'Inmuebles' ? activeClass : inactiveClass}>Inmuebles</Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">{isAdmin ? 'Admin Principal' : 'Evaluador'}</p>
          <p className="text-[10px] text-slate-500">Región: Norteamérica</p>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden">
          {isAdmin ? (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-900 text-xs font-bold">AP</div>
          ) : (
            <div className="w-full h-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">EV</div>
          )}
        </div>
      </div>
    </header>
  );
}
