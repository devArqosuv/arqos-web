import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/util/supabase/server';
import AdminDashboardClient from './AdminDashboardClient';

function iniciales(nombre: string, apellidos: string | null) {
  const a = nombre?.trim()?.[0] ?? '?';
  const b = apellidos?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Verificar sesión y rol
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfilActual } = await supabase
    .from('perfiles')
    .select('nombre, apellidos, email, rol')
    .eq('id', user.id)
    .single();

  if (perfilActual?.rol !== 'administrador') {
    if (perfilActual?.rol === 'controlador') redirect('/dashboard/controlador');
    redirect('/dashboard/evaluador');
  }

  // Listar todos los usuarios institucionales
  const { data: usuariosRaw } = await supabase
    .from('perfiles')
    .select('id, nombre, apellidos, email, rol, activo, created_at')
    .order('created_at', { ascending: false });

  const usuarios = (usuariosRaw ?? []).map((u) => ({
    ...u,
    rol: u.rol as 'administrador' | 'controlador' | 'evaluador',
  }));

  // Listar proyectos aprobados con valuador y controlador embebidos
  const { data: proyectosRaw } = await supabase
    .from('avaluos')
    .select(`
      id, folio, estado, calle, colonia, municipio, estado_inmueble,
      valor_estimado, moneda, fecha_aprobacion,
      valuador:valuador_id (nombre, apellidos),
      controlador:controlador_id (nombre, apellidos)
    `)
    .eq('estado', 'aprobado')
    .order('fecha_aprobacion', { ascending: false });

  // Supabase devuelve las relaciones como array aunque sea *-to-one; aplanamos
  type RawProyecto = {
    id: string;
    folio: string | null;
    estado: string;
    calle: string;
    colonia: string | null;
    municipio: string;
    estado_inmueble: string;
    valor_estimado: number | null;
    moneda: string;
    fecha_aprobacion: string | null;
    valuador: { nombre: string; apellidos: string | null } | { nombre: string; apellidos: string | null }[] | null;
    controlador: { nombre: string; apellidos: string | null } | { nombre: string; apellidos: string | null }[] | null;
  };

  const proyectos = ((proyectosRaw as RawProyecto[] | null) ?? []).map((p) => ({
    ...p,
    valuador: Array.isArray(p.valuador) ? p.valuador[0] ?? null : p.valuador,
    controlador: Array.isArray(p.controlador) ? p.controlador[0] ?? null : p.controlador,
  }));

  const nombreAdmin = `${perfilActual.nombre ?? ''} ${perfilActual.apellidos ?? ''}`.trim() || 'Administrador';

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
            <span className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg text-sm border-l-4 border-slate-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              PANEL ADMIN
            </span>
            <Link href="/dashboard/controlador" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              CONTROLADORES
            </Link>
            <Link href="/dashboard/evaluador" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              VALUADOR
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
              <Link href="/dashboard/evaluador" className="text-slate-400 font-semibold hover:text-slate-900 transition">Valuador</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{nombreAdmin}</p>
              <p className="text-[10px] text-slate-500">{perfilActual.email}</p>
            </div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
              {iniciales(perfilActual.nombre, perfilActual.apellidos)}
            </div>
          </div>
        </header>

        <AdminDashboardClient
          usuarios={usuarios}
          proyectos={proyectos}
          adminId={user.id}
        />
      </main>
    </div>
  );
}
