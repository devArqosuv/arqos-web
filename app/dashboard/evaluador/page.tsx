import Image from 'next/image';
import Link from 'next/link';

// Recibimos searchParams para ver si trae el ?admin=true
export default async function EvaluadorDashboard({ searchParams }: any) {
  const params = await searchParams;
  const isAdmin = params?.admin === 'true'; // Verificamos si tiene el pase VIP

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 flex items-center gap-3 mb-2">
            <div className="bg-[#0F172A] p-2 rounded-lg">
               <Image src="/logo-arqos.png" alt="ARQOS" width={24} height={24} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900">Autoridad ARQOS</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valuación Institucional</p>
            </div>
          </div>

          <div className="px-4 mb-6">
             <button className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition">
              <span>+</span> Nuevo Avalúo
            </button>
          </div>

          <nav className="p-4 space-y-1 pt-0">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm border-l-4 border-slate-900">
              PANEL PRINCIPAL
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              AVALÚOS
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              ANALÍTICAS
            </a>
          </nav>
        </div>

        <div className="p-4 space-y-1 mb-4">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
            AYUDA
          </a>
          <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 rounded-lg">
            CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
            
            {/* LÓGICA DE LA NAVEGACIÓN */}
            <nav className="flex gap-6 text-sm h-full items-center">
              {isAdmin ? (
                <>
                  <Link href="/dashboard/admin" className="text-slate-400 font-semibold hover:text-slate-900 transition">Admin</Link>
                  <Link href="/dashboard/controlador?admin=true" className="text-slate-400 font-semibold hover:text-slate-900 transition">Control</Link>
                  <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Valuador</span>
                </>
              ) : (
                <>
                  <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Valuador</span>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-8 h-8 rounded-full overflow-hidden">
               {/* Lógica del Avatar */}
               {isAdmin ? (
                 <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-900 text-xs font-bold">AP</div>
               ) : (
                 <div className="w-full h-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">EV</div>
               )}
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="max-w-[1200px] mx-auto">
            
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Panel de Valuador</h2>
                <p className="text-sm text-slate-500">Bienvenido de nuevo. Tienes <span className="font-bold text-slate-900">4 revisiones pendientes</span> para hoy.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900">Valuación Activa: Expansión del Puerto de Valencia</h3>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">En Progreso</span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Valor Base del Activo (Est.)</label>
                  <input type="text" defaultValue="€ 142,500,000" className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Nota de Evaluación de Riesgos</label>
                  <textarea 
                    placeholder="Ingrese factores específicos de riesgo..." 
                    className="w-full h-[120px] bg-slate-100 border border-slate-200 text-slate-600 text-sm px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 italic resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}