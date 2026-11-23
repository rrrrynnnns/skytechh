'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LifeBuoy,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';
import { RevenueCard, SubscriberGrowthCard } from '@/app/components/TrendCharts';

type DashboardResponse = {
  activeSubscribers: number;
  activeTechnicians: number;
  openTickets: number;
  revenueCollected: number;
  pendingBills: number;
  revenueTrend: { label: string; value: number }[];
  growthTrend: number[];
  recentInstallations: {
    id: string;
    subscriber: string;
    technician: string;
    date: string;
    time?: string;
    status: string;
  }[];
  recentActivity: {
    id: string;
    text: string;
    body: string;
    date: string;
    tone: 'green' | 'orange' | 'blue';
  }[];
  recentSupportTickets: {
    id: string;
    subscriber: string;
    concern: string;
    date?: string | null;
    time?: string | null;
    status: string;
  }[];
};

type StatAccent = 'blue' | 'violet' | 'emerald' | 'amber';
type Stat = {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
  tone: 'positive' | 'neutral' | 'negative';
  accent: StatAccent;
  href: string;
};

const statAccents: Record<StatAccent, { tile: string; bar: string }> = {
  blue: { tile: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500' },
  violet: { tile: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  amber: { tile: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'S'
  );
}

const installationStatusLabels: Record<string, string> = {
  Scheduled: 'Installation Confirmed',
  'In Progress': 'Installation Confirmed',
  'Installation Confirmed': 'Installation Confirmed',
  Completed: 'Installation Closed',
  'Installation Closed': 'Installation Closed',
  Cancelled: 'Installation Rescheduled',
  'Installation Rescheduled': 'Installation Rescheduled',
  Installation_Rescheduled: 'Installation Rescheduled',
};

const installationStatusStyles: Record<string, { badge: string; dot: string }> = {
  'Installation Confirmed': { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Completed: { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  'Installation Closed': { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  'Installation Rescheduled': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const ticketStatusLabels: Record<string, string> = {
  Open: 'Submitted',
  'In Progress': 'Repair Confirmed',
  Resolved: 'Repair Closed',
  Closed: 'Repair Rescheduled',
};

const ticketStatusStyles: Record<string, { badge: string; dot: string }> = {
  Submitted: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'Repair Confirmed': { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  'Repair Closed': { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  'Repair Rescheduled': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

function getInstallationStatus(status: string) {
  return installationStatusLabels[status] || status;
}

function formatInstallationDateTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function formatSupportDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatInstallationTime(value: string | null | undefined) {
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value || '—';
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Unable to load dashboard metrics.');
      const result: DashboardResponse = await response.json();
      setDashboard(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard metrics.');
      if (!isRefresh) setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const stats = useMemo<Stat[]>(() => {
    if (!dashboard) {
      return [
        { label: 'Active subscribers', value: '0', detail: 'Awaiting data', Icon: Users, tone: 'neutral', accent: 'blue', href: '/admin/subscribers' },
        { label: 'Active technicians', value: '0', detail: 'Awaiting data', Icon: Wrench, tone: 'neutral', accent: 'violet', href: '/admin/technicians' },
        { label: 'Revenue collected', value: '₱0', detail: 'Awaiting data', Icon: CircleDollarSign, tone: 'neutral', accent: 'emerald', href: '/admin/reports' },
        { label: 'Pending bills', value: '0', detail: 'Awaiting data', Icon: FileText, tone: 'neutral', accent: 'amber', href: '/admin/billing' },
      ];
    }

    return [
      {
        label: 'Active subscribers',
        value: dashboard.activeSubscribers.toLocaleString(),
        detail: dashboard.activeSubscribers > 0 ? 'Live count' : 'No active subscribers',
        Icon: Users,
        tone: 'positive',
        accent: 'blue',
        href: '/admin/subscribers',
      },
      {
        label: 'Active technicians',
        value: dashboard.activeTechnicians.toLocaleString(),
        detail: dashboard.activeTechnicians > 0 ? 'Available now' : 'No active technicians',
        Icon: Wrench,
        tone: 'neutral',
        accent: 'violet',
        href: '/admin/technicians',
      },
      {
        label: 'Revenue collected',
        value: `₱${dashboard.revenueCollected.toLocaleString()}`,
        detail: dashboard.revenueCollected > 0 ? 'Across all paid bills' : 'No paid bills yet',
        Icon: CircleDollarSign,
        tone: 'positive',
        accent: 'emerald',
        href: '/admin/reports',
      },
      {
        label: 'Pending bills',
        value: dashboard.pendingBills.toLocaleString(),
        detail: dashboard.pendingBills > 0 ? `${dashboard.pendingBills} need attention` : 'All clear',
        Icon: FileText,
        tone: dashboard.pendingBills > 0 ? 'negative' : 'positive',
        accent: 'amber',
        href: '/admin/billing',
      },
    ];
  }, [dashboard]);

  const chartLabels = dashboard?.revenueTrend.map((entry) => entry.label) ?? ['—', '—', '—', '—', '—', '—'];
  const revenueData = dashboard?.revenueTrend ?? chartLabels.map((label) => ({ label, value: 0 }));
  const growthData = chartLabels.map((label, index) => ({ label, value: dashboard?.growthTrend?.[index] ?? 0 }));

  const installations = dashboard?.recentInstallations ?? [];
  const activities =
    dashboard?.recentActivity.slice(0, 8).map((item) => ({
      id: item.id,
      Icon: item.tone === 'green' ? Check : item.tone === 'orange' ? CircleDollarSign : Users,
      text: item.text || item.body,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tone: item.tone,
    })) ?? [];
  const supportTickets = dashboard?.recentSupportTickets ?? [];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400" suppressHydrationWarning>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950" suppressHydrationWarning>
              {getGreeting()}, Admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading live network metrics...'
                : 'Here\u2019s what\u2019s happening across your network today.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Activity size={16} />
              View reports
            </Link>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <ClipboardList size={16} />
              Review bookings
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition-colors hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, detail, Icon, tone, accent, href }) => (
            <Link
              key={label}
              href={href}
              className="admin-stat-card group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                    {loading ? (
                      <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-slate-100 align-middle" />
                    ) : (
                      value
                    )}
                  </p>
                </div>
                <span className={`admin-stat-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl ${statAccents[accent].tile}`}>
                  <Icon size={20} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {detail ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      tone === 'negative'
                        ? 'text-rose-600'
                        : tone === 'positive'
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {detail}
                  </span>
                ) : (
                  <span />
                )}
                <ArrowUpRight
                  size={16}
                  className="text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2166f3]"
                />
              </div>
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 ${statAccents[accent].bar} opacity-0 transition-opacity group-hover:opacity-100`}
              />
            </Link>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <RevenueCard data={revenueData} loading={loading} />
          <SubscriberGrowthCard data={growthData} loading={loading} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(280px,.85fr)]">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarClock size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Installations</h2>
                    <p className="text-xs text-slate-400">Latest scheduled and completed field deployments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!loading && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {installations.length} shown
                    </span>
                  )}
                  <Link
                    href="/admin/installations"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2166f3] transition-colors hover:text-[#1d57d6]"
                  >
                    View all
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Subscriber</th>
                      <th className="px-6 py-3 font-semibold">Technician</th>
                      <th className="px-6 py-3 font-semibold">Schedule</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index} className="border-b border-slate-100 last:border-0">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                              <span className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-100" />
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-4 w-28 animate-pulse rounded bg-slate-100" />
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-6 w-28 animate-pulse rounded-full bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    ) : installations.length ? (
                      installations.map((installation) => {
                        const dateTime = formatInstallationDateTime(installation.date);
                        const status = getInstallationStatus(installation.status);
                        const badgeStyle = installationStatusStyles[status] ?? {
                          badge: 'bg-slate-100 text-slate-600',
                          dot: 'bg-slate-400',
                        };
                        const subscriberName = formatPersonName(installation.subscriber);
                        return (
                          <tr
                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                            key={installation.id}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                  {getInitials(subscriberName)}
                                </span>
                                <span className="text-sm font-semibold text-slate-900">{subscriberName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-600">
                              {formatPersonName(installation.technician)}
                            </td>
                            <td className="px-6 py-3.5">
                              <p className="text-sm font-medium text-slate-700">{dateTime.date}</p>
                              <p className="text-xs text-slate-400">{formatInstallationTime(installation.time)}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle.badge}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.dot}`} />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                          No recent installations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600">
                    <LifeBuoy size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Support Tickets</h2>
                    <p className="text-xs text-slate-400">Latest subscriber repair &amp; service requests</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!loading && dashboard && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        dashboard.openTickets > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {dashboard.openTickets} open
                    </span>
                  )}
                  <Link
                    href="/admin/tickets"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2166f3] transition-colors hover:text-[#1d57d6]"
                  >
                    View all
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Subscriber</th>
                      <th className="px-6 py-3 font-semibold">Concern</th>
                      <th className="px-6 py-3 font-semibold">Schedule</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index} className="border-b border-slate-100 last:border-0">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                              <span className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-4 w-40 animate-pulse rounded bg-slate-100" />
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-4 w-28 animate-pulse rounded bg-slate-100" />
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block h-6 w-24 animate-pulse rounded-full bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    ) : supportTickets.length ? (
                      supportTickets.map((ticket) => {
                        const status = ticketStatusLabels[ticket.status] || ticket.status;
                        const badgeStyle = ticketStatusStyles[status] ?? {
                          badge: 'bg-slate-100 text-slate-600',
                          dot: 'bg-slate-400',
                        };
                        const subscriberName = formatPersonName(ticket.subscriber);
                        return (
                          <tr
                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                            key={ticket.id}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-50 text-xs font-bold text-violet-600">
                                  {getInitials(subscriberName)}
                                </span>
                                <span className="text-sm font-semibold text-slate-900">{subscriberName}</span>
                              </div>
                            </td>
                            <td className="max-w-64 truncate px-6 py-3.5 text-sm text-slate-600">{ticket.concern}</td>
                            <td className="px-6 py-3.5">
                              <p className="text-sm font-medium text-slate-700">{formatSupportDate(ticket.date)}</p>
                              <p className="text-xs text-slate-400">{formatInstallationTime(ticket.time)}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle.badge}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.dot}`} />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                          No recent support tickets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">Quick Operations</h2>
              <p className="mt-0.5 text-xs text-slate-400">Jump directly to active queues</p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/admin/tickets"
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5 text-sm transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">Open support tickets</span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-violet-700">
                    {loading ? '—' : dashboard?.openTickets ?? 0}
                  </span>
                </Link>
                <Link
                  href="/admin/billing"
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5 text-sm transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">Pending bills</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-700">
                    {loading ? '—' : dashboard?.pendingBills ?? 0}
                  </span>
                </Link>
                <Link
                  href="/admin/bookings"
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5 text-sm transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">Booking approvals</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                  <p className="text-xs text-slate-400">Latest portal events</p>
                </div>
                <Link
                  href="/admin/notifications"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2166f3] transition-colors hover:text-[#1d57d6]"
                >
                  Alerts
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-3 px-3 py-3">
                      <span className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <span className="block h-3.5 w-full animate-pulse rounded bg-slate-100" />
                        <span className="block h-3 w-20 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))
                ) : activities.length ? (
                  activities.map(({ id, Icon, text, date, tone }) => (
                    <div className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50/70" key={id}>
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          tone === 'green'
                            ? 'bg-emerald-50 text-emerald-600'
                            : tone === 'orange'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-slate-700">{text}</p>
                        <p className="mt-1 text-xs text-slate-400">{date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">No recent activity.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
