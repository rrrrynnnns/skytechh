'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, Bell, CalendarDays, Check, ChevronDown, FileText, LayoutDashboard, List, MessageSquare, Moon, Router, Settings, Sun, Ticket, Users, Wrench, X } from 'lucide-react';
import { signOut } from 'next-auth/react';

type Role = 'admin' | 'technician' | 'subscriber';
type NavLink = [string, string, typeof LayoutDashboard];
type NotificationItem = { id: string; type: string; title: string; body: string; timestamp: string; read: boolean };

const themeListeners = new Set<() => void>();
const subscribeToTheme = (listener: () => void) => {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
};
const getThemeSnapshot = () => typeof window !== 'undefined' && window.localStorage.getItem('skytech-theme') === 'dark';
const getServerThemeSnapshot = () => false;
function setTheme(isDark: boolean) {
  window.localStorage.setItem('skytech-theme', isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark-mode', isDark);
  themeListeners.forEach((listener) => listener());
}

export function PortalShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const isFixedMobilePage = role !== 'admin' && [
    '/subscriber/profile',
    '/technician/profile',
    '/subscriber/plan-details',
    '/subscriber/my-transactions',
    '/subscriber/pay-bills',
    '/subscriber/notifications',
    '/technician/notifications',
  ].includes(path);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const [isMarkingNotificationsRead, setIsMarkingNotificationsRead] = useState(false);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);
  const links: NavLink[] = role === 'admin'
    ? [['/admin/dashboard', 'Dashboard', LayoutDashboard], ['/admin/subscribers', 'Subscribers', Users], ['/admin/billing', 'Billing', FileText], ['/admin/installations', 'Installations', CalendarDays], ['/admin/technicians', 'Technicians', Wrench], ['/admin/tickets', 'Support', Ticket], ['/admin/reports', 'Reports', Activity], ['/admin/settings', 'Settings', Settings]]
    : role === 'technician'
      ? [['/technician/my-tasks', 'Home', LayoutDashboard], ['/technician/tasks', 'My Tasks', Ticket], ['/technician/profile', 'Profile', Users]]
      : [['/subscriber/my-account', 'Home', LayoutDashboard], ['/subscriber/my-tickets', 'My Requests', Ticket], ['/subscriber/help', 'Help', MessageSquare], ['/subscriber/profile', 'Profile', Users]];

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
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
    if (role === 'admin') void loadNotifications();
  }, [role]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    function closeNotifications(event: MouseEvent) {
      if (!notificationContainerRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', closeNotifications);
    return () => document.removeEventListener('mousedown', closeNotifications);
  }, [isNotificationsOpen]);

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

  const navigation = <nav className="space-y-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 rounded-xl border-l-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${path === href ? 'border-[#2563eb] bg-blue-50 text-[#2166f3]' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><Icon size={18} />{label}</Link>)}</nav>;
  return <div className={`min-h-screen overflow-x-hidden text-slate-950 ${role === 'admin' ? 'bg-[#f8fafc]' : 'bg-[#eef4fb]'}`}>
    {isOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 opacity-100 transition-opacity duration-200 lg:hidden" onClick={() => setIsOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-3 py-5 transition-transform duration-250 ease-out ${role === 'admin' || isOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-3 pb-6"><Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-lg font-bold tracking-tight"><span className="grid h-6 w-6 place-items-center text-[#2166f3]"><Router size={20} /></span>Sky-Tech ISP</Link><button aria-label="Close navigation" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-500 transition-colors duration-150 hover:bg-[#f1f5f9] lg:hidden"><X size={18} /></button></div>
      <div className="mt-3 flex-1">{navigation}</div>
    </aside>
    {role === 'admin' && <header className="fixed left-64 right-0 top-0 z-20 flex h-16 min-w-5xl items-center justify-end border-b border-slate-200 bg-white/90 px-10 backdrop-blur"><div className="flex items-center gap-4"><button type="button" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(!isDarkMode)} className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-[#f1f5f9]">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div ref={notificationContainerRef} className="relative"><button type="button" aria-label="Notifications" aria-expanded={isNotificationsOpen} onClick={toggleNotifications} className="relative rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-[#f1f5f9]"><Bell size={18} />{unreadNotificationCount > 0 &&     <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#2f68e6] px-1 text-[9px] font-bold text-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}</button>{isNotificationsOpen &&     <div className="notification-popover absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]"><div className="flex items-start justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-800">Notifications</h2><p className="mt-0.5 text-xs text-slate-400">{unreadNotificationCount} unread notifications</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-[#2166f3]">{unreadNotificationCount} new</span></div>        <div className="notification-scroll max-h-45 overflow-y-scroll">{notificationError && <p className="px-4 py-3 text-xs text-red-500">{notificationError}</p>}{!notificationError && notifications.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">No notifications yet.</p>}    {notifications.map((item) => <button type="button" key={item.id} onClick={() => void markNotificationRead(item)} className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!item.read ? 'bg-[#f7faff]' : 'bg-white'}`}>    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-[#2166f3]"><Bell size={15} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-slate-800">{item.title}</span>{!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#2f68e6]" aria-label="Unread" />}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.body}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></span>{item.read && <Check size={14} className="mt-1 shrink-0 text-slate-400" />}</button>)}</div><div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3"><Link href="/admin/notifications" onClick={() => setIsNotificationsOpen(false)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2166f3]"><List size={14} />See all</Link><button type="button" disabled={isMarkingNotificationsRead || unreadNotificationCount === 0} onClick={() => void markAllNotificationsRead()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2166f3] hover:text-[#2458c8]"><Check size={14} />{isMarkingNotificationsRead ? 'Marking...' : 'Mark all as read'}</button></div></div>}</div><div className="relative flex items-center gap-3"><div className="text-right"><p className="text-sm font-bold text-slate-800">Alex Rivera</p><p className="text-xs text-slate-400">Admin</p></div><button type="button" aria-label="Open account menu" aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)} className="relative grid h-9 w-9 place-items-center rounded-full bg-[#2f68e6] text-xs font-bold text-white hover:bg-[#2458c8)">AR<span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-white bg-white text-slate-500"><ChevronDown size={11} /></span></button>{isProfileOpen && <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.14)]"><button type="button" onClick={handleSignOut} className="w-full rounded-lg px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50">Log out</button></div>}</div></div></header>}
    {role !== 'admin' && <nav className={`fixed inset-x-0 bottom-0 z-50 grid h-16 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden ${role === 'subscriber' ? 'grid-cols-4' : 'grid-cols-3'}`}>{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setIsOpen(false)} className={`flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 text-[10px] font-semibold transition-colors duration-150 ${path === href ? 'border-[#2166f3] text-[#2166f3]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Icon size={17} /><span className="max-w-full truncate">{label}</span></Link>)}</nav>}
    <main className={`${role === 'admin' ? 'min-h-screen ml-64 min-w-5xl pt-16' : `min-h-screen pb-20 lg:ml-64 ${isFixedMobilePage ? 'max-lg:h-[100svh] max-lg:overflow-hidden max-lg:pb-0' : ''}`}`}><div className={`mx-auto max-w-7xl ${role === 'technician' || role === 'subscriber' ? `px-0 lg:pb-0 ${isFixedMobilePage ? 'max-lg:h-full' : ''}` : 'px-10 py-8'}`}>{children}</div></main>
  </div>;
}
