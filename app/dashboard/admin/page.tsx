import Image from 'next/image';
import Link from 'next/link';

export default function AdminDashboard() {
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
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valuación Institucional</p>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm border-l-4 border-slate-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              PANEL PRINCIPAL
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              AVALÚOS
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              ANALÍTICAS
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              USUARIOS
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              SEGURIDAD
            </a>
          </nav>
        </div>
        <div className="p-4 space-y-4">
          <button className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2">
            <span>+</span> Nuevo Avalúo
          </button>
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AYUDA
            </a>
            <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              CERRAR SESIÓN
            </Link>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
            <nav className="flex gap-6 text-sm h-full items-center">
              <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Admin</span>
              <Link href="/dashboard/controlador?admin=true" className="text-slate-400 font-semibold hover:text-slate-900 transition">Controladores</Link>
              <Link href="/dashboard/evaluador?admin=true" className="text-slate-400 font-semibold hover:text-slate-900 transition">Valuador</Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">Admin Principal</p>
                <p className="text-[10px] text-slate-500">Región: Norteamérica</p>
              </div>
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">AP</div>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Panel Administrativo</p>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Control de Usuarios Institucionales</h2>
              </div>
            </div>

            <section>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Región</th>
                      <th className="px-6 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-800 text-white flex items-center justify-center text-xs font-bold">AL</div>
                          <span className="text-slate-900 font-bold">Alejandro Ledesma</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">Controlador Senior</td>
                      <td className="px-6 py-4">MX-CDMX</td>
                      <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">En línea</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center text-xs font-bold">MR</div>
                          <span className="text-slate-900 font-bold">María Rodríguez</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">Evaluador Jr.</td>
                      <td className="px-6 py-4">MX-MTY</td>
                      <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">En línea</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-400 text-white flex items-center justify-center text-xs font-bold">JP</div>
                          <span className="text-slate-900 font-bold">Jorge Peña</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">Evaluador Sr.</td>
                      <td className="px-6 py-4">MX-GDL</td>
                      <td className="px-6 py-4"><span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Inactivo</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}