'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';

interface PerfilLigero {
  nombre: string;
  apellidos: string | null;
  email: string;
  rol: 'administrador' | 'evaluador' | 'controlador';
}

function iniciales(nombre: string, apellidos: string | null) {
  const a = nombre?.trim()?.[0] ?? '?';
  const b = apellidos?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

export default function ControladorTopbar() {
  const [perfil, setPerfil] = useState<PerfilLigero | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('perfiles')
        .select('nombre, apellidos, email, rol')
        .eq('id', user.id)
        .single();
      if (!cancelado && data) setPerfil(data as PerfilLigero);
    }
    cargar();
    return () => { cancelado = true; };
  }, []);

  const isAdmin = perfil?.rol === 'administrador';

  const nombreCompleto = perfil
    ? `${perfil.nombre} ${perfil.apellidos ?? ''}`.trim()
    : 'Controlador';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-8">
        <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
        <nav className="flex gap-6 text-sm h-full items-center">
          {isAdmin && (
            <Link href="/dashboard/admin" className="text-slate-400 font-semibold hover:text-slate-900 transition">Admin</Link>
          )}
          <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Controladores</span>
          {isAdmin && (
            <Link href="/dashboard/evaluador" className="text-slate-400 font-semibold hover:text-slate-900 transition">Valuadores</Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">{nombreCompleto}</p>
          <p className="text-[10px] text-slate-500">{perfil?.email ?? '—'}</p>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <div className={`w-full h-full ${isAdmin ? 'bg-slate-200 text-slate-900' : 'bg-teal-700 text-white'} flex items-center justify-center text-xs font-bold`}>
            {perfil ? iniciales(perfil.nombre, perfil.apellidos) : 'C'}
          </div>
        </div>
      </div>
    </header>
  );
}
