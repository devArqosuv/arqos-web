'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sidebar del cliente — vista mucho más simple que la del valuador
// porque el cliente solo consulta: expedientes en curso, historial de
// estimaciones y ayuda.
const NAV_ITEMS = [
  { href: '/dashboard/cliente',           label: 'MIS EXPEDIENTES'    },
  { href: '/dashboard/cliente/historial', label: 'HISTORIAL'          },
];

const ICONS: Record<string, React.ReactNode> = {
  'MIS EXPEDIENTES': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  'HISTORIAL': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function ClienteSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen">
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-[#0F172A] p-2 rounded-lg">
            <Image src="/logo-arqos.png" alt="ARQOS" width={24} height={24} />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-slate-900">Portal Cliente</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">ARQOS</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <Link href="/dashboard/ayuda" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AYUDA
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            CERRAR SESIÓN
          </button>
        </form>
      </div>
    </aside>
  );
}
