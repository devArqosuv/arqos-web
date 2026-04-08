'use client'; 

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (password !== '123456') {
      alert('Contraseña incorrecta, xd. La de prueba es 123456');
      return;
    }

    if (email === 'admin@prueba.com') {
      router.push('/dashboard/admin');
    } else if (email === 'valuadores@prueba.com') {
      router.push('/dashboard/evaluador');
    } else if (email === 'controladores@prueba.com') {
      router.push('/dashboard/controlador');
    } else {
      alert('Correo no válido. Usa admin@prueba.com, valuadores@prueba.com o controladores@prueba.com');
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

        <form onSubmit={handleLogin} className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 space-y-8">
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

            <button type="submit" className="w-full py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-bold transition">
              Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}