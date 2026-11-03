import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { listNotifications } from '@/services/notifications';
import { getSystemStatus } from '@/services/system';

const titles: Record<string, string> = {
  '/dashboard': 'Executive Dashboard',
  '/students': 'Students',
  '/predictions': 'AI Predictions',
  '/interventions': 'Interventions',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

function titleFor(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname === '/students/new') return 'Add Student';
  if (pathname.startsWith('/students/')) return 'Student Record';
  return 'Workspace';
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const unreadCount = (notificationsQuery.data ?? []).filter((n) => !n.read).length;
  const statusQuery = useQuery({ queryKey: ['system-status'], queryFn: getSystemStatus, refetchInterval: 60_000 });
  const aiOnline = statusQuery.data?.mlService === true;
  const isStaff = user?.role === 'admin' || user?.role === 'advisor';
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  // Ctrl/⌘+K focuses the student search, as the hint in the box says.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/students?q=${encodeURIComponent(query)}` : '/students');
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-[#ADDFF1]/10 dark:bg-slate-950/45">
      <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenu} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Open navigation">
          <Menu />
        </button>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">EduShield AI</p>
          <h1 className="truncate text-lg font-bold sm:text-xl">{titleFor(pathname)}</h1>
        </div>

        {isStaff ? (
          <form role="search" onSubmit={handleSearch} className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex dark:border-slate-700 dark:bg-slate-900">
            <Search size={18} className="text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search students by name, ID or programme…"
              aria-label="Search students"
            />
            <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">Ctrl K</kbd>
          </form>
        ) : (
          <div className="ml-auto" />
        )}

        <span
          title={statusQuery.data?.modelVersion ? `Serving ${statusQuery.data.modelVersion}` : 'Prediction service status'}
          className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${aiOnline ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'}`}
        >
          <span className={`size-2 rounded-full ${aiOnline ? 'bg-emerald-500' : 'bg-red-500'}`} /> {statusQuery.isLoading ? 'Checking AI…' : aiOnline ? 'AI Online' : 'AI Offline'}
        </span>

        <button onClick={toggleTheme} className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link
          to="/notifications"
          className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />}
        </Link>

        <div className="relative" ref={profileRef}>
          <button
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-2 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#ADDFF1] text-xs font-bold text-[#003152]">{user?.avatarInitials ?? 'ES'}</span>
            <div className="hidden text-left xl:block">
              <p className="max-w-32 truncate text-xs font-semibold text-slate-800 dark:text-white">{user?.name}</p>
              <p className="text-[10px] capitalize text-slate-400">{user?.role}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="menu">
              <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link to="/profile" onClick={() => setProfileOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                <UserRound className="h-4 w-4" /> View profile
              </Link>
              {user?.role !== 'student' && (
                <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Settings className="h-4 w-4" /> Account settings
                </Link>
              )}
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
