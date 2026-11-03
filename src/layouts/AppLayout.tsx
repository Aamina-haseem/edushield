import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen text-slate-950 dark:text-white">
      <div className="es-backdrop" aria-hidden="true" />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="relative z-10 lg:pl-[280px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1700px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
