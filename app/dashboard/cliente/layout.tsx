import ClienteSidebar from './ClienteSidebar';

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans text-slate-900">
      <ClienteSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
