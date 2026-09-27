'use client';

import Link from 'next/link';
import { ArrowLeft, Check, CheckSquare, Clock3, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';

type NotificationItem = { id: string; type: string; title: string; body: string; timestamp: string; read: boolean };
type Filter = 'All' | 'Assignments' | 'Updates' | 'Advisories';

const filters: Filter[] = ['All', 'Assignments', 'Updates', 'Advisories'];

function notificationIcon(type: string) {
  if (type === 'system') return <Clock3 size={16} />;
  if (type === 'update' || type === 'task') return <CheckSquare size={16} />;
  return <FileText size={16} />;
}

function notificationTone(type: string) {
  if (type === 'system') return 'bg-violet-50 text-violet-500';
  if (type === 'update' || type === 'task') return 'bg-emerald-50 text-emerald-500';
  return 'bg-blue-50 text-blue-500';
}

function notificationCategory(item: NotificationItem): Exclude<Filter, 'All'> {
  if (item.type === 'system') return 'Advisories';
  if (['assignment', 'installation', 'booking'].includes(item.type)) return 'Assignments';
  if (item.type === 'task' && !/complete|closed|resolved/i.test(`${item.title} ${item.body}`)) return 'Assignments';
  return 'Updates';
}

export default function TechnicianNotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    fetch('/api/notifications').then(async (response) => { if (!response.ok) return; const result = await response.json(); if (Array.isArray(result.data)) setNotifications(result.data); }).catch(() => undefined);
  }, []);

  async function markAllRead() {
    setIsMarkingRead(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    } finally {
      setIsMarkingRead(false);
    }
  }

  const filtered = notifications.filter((item) => activeFilter === 'All' || notificationCategory(item) === activeFilter);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const assignmentUnreadCount = notifications.filter((item) => !item.read && notificationCategory(item) === 'Assignments').length;

  return (
    <PortalShell role="technician">
      <div className="min-h-screen bg-[#f7f9fc]">
        <header className="flex items-center justify-between gap-4 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Link href="/technician/my-tasks" aria-label="Back to home" className="rounded-full bg-white/15 p-2 transition-colors duration-150 hover:bg-white/25"><ArrowLeft size={20} /></Link>
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          <button disabled={isMarkingRead || unreadCount === 0} onClick={markAllRead} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-white/25">{isMarkingRead ? 'Marking...' : 'Mark all read'}</button>
        </header>

        <div className="border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex gap-7 overflow-x-auto scrollbar-hidden">
            {filters.map((label) => (
              <button key={label} onClick={() => setActiveFilter(label)} className={`flex shrink-0 items-center gap-2 border-b-2 px-0 py-5 text-sm font-semibold transition-colors duration-150 ${activeFilter === label ? 'border-[#2166f3] text-[#2166f3]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {label}
                {label === 'All' && unreadCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-[#2166f3]">{unreadCount}</span>}
                {label === 'Assignments' && assignmentUnreadCount > 0 && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{assignmentUnreadCount}</span>}
              </button>
            ))}
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
          <div className="grid gap-3">
            {filtered.map((item) => (
              <article key={item.id} className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors duration-100 hover:bg-[#f8fafc] sm:gap-4 sm:p-4 ${!item.read ? 'border-l-2 border-l-[#2166f3]' : ''}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notificationTone(item.type)}`}>{notificationIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 sm:text-base">{item.title}</h2>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.body}</p>
                    </div>
                    {!item.read && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2166f3]">New</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    {item.read && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} />Read</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No notifications in this category yet.</div>}
        </main>
      </div>
    </PortalShell>
  );
}
