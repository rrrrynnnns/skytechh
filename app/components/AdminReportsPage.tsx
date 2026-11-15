'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CircleDollarSign,
  Download,
  FileWarning,
  Receipt,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { BillingStatusCard, RevenueCard } from '@/app/components/TrendCharts';

type ReportData = {
  activeSubscribers: number;
  activeTechnicians: number;
  openTickets: number;
  revenueCollected: number;
  pendingBills: number;
  totalBilled: number;
  billsByStatus: {
    paid: number;
    unpaid: number;
    overdue: number;
  };
  revenueTrend: Array<{ label: string; value: number }>;
};

type Accent = 'emerald' | 'blue' | 'amber' | 'violet';

const accents: Record<Accent, { tile: string; bar: string }> = {
  emerald: { tile: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  blue: { tile: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500' },
  amber: { tile: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
  violet: { tile: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500' },
};

const formatCurrency = (value: number) => `₱${value.toLocaleString()}`;

export function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/reports', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load reports.');
      setReport(result);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function handleExportCsv() {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue Collected', String(report.revenueCollected)],
      ['Total Billed', String(report.totalBilled)],
      ['Pending Bills', String(report.pendingBills)],
      ['Active Subscribers', String(report.activeSubscribers)],
      ['Active Technicians', String(report.activeTechnicians)],
      ['Open Tickets', String(report.openTickets)],
      ['Paid Bills', String(report.billsByStatus.paid)],
      ['Unpaid Bills', String(report.billsByStatus.unpaid)],
      ['Overdue Bills', String(report.billsByStatus.overdue)],
      ['', ''],
      ['Month', 'Revenue'],
      ...report.revenueTrend.map((point) => [point.label, String(point.value)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sky-tech-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const statCards = useMemo<
    Array<{
      label: string;
      value: string;
      detail: string;
      tone: 'positive' | 'warning' | 'neutral';
      accent: Accent;
      href: string;
      Icon: LucideIcon;
    }>
  >(() => {
    if (!report) {
      return [
        { label: 'Total revenue', value: '₱0', detail: 'Awaiting data', tone: 'neutral', accent: 'emerald', href: '/admin/billing', Icon: CircleDollarSign },
        { label: 'Total billed', value: '₱0', detail: 'Awaiting data', tone: 'neutral', accent: 'blue', href: '/admin/billing', Icon: Receipt },
        { label: 'Pending bills', value: '0', detail: 'Awaiting data', tone: 'neutral', accent: 'amber', href: '/admin/billing', Icon: FileWarning },
        { label: 'Active subscribers', value: '0', detail: 'Awaiting data', tone: 'neutral', accent: 'violet', href: '/admin/subscribers', Icon: Users },
      ];
    }

    const collectionRate = report.totalBilled > 0 ? Math.round((report.revenueCollected / report.totalBilled) * 100) : 0;
    const unpaidCount = report.billsByStatus.unpaid + report.billsByStatus.overdue;

    return [
      {
        label: 'Total revenue',
        value: formatCurrency(report.revenueCollected),
        detail: `${report.billsByStatus.paid} paid · ${collectionRate}% collected`,
        tone: 'positive',
        accent: 'emerald',
        href: '/admin/billing',
        Icon: CircleDollarSign,
      },
      {
        label: 'Total billed',
        value: formatCurrency(report.totalBilled),
        detail: unpaidCount > 0 ? `${unpaidCount} unpaid or overdue` : 'All bills settled',
        tone: unpaidCount > 0 ? 'warning' : 'positive',
        accent: 'blue',
        href: '/admin/billing',
        Icon: Receipt,
      },
      {
        label: 'Pending bills',
        value: report.pendingBills.toLocaleString(),
        detail: report.openTickets > 0 ? `${report.openTickets} open support tickets` : 'No open tickets',
        tone: report.pendingBills > 0 ? 'warning' : 'positive',
        accent: 'amber',
        href: report.openTickets > 0 ? '/admin/tickets' : '/admin/billing',
        Icon: FileWarning,
      },
      {
        label: 'Active subscribers',
        value: report.activeSubscribers.toLocaleString(),
        detail: `${report.activeTechnicians} active technicians`,
        tone: 'positive',
        accent: 'violet',
        href: '/admin/subscribers',
        Icon: Users,
      },
    ];
  }, [report]);

  const revenueTrend = report?.revenueTrend ?? [];
  const billStatus = report?.billsByStatus ?? { paid: 0, unpaid: 0, overdue: 0 };

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Reports &amp; Analytics</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? 'Loading live metrics...' : 'Live revenue, billing mix, and subscriber performance'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadReport(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, detail, tone, accent, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="admin-stat-card group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-slate-100 align-middle" /> : value}
                </p>
              </div>
              <span className={`admin-stat-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accents[accent].tile}`}>
                <Icon size={20} />
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  tone === 'warning' ? 'text-amber-600' : tone === 'positive' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                {detail}
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2166f3]" />
            </div>
            <span className={`absolute inset-x-0 bottom-0 h-0.5 ${accents[accent].bar} opacity-0 transition-opacity group-hover:opacity-100`} />
          </Link>
        ))}
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <RevenueCard data={revenueTrend} loading={loading} subtitle="Paid bills collected over the last 6 months" />
        <BillingStatusCard mix={billStatus} loading={loading} />
      </div>
    </PortalShell>
  );
}
