'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard/evaluador/inicio',       label: 'PANEL PRINCIPAL' },
  { href: '/dashboard/evaluador',              label: 'AVALÚOS'         },
  { href: '/dashboard/evaluador/expedientes',  label: 'EXPEDIENTES'     },
  { href: '/dashboard/evaluador/inmuebles',    label: 'INMUEBLES'       },
  { href: '/dashboard/evaluador/analiticas',   label: 'ANALÍTICAS'      },
  { href: '/dashboard/evaluador/reportes',     label: 'REPORTES'        },
];

const ICONS: Record<string, React.ReactNode> = {
  'PANEL PRINCIPAL': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  'AVALÚOS':         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  'EXPEDIENTES':     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  'INMUEBLES':       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  'ANALÍTICAS':      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
  'REPORTES':        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
};

export default function EvaluadorSidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminParam, setAdminParam] = useState('');

  useEffect(() => {
    // Leer admin mode de localStorage — sin tocar URL ni useSearchParams
    const admin = localStorage.getItem('arqos_admin_mode') === 'true';
    setIsAdmin(admin);
    setAdminParam(admin ? '?admin=true' : '');
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen">
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-[#0F172A] p-2 rounded-lg">
            <Image src="/logo-arqos.png" alt="ARQOS" width={24} height={24} />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-slate-900">Autoridad ARQOS</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valuación Institucional</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href + adminParam}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-slate-900'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {ICONS[item.label]}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 space-y-4">
        <Link
          href={`/dashboard/evaluador${adminParam}`}
          className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition"
        >
          <span>+</span> Nuevo Avalúo
        </Link>
        <div className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            AYUDA
          </a>
          <button
            onClick={() => { localStorage.removeItem('arqos_admin_mode'); window.location.href = '/login'; }}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            CERRAR SESIÓN
          </button>
        </div>
      </div>
    </aside>
  );
}