import Image from 'next/image';
import Link from 'next/link';

export default async function ControladorDashboard({ searchParams }: any) {
  const params = await searchParams;
  const isAdmin = params?.admin === 'true';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="bg-[#0F172A] p-2 rounded-lg">
               <Image src="/logo-arqos.png" alt="ARQOS" width={24} height={24} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900">Autoridad ARQOS</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valuación Institucional</p>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              PANEL PRINCIPAL
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm border-l-4 border-slate-900">
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
              {isAdmin ? (
                <>
                  <Link href="/dashboard/admin" className="text-slate-400 font-semibold hover:text-slate-900 transition">Admin</Link>
                  <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Control</span>
                  <Link href="/dashboard/evaluador?admin=true" className="text-slate-400 font-semibold hover:text-slate-900 transition">Evaluador</Link>
                </>
              ) : (
                <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Control</span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {isAdmin ? (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-900 text-xs font-bold">AP</div>
              ) : (
                <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold">C</div>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Panel de Control Ejecutivo</p>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Supervisión de Flujos</h2>
              </div>
            </div>

            {/* MÉTRICAS */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Flujos Activos</p>
                <p className="text-4xl font-extrabold text-slate-900">12</p>
                <p className="text-xs text-slate-400 mt-1">↑ 3 desde ayer</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Aprobaciones Pendientes</p>
                <p className="text-4xl font-extrabold text-amber-500">5</p>
                <p className="text-xs text-slate-400 mt-1">Requieren revisión</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Completados Este Mes</p>
                <p className="text-4xl font-extrabold text-emerald-600">38</p>
                <p className="text-xs text-slate-400 mt-1">Meta: 40</p>
              </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-extrabold text-slate-900">Procesos de Valuación Activos</h3>
                <button className="text-xs font-bold text-slate-500 hover:text-slate-900 transition">Ver todos →</button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Identidad del Activo</th>
                    <th className="px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Evaluador</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">Plaza Lexington III</p>
                      <p className="text-[10px] font-semibold text-slate-400">ID Activo: AR-7721-X</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-900 w-8">85%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-semibold">M. Rodríguez</td>
                    <td className="px-4 py-4 text-right">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest">A Tiempo</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">Torre Corporativa Reforma</p>
                      <p className="text-[10px] font-semibold text-slate-400">ID Activo: AR-8834-B</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: '42%' }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-900 w-8">42%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-semibold">J. Peña</td>
                    <td className="px-4 py-4 text-right">
                      <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest">En Riesgo</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">Parque Industrial Norte</p>
                      <p className="text-[10px] font-semibold text-slate-400">ID Activo: AR-9012-C</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-900 w-8">100%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-semibold">A. Ledesma</td>
                    <td className="px-4 py-4 text-right">
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest">Pend. Aprobación</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}