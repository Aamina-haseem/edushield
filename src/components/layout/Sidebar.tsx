import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Bell, BrainCircuit, ChevronLeft, FileText, GraduationCap, LayoutDashboard, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { UserRole } from '@/types/contract';

const items: { to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'advisor', 'student'] },
  { to: '/students', label: 'Students', icon: Users, roles: ['admin', 'advisor'] },
  { to: '/predictions', label: 'AI Predictions', icon: BrainCircuit, roles: ['admin', 'advisor'] },
  { to: '/interventions', label: 'Interventions', icon: ShieldCheck, roles: ['admin', 'advisor'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'advisor'] },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'advisor'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'advisor', 'student'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'advisor'] },
];

interface SidebarProps { mobileOpen: boolean; onMobileClose: () => void }

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('edushield-sidebar') === 'collapsed');
  useEffect(() => localStorage.setItem('edushield-sidebar', collapsed ? 'collapsed' : 'expanded'), [collapsed]);
  const visibleItems = items.filter((item) => !user || item.roles.includes(user.role));

  const content = (
    <motion.aside animate={{ width: collapsed ? 88 : 280 }} className="flex h-full flex-col border-r border-white/10 bg-[#071f33] text-white">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ADDFF1] text-[#003152]"><GraduationCap size={24} /></span>
          {!collapsed && <div className="whitespace-nowrap"><p className="text-lg font-bold">EduShield AI</p><p className="text-xs text-sky-100/60">Decision support platform</p></div>}
        </div>
        <button className="hidden rounded-lg p-2 text-sky-100/70 hover:bg-white/10 lg:block" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar"><ChevronLeft className={cn('transition', collapsed && 'rotate-180')} size={18} /></button>
        <button className="rounded-lg p-2 lg:hidden" onClick={onMobileClose} aria-label="Close navigation"><X /></button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onMobileClose} title={collapsed ? label : undefined} className={({ isActive }) => cn('group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-sky-100/70 transition hover:bg-white/10 hover:text-white', isActive && 'bg-white text-[#003152] shadow-xl hover:bg-white hover:text-[#003152]', collapsed && 'justify-center')}>
            <Icon size={20} className="shrink-0" />{!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <NavLink to="/profile" className={cn('flex items-center gap-3 rounded-2xl bg-white/8 p-3', collapsed && 'justify-center')}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ADDFF1] font-bold text-[#003152]">{user?.avatarInitials ?? 'ES'}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name ?? 'EduShield User'}</p><p className="truncate text-xs capitalize text-sky-100/60">{user?.role ?? 'workspace member'}</p></div>}
        </NavLink>
      </div>
    </motion.aside>
  );

  return <>{<div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{content}</div>}{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/60" aria-label="Close navigation overlay" onClick={onMobileClose} /><div className="relative h-full w-[280px]">{content}</div></div>}</>;
}
