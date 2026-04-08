'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ControladorTopbarInner() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-8">
        <h1 className="font-extrabold text-lg tracking-tight uppercase">ARQOS</h1>
        <nav className="flex gap-6 text-sm h-full items-center">
          {isAdmin ? (
            <>
              <Link href="/dashboard/admin" className="text-slate-400 font-semibold hover:text-slate-900 transition">Admin</Link>
              <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Controladores</span>
              <Link href="/dashboard/evaluador?admin=true" className="text-slate-400 font-semibold hover:text-slate-900 transition">Valuadores</Link>
            </>
          ) : (
            <span className="font-bold border-b-2 border-slate-900 h-full flex items-center pt-[2px]">Control</span>
          )}
        </nav>
      </div>
      <div className="w-8 h-8 rounded-full overflow-hidden">
        {isAdmin ? (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-900 text-xs font-bold">AP</div>
        ) : (
          <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold">C</div>
        )}
      </div>
    </header>
  );
}

export default function ControladorTopbar() {
  return (
    <Suspense fallback={<header className="h-16 bg-white border-b border-slate-200 shrink-0" />}>
      <ControladorTopbarInner />
    </Suspense>
  );
}