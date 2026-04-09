import ValuadorSidebar from './ValuadorSidebar';

export default function ValuadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans text-slate-900">
      <ValuadorSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
