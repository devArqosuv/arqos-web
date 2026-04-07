'use client'; // Agregamos esto para poder usar interactividad

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página recargue al mandar el form

    // Simulador de roles basado en tus correos
    if (email === 'admin@prueba.com') {
      router.push('/dashboard/admin');
    } else if (email === 'valuadores@prueba.com') {
      router.push('/dashboard/evaluador');
    } else if (email === 'controladores@prueba.com') {
      router.push('/dashboard/controlador');
    } else {
      alert('Correo no reconocido para la simulación, xd. Intenta con admin@prueba.com');
    }
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

        {/* Le agregamos el onSubmit al form */}
        <form onSubmit={handleLogin} className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <label htmlFor="email" className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                {/* Conectamos el input al estado de React */}
                <input 
                  type="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nombre@arqos.com" 
                  className="w-full pl-12 pr-4 py-4 bg-[#F3F4F6] rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  id="password"
                  defaultValue="123456" 
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-4 bg-[#F3F4F6] rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                />
              </div>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-3 py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-bold transition">
              Iniciar Sesión
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}