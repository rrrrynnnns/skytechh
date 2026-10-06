'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Bell, Check, CreditCard, Wrench } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type NotificationItem = { id: string; type: string; title: string; body: string; timestamp: string; read: boolean };
type Filter = 'All' | 'Reminders' | 'Transaction';

const filters: Filter[] = ['All', 'Reminders', 'Transaction'];

function categoryFor(item: NotificationItem): Exclude<Filter, 'All'> {
  if (['billing', 'transaction'].includes(item.type)) return 'Transaction';
  if (['installation', 'task', 'assignment', 'reminder', 'booking'].includes(item.type)) return 'Reminders';
  return 'Reminders';
}

function notificationIcon(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return <CreditCard size={16} />;
  if (category === 'Reminders') return <Wrench size={16} />;
  return <AlertCircle size={16} />;
}

function notificationIconTone() {
  return 'bg-blue-50 text-[#2166f3]';
}

function notificationLabelTone(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return 'bg-amber-50 text-amber-500';
  if (category === 'Reminders') return 'bg-emerald-50 text-emerald-500';
  return 'bg-violet-50 text-violet-500';
}

function categoryLabel(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return 'BILLING';
  if (category === 'Reminders') return item.type === 'task' ? 'REPAIR' : 'INSTALLATION';
  return 'SYSTEM';
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [isMarking, setIsMarking] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetch('/api/notifications', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load notifications.');
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error('Unable to load notifications.');
      setItems(result.data);
    }).catch(() => setHasError(true));
  }, []);

  async function markAllRead() {
    setIsMarking(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notifications as read.');
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } finally {
      setIsMarking(false);
    }
  }

  const filtered = items.filter((item) => activeFilter === 'All' || categoryFor(item) === activeFilter);
  const unread = items.filter((item) => !item.read).length;

  return (
    <PortalShell role="admin">
      <div className="min-h-screen bg-[#f7f9fc]">
        <header className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor system activity, service updates, and account alerts.</p>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const unreadCount = filter === 'All' ? items.filter((item) => !item.read).length : items.filter((item) => !item.read && categoryFor(item) === filter).length;
              return <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out ${activeFilter === filter ? 'border-[#294bc4] bg-[#294bc4] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-[#294bc4] hover:text-[#294bc4]'}`}>{filter}{unreadCount > 0 && <span className={`ml-1 transition-colors duration-200 ${activeFilter === filter ? 'text-white/80' : 'text-slate-400'}`}>{unreadCount}</span>}</button>;
            })}
          </div>
          <button type="button" disabled={isMarking || unread === 0} onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-full bg-[#4055d8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3246c4] disabled:opacity-50"><Check size={16} />{isMarking ? 'Marking...' : 'Mark all as read'}</button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-sm font-bold text-slate-900">Notification center</h2>
            <p className="mt-1 text-xs text-slate-400">{filtered.length} notification{filtered.length === 1 ? '' : 's'} in this view</p>
          </div>
          {hasError ? <p className="px-5 py-8 text-sm text-red-500">Notifications could not be loaded. Please try again.</p> : filtered.length === 0 ? <div className="notification-item flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-[#2166f3]"><Bell size={20} /></span><h3 className="mt-4 text-sm font-bold text-slate-800">All caught up</h3><p className="mt-1 text-sm text-slate-400">There are no notifications in this category.</p></div> : <div>{filtered.map((item) =>           <article key={item.id} className="notification-item flex items-start gap-4 border-b border-slate-100 px-5 py-5 transition-colors duration-200 hover:bg-slate-50 last:border-b-0"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notificationIconTone()}`}>{notificationIcon(item)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${notificationLabelTone(item)}`}>{categoryLabel(item)}</span></div><p className="mt-1 text-sm text-slate-500">{item.body}</p></div><div className="flex shrink-0 items-center gap-3"><time className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>{!item.read && <span className="h-2.5 w-2.5 rounded-full bg-[#2f68e6]" aria-label="Unread" />}</div></article>)}</div>}
        </section>
      </div>
    </PortalShell>
  );
}
