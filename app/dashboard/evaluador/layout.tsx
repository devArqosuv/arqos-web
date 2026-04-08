import EvaluadorSidebar from './EvaluadorSidebar';

export default function EvaluadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans text-slate-900">
      <EvaluadorSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}