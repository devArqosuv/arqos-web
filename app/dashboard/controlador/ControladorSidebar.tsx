'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard/controlador',             label: 'PANEL PRINCIPAL' },
  { href: '/dashboard/controlador/expedientes', label: 'EXPEDIENTES'     },
  { href: '/dashboard/controlador/historial',   label: 'HISTORIAL'       },
  { href: '/dashboard/controlador/analiticas',  label: 'ANALÍTICAS'      },
];

const ICONS: Record<string, React.ReactNode> = {
  'PANEL PRINCIPAL': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  'EXPEDIENTES': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'HISTORIAL': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'ANALÍTICAS': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
};

function ControladorSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';
  const adminParam = isAdmin ? '?admin=true' : '';

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

      <div className="p-4 space-y-1">
        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AYUDA
        </a>
        <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          CERRAR SESIÓN
        </Link>
      </div>
    </aside>
  );
}

export default function ControladorSidebar() {
  return (
    <Suspense fallback={<aside className="w-64 bg-white border-r border-slate-200 shrink-0 h-screen" />}>
      <ControladorSidebarInner />
    </Suspense>
  );
}