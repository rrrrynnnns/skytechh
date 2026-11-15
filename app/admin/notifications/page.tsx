'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CreditCard,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
};

type Filter = 'All' | 'Reminders' | 'Transaction';

function categoryFor(item: NotificationItem): Exclude<Filter, 'All'> {
  if (['billing', 'transaction'].includes(item.type)) return 'Transaction';
  if (['installation', 'task', 'assignment', 'reminder', 'booking'].includes(item.type)) return 'Reminders';
  return 'Reminders';
}

function notificationIcon(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return <CreditCard size={17} />;
  if (category === 'Reminders') return <Wrench size={17} />;
  return <AlertCircle size={17} />;
}

function notificationIconTone(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return 'bg-violet-50 text-violet-600';
  return 'bg-blue-50 text-[#2166f3]';
}

function notificationLabelTone(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return 'bg-amber-50 text-amber-600';
  if (category === 'Reminders') return 'bg-emerald-50 text-emerald-600';
  return 'bg-violet-50 text-violet-600';
}

function categoryLabel(item: NotificationItem) {
  const category = categoryFor(item);
  if (category === 'Transaction') return 'BILLING';
  if (category === 'Reminders') return item.type === 'task' ? 'REPAIR' : 'INSTALLATION';
  return 'SYSTEM';
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setHasError(false);
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load notifications.');
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error('Unable to load notifications.');
      setItems(result.data);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markOneRead(item: NotificationItem) {
    if (item.read) return;
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
    );
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notification as read.');
    } catch {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, read: false } : entry)),
      );
    }
  }

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

  const counts = useMemo(() => {
    const unread = items.filter((item) => !item.read).length;
    const reminders = items.filter((item) => categoryFor(item) === 'Reminders').length;
    const transaction = items.filter((item) => categoryFor(item) === 'Transaction').length;
    return { total: items.length, unread, reminders, transaction };
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory = activeFilter === 'All' || categoryFor(item) === activeFilter;
        const matchesUnread = !unreadOnly || !item.read;
        const haystack = `${item.title} ${item.body} ${categoryLabel(item)}`.toLowerCase();
        return matchesCategory && matchesUnread && haystack.includes(query.toLowerCase());
      }),
    [items, activeFilter, unreadOnly, query],
  );

  const summaryCards: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: typeof Bell;
    tile: string;
    bar: string;
    dot: string;
    activeRing: boolean;
    onClick: () => void;
  }> = [
    {
      label: 'Total alerts',
      value: counts.total,
      detail: 'All notifications',
      Icon: Bell,
      tile: 'bg-blue-50 text-blue-600',
      bar: 'bg-blue-500',
      dot: 'text-blue-600',
      activeRing: activeFilter === 'All' && !unreadOnly,
      onClick: () => {
        setActiveFilter('All');
        setUnreadOnly(false);
      },
    },
    {
      label: 'Unread',
      value: counts.unread,
      detail: counts.unread > 0 ? 'Needs attention' : 'All caught up',
      Icon: BellRing,
      tile: 'bg-amber-50 text-amber-600',
      bar: 'bg-amber-500',
      dot: counts.unread > 0 ? 'text-amber-600' : 'text-emerald-600',
      activeRing: unreadOnly,
      onClick: () => setUnreadOnly((current) => !current),
    },
    {
      label: 'Service & tasks',
      value: counts.reminders,
      detail: 'Installations & repairs',
      Icon: Wrench,
      tile: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
      dot: 'text-emerald-600',
      activeRing: activeFilter === 'Reminders',
      onClick: () => setActiveFilter((current) => (current === 'Reminders' ? 'All' : 'Reminders')),
    },
    {
      label: 'Billing alerts',
      value: counts.transaction,
      detail: 'Payments & invoices',
      Icon: CreditCard,
      tile: 'bg-violet-50 text-violet-600',
      bar: 'bg-violet-500',
      dot: 'text-violet-600',
      activeRing: activeFilter === 'Transaction',
      onClick: () => setActiveFilter((current) => (current === 'Transaction' ? 'All' : 'Transaction')),
    },
  ];

  const filterTabs: Array<[Filter, string, number]> = [
    ['All', 'All', counts.total],
    ['Reminders', 'Service & Tasks', counts.reminders],
    ['Transaction', 'Billing', counts.transaction],
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor system activity, service updates, and billing alerts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadNotifications(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              disabled={isMarking || counts.unread === 0}
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Check size={16} />
              {isMarking ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, activeRing, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                activeRing ? 'border-[#2166f3] ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                    {loading ? (
                      <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-100 align-middle" />
                    ) : (
                      value.toLocaleString()
                    )}
                  </p>
                </div>
                <span className={`admin-stat-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tile}`}>
                  <Icon size={20} />
                </span>
              </div>
              <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${dot}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {detail}
              </p>
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 ${bar} transition-opacity ${
                  activeRing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Notification Feed Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[#2166f3] focus:bg-white"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
                {filterTabs.map(([key, label, count]) => {
                  const active = activeFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveFilter(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {label}{' '}
                      <span className={`ml-1 tabular-nums ${active ? 'text-[#2166f3]' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setUnreadOnly((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  unreadOnly
                    ? 'border-[#2166f3] bg-blue-50 text-[#2166f3]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${unreadOnly ? 'bg-[#2166f3]' : 'bg-slate-400'}`} />
                Unread only
              </button>

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'}
              </span>
            </div>
          </div>

          {hasError ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-red-500">Notifications could not be loaded.</p>
              <button
                type="button"
                onClick={() => void loadNotifications(true)}
                className="mt-3 rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="flex items-start gap-4 px-5 py-5">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-80 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                <Bell size={20} />
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-800">All caught up</h3>
              <p className="mt-1 text-xs text-slate-400">
                {query || activeFilter !== 'All' || unreadOnly
                  ? 'No notifications match your current filters.'
                  : 'There are no notifications yet.'}
              </p>
              {(query || activeFilter !== 'All' || unreadOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveFilter('All');
                    setUnreadOnly(false);
                  }}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  onClick={() => void markOneRead(item)}
                  className={`group flex items-start gap-4 px-5 py-4 transition-colors duration-150 ${
                    !item.read
                      ? 'cursor-pointer bg-[#f7faff] hover:bg-blue-50/50'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notificationIconTone(item)}`}
                  >
                    {notificationIcon(item)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${notificationLabelTone(item)}`}
                      >
                        {categoryLabel(item)}
                      </span>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-[#2f68e6]" aria-label="Unread" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <time className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                    {!item.read && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void markOneRead(item);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-[#2166f3] opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                      >
                        <Check size={12} />
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
