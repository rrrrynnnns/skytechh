'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  List,
  LogOut,
  MessageSquare,
  Moon,
  ScrollText,
  ServerCog,
  Settings,
  Sun,
  Ticket,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AdminCommandPalette, type PaletteItem } from '@/app/components/AdminCommandPalette';

type Role = 'admin' | 'technician' | 'subscriber';
type NavLink = [string, string, typeof LayoutDashboard];
type NotificationItem = { id: string; type: string; title: string; body: string; timestamp: string; read: boolean };
type MaintenanceStatus = {
  enabled: boolean;
  category?: string;
  impact?: string;
  title?: string;
  description?: string;
  startsAt?: string | null;
  restoresAt?: string | null;
};
type AdminNavGroup = { title: string; links: NavLink[] };

const themeListeners = new Set<() => void>();
const subscribeToTheme = (listener: () => void) => {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
};
const getThemeSnapshot = () => typeof window !== 'undefined' && window.localStorage.getItem('skytech-admin-theme') === 'dark';
const getServerThemeSnapshot = () => false;
function setTheme(isDark: boolean) {
  window.localStorage.setItem('skytech-admin-theme', isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('admin-dark-mode', isDark);
  themeListeners.forEach((listener) => listener());
}

const adminNavGroups: AdminNavGroup[] = [
  { title: 'Overview', links: [['/admin/dashboard', 'Dashboard', LayoutDashboard], ['/admin/reports', 'Reports', Activity]] },
  { title: 'Customers', links: [['/admin/subscribers', 'Subscribers', Users], ['/admin/billing', 'Billing', FileText], ['/admin/bookings', 'Bookings', ClipboardList]] },
  { title: 'Operations', links: [['/admin/installations', 'Installations', CalendarDays], ['/admin/technicians', 'Technicians', Wrench], ['/admin/tickets', 'Support', Ticket]] },
];

const adminSystemLinks: NavLink[] = [
  ['/admin/settings', 'General Settings', Settings],
  ['/admin/audit-logs', 'Audit Logs', ScrollText],
  ['/admin/maintenance', 'Maintenance', ServerCog],
];

const paletteItems: PaletteItem[] = [
  ...adminNavGroups.flatMap((group) => group.links.map(([href, label, Icon]) => ({ href, label, Icon, group: group.title }))),
  ...adminSystemLinks.map(([href, label, Icon]) => ({ href, label, Icon, group: 'System' })),
  { href: '/admin/notifications', label: 'Notifications', Icon: Bell, group: 'System', keywords: 'alerts inbox' },
];

function getAdminLocation(path: string) {
  for (const group of adminNavGroups) {
    const match = group.links.find(([href]) => path.startsWith(href));
    if (match) return { group: group.title, label: match[1] };
  }
  const system = adminSystemLinks.find(([href]) => path.startsWith(href));
  if (system) return { group: 'System', label: system[1] };
  if (path.startsWith('/admin/notifications')) return { group: 'System', label: 'Notifications' };
  return { group: 'Admin', label: 'Console' };
}

export function PortalShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = role === 'admin';
  const isFixedMobilePage = role !== 'admin' && [
    '/subscriber/profile',
    '/technician/profile',
    '/subscriber/plan-details',
    '/subscriber/my-transactions',
    '/subscriber/pay-bills',
    '/subscriber/notifications',
    '/technician/notifications',
    '/technician/tasks',
  ].includes(path);
  const isPayBillsPage = path === '/subscriber/pay-bills';
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [notificationError, setNotificationError] = useState('');
  const [isMarkingNotificationsRead, setIsMarkingNotificationsRead] = useState(false);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark-mode', isAdmin && isDarkMode);
    return () => {
      if (isAdmin) document.documentElement.classList.remove('admin-dark-mode');
    };
  }, [isDarkMode, isAdmin]);

  const links: NavLink[] = role === 'technician'
    ? [['/technician/my-tasks', 'Home', LayoutDashboard], ['/technician/tasks', 'My Tasks', Ticket], ['/technician/profile', 'Profile', Users]]
    : [['/subscriber/my-account', 'Home', LayoutDashboard], ['/subscriber/my-tickets', 'My Requests', Ticket], ['/subscriber/help', 'Help', MessageSquare], ['/subscriber/profile', 'Profile', Users]];

  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.assign('/login');
  }

  async function loadNotifications() {
    setNotificationError('');
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load notifications.');
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error('Unable to load notifications.');
      setNotifications(result.data);
    } catch {
      setNotificationError('Notifications could not be loaded. Please try again.');
    }
  }

  useEffect(() => {
    if (isAdmin) void loadNotifications();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    fetch('/api/maintenance/status', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!cancelled && result?.data) setMaintenance(result.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, path]);

  // Ctrl/Cmd + K opens quick navigation.
  useEffect(() => {
    if (!isAdmin) return;
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isAdmin]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    function closeNotifications(event: MouseEvent) {
      if (!notificationContainerRef.current?.contains(event.target as Node)) setIsNotificationsOpen(false);
    }
    document.addEventListener('mousedown', closeNotifications);
    return () => document.removeEventListener('mousedown', closeNotifications);
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isProfileOpen) return;
    function closeProfile(event: MouseEvent) {
      if (!profileContainerRef.current?.contains(event.target as Node)) setIsProfileOpen(false);
    }
    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, [isProfileOpen]);

  function toggleNotifications() {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);
    if (nextOpen) void loadNotifications();
  }

  async function markNotificationRead(item: NotificationItem) {
    if (item.read) return;
    setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, read: true } : notification));
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notification as read.');
    } catch {
      setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, read: false } : notification));
      setNotificationError('The notification could not be marked as read.');
    }
  }

  async function markAllNotificationsRead() {
    setIsMarkingNotificationsRead(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notifications as read.');
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    } catch {
      setNotificationError('Notifications could not be marked as read.');
    } finally {
      setIsMarkingNotificationsRead(false);
    }
  }

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications =
    notificationFilter === 'unread'
      ? notifications.filter((notification) => !notification.read)
      : notifications;

  function getNotificationVisual(item: NotificationItem) {
    const key = `${item.type} ${item.title}`.toLowerCase();
    if (key.includes('overdue') || key.includes('bill') || key.includes('payment')) {
      return {
        Icon: FileText,
        tone: !item.read ? 'bg-amber-50 text-amber-600' : 'bg-amber-50/60 text-amber-500',
      };
    }
    if (key.includes('technician') || key.includes('install') || key.includes('repair') || key.includes('ticket')) {
      return {
        Icon: Wrench,
        tone: !item.read ? 'bg-blue-50 text-[#2166f3]' : 'bg-slate-100 text-slate-500',
      };
    }
    if (key.includes('maintenance')) {
      return {
        Icon: ServerCog,
        tone: !item.read ? 'bg-rose-50 text-rose-600' : 'bg-rose-50/60 text-rose-400',
      };
    }
    return {
      Icon: Bell,
      tone: !item.read ? 'bg-blue-50 text-[#2166f3]' : 'bg-slate-100 text-slate-400',
    };
  }

  /* ------------------------------ Non-admin UI ------------------------------ */
  if (!isAdmin) {
    if (maintenance?.enabled) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#071329] p-5 text-slate-900">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl">
            <div className="bg-[#172554] px-6 py-6 text-center text-white">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                <ServerCog size={24} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Sky-Tech Fiber</p>
              <h1 className="mt-1 text-xl font-bold">System Under Maintenance</h1>
            </div>
            <div className="space-y-4 p-6">
              {maintenance.impact && (
                <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-bold text-amber-800">
                  {maintenance.impact}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {maintenance.title || 'Scheduled Network Maintenance'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {maintenance.description ||
                    'The subscriber portal is temporarily unavailable while we perform network maintenance.'}
                </p>
              </div>
              <div className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                {maintenance.category && (
                  <p>
                    <span className="font-semibold text-slate-700">Category:</span> {maintenance.category}
                  </p>
                )}
                {maintenance.restoresAt && (
                  <p>
                    <span className="font-semibold text-slate-700">Estimated restoration:</span>{' '}
                    {new Date(maintenance.restoresAt).toLocaleString('en-PH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2166f3] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d57d6]"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }

    const navigation = <nav className="space-y-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 rounded-xl border-l-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${path === href ? 'border-[#2563eb] bg-blue-50 text-[#2166f3]' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><Icon size={18} />{label}</Link>)}</nav>;
    return <div className="portal-shell portal-scrollbar-hidden min-h-screen overflow-x-hidden bg-[#eef4fb] text-slate-950">
      {isOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 opacity-100 transition-opacity duration-200 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-3 py-5 transition-transform duration-250 ease-out ${isOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-3 pb-6"><Link href="/landing-page" onClick={() => setIsOpen(false)} className="flex items-center gap-3" aria-label="Sky-Tech home"><img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-11 w-11 rounded-full object-cover object-center" /><span><span className="block text-lg font-black tracking-tight text-slate-900">Sky-Tech</span><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-sky-600">Home Fiber</span></span></Link><button aria-label="Close navigation" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-500 transition-colors duration-150 hover:bg-[#f1f5f9] lg:hidden"><X size={18} /></button></div>
        <div className="mt-3 flex-1">{navigation}</div>
      </aside>
      <nav className={`fixed inset-x-0 bottom-0 z-50 grid h-16 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden ${role === 'subscriber' ? 'grid-cols-4' : 'grid-cols-3'}`}>{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setIsOpen(false)} className={`flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 text-[10px] font-semibold transition-colors duration-150 ${path === href ? 'border-[#2166f3] text-[#2166f3]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Icon size={17} /><span className="max-w-full truncate">{label}</span></Link>)}</nav>
      <main className={`min-h-screen pb-20 lg:ml-64 ${isFixedMobilePage && !isPayBillsPage ? 'max-lg:h-[100svh] max-lg:overflow-hidden max-lg:pb-0' : ''}`}><div className={`mx-auto max-w-7xl px-0 lg:pb-0 ${isFixedMobilePage && !isPayBillsPage ? 'max-lg:h-full' : ''}`}>{children}</div></main>
    </div>;
  }

  /* -------------------------------- Admin UI -------------------------------- */
  const location = getAdminLocation(path);

  const renderAdminLink = ([href, label, Icon]: NavLink) => {
    const active = path.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`admin-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${active ? 'admin-nav-link-active bg-white/10 text-white' : 'text-[#9aa8c4] hover:bg-white/5 hover:text-white'
          }`}
      >
        <span className={`absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-400 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
        <span className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${active ? 'bg-linear-to-br from-sky-400 to-[#2166f3] text-white shadow-md shadow-blue-900/40' : 'bg-white/5 text-[#9aa8c4] group-hover:text-white'}`}>
          <Icon size={16} />
        </span>
        {label}
      </Link>
    );
  };

  return <div className={`portal-shell admin-shell ${isDarkMode ? 'admin-dark-mode' : ''} min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-950`}>
    {/* Sidebar */}
    <aside className="admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0b1630] px-3 py-5">
      <Link href="/landing-page" className="mx-2 flex items-center gap-3 rounded-xl px-1 pb-5" aria-label="Sky-Tech home">
        <img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-10 w-10 rounded-full object-cover object-center ring-2 ring-white/10" />
        <span>
          <span className="block text-lg font-black leading-tight tracking-tight text-white">Sky-Tech</span>
          <span className="block text-[9px] font-bold uppercase tracking-[.16em] text-sky-400">Admin Console</span>
        </span>
      </Link>

      <nav className="admin-sidebar-scroll -mx-1 flex-1 space-y-5 overflow-y-auto px-1 pl-4">
        {adminNavGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5d6b8a]">{group.title}</p>
            <div className="space-y-0.5">{group.links.map(renderAdminLink)}</div>
          </div>
        ))}
      </nav>
    </aside>

    {/* Top bar */}
    <header className="admin-topbar fixed left-64 right-0 top-0 z-20 flex h-16 min-w-5xl items-center border-b border-slate-200 bg-white/80 px-10 backdrop-blur-md">
      <div className="flex w-full items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto flex items-center gap-1.5 text-sm">
          <Link href="/admin/dashboard" className="font-medium text-slate-400 hover:text-slate-600">Admin</Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-medium text-slate-400">{location.group}</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-semibold text-slate-800">{location.label}</span>
        </nav>

        <div ref={notificationContainerRef} className="relative">
          <button type="button" aria-label="Notifications" aria-expanded={isNotificationsOpen} onClick={toggleNotifications} className={`relative rounded-xl p-2.5 text-slate-500 hover:bg-[#f1f5f9] ${isNotificationsOpen ? 'bg-slate-50' : ''}`}>
            <Bell size={18} />
            {unreadNotificationCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="notification-popover absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Notifications</h2>
                    <p className="text-[11px] text-slate-400">
                      {unreadNotificationCount > 0
                        ? `${unreadNotificationCount} unread alert${unreadNotificationCount === 1 ? '' : 's'}`
                        : 'All caught up'}
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                        notificationFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                        notificationFilter === 'unread'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Unread
                      {unreadNotificationCount > 0 && (
                        <span className="rounded-full bg-[#2166f3] px-1.5 py-0 text-[10px] font-bold text-white">
                          {unreadNotificationCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="notification-scroll portal-scrollbar-hidden max-h-68 divide-y divide-slate-100 overflow-y-auto">
                {notificationError && <p className="px-3.5 py-2.5 text-xs text-rose-600">{notificationError}</p>}
                {!notificationError && visibleNotifications.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400">
                      <Bell size={16} />
                    </span>
                    <p className="mt-2.5 text-xs font-semibold text-slate-600">
                      {notificationFilter === 'unread' ? 'No unread notifications' : "You're all caught up."}
                    </p>
                    {notificationFilter === 'unread' && notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotificationFilter('all')}
                        className="mt-1.5 text-xs font-semibold text-[#2166f3] hover:underline"
                      >
                        Show all notifications
                      </button>
                    )}
                  </div>
                )}
                {visibleNotifications.map((item) => {
                  const { Icon, tone } = getNotificationVisual(item);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => void markNotificationRead(item)}
                      className={`notification-item flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50/90 ${
                        !item.read ? 'bg-[#f5f8ff]' : 'bg-white'
                      }`}
                    >
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}>
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-900">{item.title}</span>
                          {!item.read ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2166f3]" aria-label="Unread" />
                          ) : (
                            <Check size={12} className="shrink-0 text-slate-300" />
                          )}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-slate-500">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-slate-400">
                          {new Date(item.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-[#2166f3]"
                >
                  <List size={13} />
                  See all
                </Link>
                <button
                  type="button"
                  disabled={isMarkingNotificationsRead || unreadNotificationCount === 0}
                  onClick={() => void markAllNotificationsRead()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2166f3] transition-colors hover:text-[#1d57d6] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Check size={13} />
                  {isMarkingNotificationsRead ? 'Marking...' : 'Mark all as read'}
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="mx-1 h-8 w-px bg-slate-200" />

        <div ref={profileContainerRef} className="relative">
          <button type="button" aria-label="Open account menu" aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 ${isProfileOpen ? 'bg-slate-50' : ''}`}>
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-blue-700 text-xs font-bold text-white shadow-sm">SA<span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" /></span>
            <span className="hidden min-w-0 sm:block"><span className="block text-sm font-bold text-slate-800">Sky-Tech Admin</span><span className="block text-[11px] font-semibold text-slate-400">Administrator</span></span>
            <ChevronDown size={16} className={`hidden text-slate-400 transition-transform sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProfileOpen && <div className="notification-popover absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
            <div className="mb-1 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-blue-700 text-sm font-bold text-white">SA</span>
              <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">Sky-Tech Admin</span><span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />System Administrator</span></span>
            </div>
            {adminSystemLinks.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Icon size={16} className="text-slate-400" />{label}</Link>)}
            <button type="button" onClick={() => setTheme(!isDarkMode)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <span className="flex items-center gap-3">{isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-violet-600" />}{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
              <span className={`relative h-5 w-9 rounded-full transition-colors ${isDarkMode ? 'bg-[#2166f3]' : 'bg-slate-200'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isDarkMode ? 'left-4.5' : 'left-0.5'}`} /></span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16} />Log out</button>
          </div>}
        </div>
      </div>
    </header>

    <main className="ml-64 min-h-screen min-w-5xl pt-16">
      <div className="admin-page-enter mx-auto max-w-7xl px-10 py-8">{children}</div>
    </main>

    <AdminCommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} items={paletteItems} />
  </div>;
}
