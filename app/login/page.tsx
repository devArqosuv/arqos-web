'use client';

import Image from 'next/image';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/util/supabase/client';

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorQuery = searchParams.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        : signInError.message);
      setCargando(false);
      return;
    }

    // Leer rol del perfil para redirigir al dashboard correcto
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('No se pudo obtener la sesión.');
      setCargando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rol = perfil?.rol || 'evaluador';
    const destino = rol === 'administrador'
      ? '/dashboard/admin'
      : rol === 'controlador'
      ? '/dashboard/controlador'
      : '/dashboard/valuador';

    router.push(destino);
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white p-4 font-sans">
      <div className="w-full max-w-md flex flex-col items-center gap-12">

        <header className="flex flex-col items-center gap-6 text-center">
          <div className="bg-[#0F172A] p-4 rounded-xl">
            <Image
              src="/logo-arqos.png"
              alt="Logo ARQOS"
              width={60}
              height={60}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ARQOS</h1>
            <p className="text-sm text-slate-400 mt-1 uppercase tracking-wider">
              SECURE VALUATION PORTAL
            </p>
          </div>
        </header>

        <form onSubmit={handleLogin} className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            {(error || errorQuery) && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">
                {error || 'Hubo un error al iniciar sesión. Intenta de nuevo.'}
              </div>
            )}

            <div className="space-y-3">
              <label htmlFor="email" className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                EMAIL
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nombre@arqos.com"
                className="w-full px-4 py-4 bg-[#F3F4F6] rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                PASSWORD
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-4 bg-[#F3F4F6] rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-4 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión…
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#020617]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
