import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';

function iniciales(nombre: string, apellidos: string | null) {
  const a = nombre?.trim()?.[0] ?? '?';
  const b = apellidos?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireRole(['administrador']);
  const nombreAdmin = `${perfil.nombre ?? ''} ${perfil.apellidos ?? ''}`.trim() || 'Administrador';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-100">
            <div className="bg-[#0F172A] p-2 rounded-lg">
              <Image src="/logo-arqos.png" alt="ARQOS" width={24} height={24} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900">Autoridad ARQOS</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Unidad de Valuación</p>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm border-l-4 border-slate-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              PANEL ADMIN
            </Link>
            <Link href="/dashboard/controlador" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              CONTROLADORES
            </Link>
            <Link href="/dashboard/valuador" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              VALUADOR
            </Link>
            <Link href="/dashboard/admin/tabla" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              TABLA SHF
            </Link>
            <Link href="/dashboard/admin/tarifas" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              TARIFAS
            </Link>
            <Link href="/dashboard/admin/bancos" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" /></svg>
              BANCOS
            </Link>
            <Link href="/dashboard/admin/usuarios" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              USUARIOS
            </Link>
            <Link href="/dashboard/admin/costos" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              COSTOS
            </Link>
            <Link href="/dashboard/admin/noticias" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
              NOTICIAS
            </Link>
            <Link href="/dashboard/admin/redes" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
              REDES
            </Link>
            <Link href="/dashboard/ayuda" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AYUDA
            </Link>
          </nav>
        </div>
        <div className="p-4 space-y-1">
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              CERRAR SESIÓN
            </button>
          </form>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
            <nav className="flex gap-6 text-sm h-full items-center">
              <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Admin</span>
              <Link href="/dashboard/controlador" className="text-slate-400 font-semibold hover:text-slate-900 transition">Controladores</Link>
              <Link href="/dashboard/valuador" className="text-slate-400 font-semibold hover:text-slate-900 transition">Valuador</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{nombreAdmin}</p>
              <p className="text-[10px] text-slate-500">{perfil.email}</p>
            </div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
              {iniciales(perfil.nombre, perfil.apellidos)}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
