'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CircleDollarSign, FileText, MoreHorizontal, Users, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type DashboardResponse = {
  activeSubscribers: number;
  activeTechnicians: number;
  openTickets: number;
  revenueCollected: number;
  pendingBills: number;
  revenueTrend: { label: string; value: number }[];
  growthTrend: number[];
  recentInstallations: { id: string; subscriber: string; technician: string; date: string; time?: string; status: string }[];
  recentActivity: { id: string; text: string; body: string; date: string; tone: 'green' | 'orange' | 'blue' }[];
  recentSupportTickets: { id: string; subscriber: string; concern: string; date?: string | null; time?: string | null; status: string }[];
};

type Stat = { label: string; value: string; detail: string; Icon: LucideIcon; tone: 'positive' | 'neutral' | 'negative' };

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

const installationStatusStyles: Record<string, string> = {
  'Installation Confirmed': 'bg-emerald-50 text-emerald-500',
  Completed: 'bg-slate-50 text-slate-500',
  'Installation Closed': 'bg-slate-50 text-slate-500',
  'Installation Rescheduled': 'bg-amber-50 text-amber-500',
};

const ticketStatusLabels: Record<string, string> = {
  Open: 'Submitted',
  'In Progress': 'Repair Confirmed',
  Resolved: 'Repair Closed',
  Closed: 'Repair Rescheduled',
};

const ticketStatusStyles: Record<string, string> = {
  Submitted: 'bg-blue-50 text-blue-500',
  'Repair Confirmed': 'bg-emerald-50 text-emerald-500',
  'Repair Closed': 'bg-slate-50 text-slate-500',
  'Repair Rescheduled': 'bg-amber-50 text-amber-500',
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

function ChartGrid({ children, labels, yLabels }: { children: React.ReactNode; labels: string[]; yLabels: string[] }) {
  return <div className="relative mt-6 grid h-56 grid-cols-[2.75rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_1.75rem]"><div className="flex flex-col justify-between pr-2 text-right text-xs text-slate-400">{yLabels.map((label, index) => <span className="-translate-y-1/2 first:translate-y-0 last:translate-y-0" key={`${label}-${index}`}>{label}</span>)}</div><div className="relative"><div className="absolute inset-0 flex flex-col justify-between">{yLabels.map((label, index) => <div className="border-t border-dashed border-slate-100" key={`${label}-grid-${index}`} />)}</div><div className="absolute inset-0">{children}</div></div><div className="col-start-2 flex justify-between pr-1 text-xs text-slate-400">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div></div>;
}

function LineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0];
  const maxValue = Math.max(...safeValues, 1);
  const points = safeValues.map((value, index) => `${index * 20},${100 - (value / maxValue) * 100}`).join(' ');
  const yLabels = [maxValue, Math.round(maxValue * 0.75), Math.round(maxValue * 0.5), Math.round(maxValue * 0.25), 0].map(String);
  return <ChartGrid labels={labels} yLabels={yLabels}><svg className="h-[calc(100%-28px)] w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3b71ed" stopOpacity="0.18" /><stop offset="1" stopColor="#3b71ed" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#growth-fill)" /><polyline points={points} fill="none" stroke="#2f6bed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />{safeValues.map((value, index) => <circle key={`${value}-${index}`} cx={index * 20} cy={100 - (value / maxValue) * 100} r="1.25" fill="#6d9af5" vectorEffect="non-scaling-stroke" />)}</svg></ChartGrid>;
}

