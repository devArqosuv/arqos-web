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
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm">PANEL PRINCIPAL</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">AVALÚOS</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">ANALÍTICAS</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">USUARIOS</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">SEGURIDAD</a>
          </nav>
        </div>
        <div className="p-4 space-y-4">
          <button className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-bold text-sm tracking-wide">NUEVO AVALÚO</button>
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">AYUDA</a>
            <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">CERRAR SESIÓN</Link>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="font-extrabold text-lg tracking-tight">ARQOS</h1>
            
            {/* AQUÍ MANDAMOS EL PASE VIP EN LA URL */}
            <nav className="flex gap-6 text-sm h-full items-center">
              <Link href="/dashboard/admin" className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Admin</Link>
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
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 text-white flex items-center justify-center text-xs">AL</div>
                        <span className="text-slate-900 font-bold">Alejandro Ledesma</span>
                      </td>
                      <td className="px-6 py-4">Controlador Senior</td>
                      <td className="px-6 py-4">MX-CDMX</td>
                      <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">En línea</span></td>
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