function RevenueChart({ values, labels }: { values: number[]; labels: string[] }) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0];
  const maxValue = Math.max(...safeValues, 1);
  const yLabels = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((value) => `₱${Math.round(value / 1000)}k`);
  return <ChartGrid labels={labels} yLabels={yLabels}><div className="flex h-[calc(100%-28px)] items-end justify-between gap-4 px-2">{safeValues.map((value, index) => <div className="flex h-full flex-1 items-end justify-center" key={`${value}-${index}`}><div className={`w-7 rounded-t transition-all ${value ? 'bg-[#2f68e6] hover:bg-[#1f54ca]' : 'bg-slate-100'}`} style={{ height: `${value ? Math.max(4, (value / maxValue) * 100) : 4}%` }} title={`${labels[index]}: ₱${value.toLocaleString()}`} /></div>)}</div></ChartGrid>;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load dashboard metrics.');
        const result = await response.json();
        setDashboard(result);
      })
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo<Stat[]>(() => {
    if (!dashboard) {
      return [
        { label: 'Active subscribers', value: '0', detail: '', Icon: Users, tone: 'neutral' },
        { label: 'Active technicians', value: '0', detail: '', Icon: Wrench, tone: 'neutral' },
        { label: 'Revenue collected', value: '₱0', detail: '', Icon: CircleDollarSign, tone: 'neutral' },
        { label: 'Pending bills', value: '0', detail: '', Icon: FileText, tone: 'negative' },
      ];
    }

    return [
      { label: 'Active subscribers', value: String(dashboard.activeSubscribers), detail: dashboard.activeSubscribers > 0 ? 'Live count' : 'No active subscribers', Icon: Users, tone: 'positive' },
      { label: 'Active technicians', value: String(dashboard.activeTechnicians), detail: dashboard.activeTechnicians > 0 ? 'Available now' : 'No active technicians', Icon: Wrench, tone: 'neutral' },
      { label: 'Revenue collected', value: `₱${dashboard.revenueCollected.toLocaleString()}`, detail: dashboard.revenueCollected > 0 ? 'Across all paid bills' : 'No paid bills yet', Icon: CircleDollarSign, tone: 'positive' },
      { label: 'Pending bills', value: String(dashboard.pendingBills), detail: dashboard.pendingBills > 0 ? `${dashboard.pendingBills} need attention` : 'All clear', Icon: FileText, tone: dashboard.pendingBills > 0 ? 'negative' : 'neutral' },
    ];
  }, [dashboard]);

  const revenueValues = dashboard?.revenueTrend.map((entry) => entry.value) ?? [0, 0, 0, 0, 0, 0];
  const growthValues = dashboard?.growthTrend ?? [0, 0, 0, 0, 0, 0];
  const chartLabels = dashboard?.revenueTrend.map((entry) => entry.label) ?? ['—', '—', '—', '—', '—', '—'];

  const installations = dashboard?.recentInstallations ?? [];
  const activities = dashboard?.recentActivity.slice(0, 10).map((item) => ({
    id: item.id,
    Icon: item.tone === 'green' ? Check : item.tone === 'orange' ? CircleDollarSign : Users,
    text: item.text || item.body,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    tone: item.tone,
  })) ?? [];
  const supportTickets = dashboard?.recentSupportTickets ?? [];

  return <PortalShell role="admin"><div className="space-y-7">
    <div className="flex items-start justify-between gap-6"><div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1><p className="mt-1 text-base text-slate-500">{loading ? 'Loading metrics...' : 'Welcome back, Admin'}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Today</p><p className="mt-1 text-sm font-semibold text-slate-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail, Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white px-6 py-5"><div className="flex items-start justify-between"><Icon size={19} className="text-slate-400" />{detail && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === 'negative' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{detail}</span>}</div><p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-6"><div><h2 className="font-bold text-slate-950">Monthly Revenue</h2><p className="mt-1 text-sm text-slate-400">Paid bills collected over the last 6 months</p></div><RevenueChart values={revenueValues} labels={chartLabels} /></section><section className="rounded-xl border border-slate-200 bg-white p-6"><div><h2 className="font-bold text-slate-950">Subscriber Growth</h2><p className="mt-1 text-sm text-slate-400">Active subscribers by month</p></div><LineChart values={growthValues} labels={chartLabels} /></section></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(260px,.8fr)]"><div className="space-y-5"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="font-bold">Recent Installations</h2><Link href="/admin/installations" className="text-sm font-semibold text-[#3b6ff0] transition-colors duration-150 hover:text-[#2d3fc7]">View all</Link></div><div className="overflow-x-auto"><table className="w-full min-w-175 text-left"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-4 font-semibold">Subscriber</th><th className="px-6 py-4 font-semibold">Technician</th><th className="px-6 py-4 font-semibold">Date</th><th className="px-6 py-4 font-semibold">Time</th><th className="px-6 py-4 font-semibold">Status</th></tr></thead><tbody>{installations.length ? installations.map((installation) => { const dateTime = formatInstallationDateTime(installation.date); const status = getInstallationStatus(installation.status); return <tr className="border-b border-slate-100 last:border-0" key={installation.id}><td className="px-6 py-4 text-sm font-semibold">{formatPersonName(installation.subscriber)}</td><td className="px-6 py-4 text-sm text-slate-500">{formatPersonName(installation.technician)}</td><td className="px-6 py-4 text-sm text-slate-500">{dateTime.date}</td><td className="px-6 py-4 text-sm text-slate-500">{formatInstallationTime(installation.time)}</td><td className="px-6 py-4"><span className={`admin-status-pill rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${installationStatusStyles[status] ?? 'bg-slate-50 text-slate-500'}`}>{status}</span></td></tr>; }) : <tr><td colSpan={5} className="px-6 py-5 text-sm text-slate-500">No recent installations found.</td></tr>}</tbody></table></div></section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="font-bold">Recent Support Tickets</h2><Link href="/admin/tickets" className="text-sm font-semibold text-[#3b6ff0] transition-colors duration-150 hover:text-[#2d3fc7]">View all</Link></div><div className="overflow-x-auto"><table className="w-full min-w-175 text-left"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-4 font-semibold">Subscriber</th><th className="px-6 py-4 font-semibold">Concern</th><th className="px-6 py-4 font-semibold">Date</th><th className="px-6 py-4 font-semibold">Time</th><th className="px-6 py-4 font-semibold">Status</th></tr></thead><tbody>{supportTickets.length ? supportTickets.map((ticket) => { const status = ticketStatusLabels[ticket.status] || ticket.status; return <tr className="border-b border-slate-100 last:border-0" key={ticket.id}><td className="px-6 py-4 text-sm font-semibold">{formatPersonName(ticket.subscriber)}</td><td className="px-6 py-4 text-sm text-slate-500">{ticket.concern}</td><td className="px-6 py-4 text-sm text-slate-500">{formatSupportDate(ticket.date)}</td><td className="px-6 py-4 text-sm text-slate-500">{formatInstallationTime(ticket.time)}</td><td className="px-6 py-4"><span className={`admin-status-pill rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${ticketStatusStyles[status] ?? 'bg-slate-50 text-slate-500'}`}>{status}</span></td></tr>; }) : <tr><td colSpan={5} className="px-6 py-5 text-sm text-slate-500">No recent support tickets found.</td></tr>}</tbody></table></div></section></div><section className="rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="font-bold">Recent Activity</h2><button aria-label="More activity" className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-[#f1f5f9]"><MoreHorizontal size={18} /></button></div><div className="space-y-1 p-4">{activities.length ? activities.map(({ id, Icon, text, date, tone }) => <div className="flex gap-3 rounded-lg px-1 py-2" key={id}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'orange' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{text}</p><p className="mt-1 text-xs text-slate-400">{date}</p></div></div>) : <p className="px-1 py-6 text-sm text-slate-500">No recent activity.</p>}</div></section></div></div></PortalShell>;
}
