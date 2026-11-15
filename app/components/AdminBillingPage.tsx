'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  Eye,
  FileText,
  Receipt,
  RefreshCw,
  Search,
  Wifi,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Bill = readonly [
  string, // 0: id
  string, // 1: subscriberId
  string, // 2: subscriberName
  string, // 3: plan
  string, // 4: billingPeriod
  string, // 5: formattedAmount
  string, // 6: dueDate
  string, // 7: status
  string, // 8: paymentMethod
  string, // 9: referenceNumber
  string, // 10: receiptImage
  number, // 11: rawAmount
];

type Filter = 'All' | 'Paid' | 'Unpaid' | 'Overdue' | 'Pending_Confirmation';

function formatDueDate(value: string | Date | null | undefined) {
  if (!value) return '00-00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '00-00';
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatBillingPeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const statusStyles: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-600',
  Unpaid: 'bg-amber-50 text-amber-600',
  Overdue: 'bg-red-50 text-red-500',
  Pending_Confirmation: 'bg-orange-50 text-orange-600',
};

export function AdminBillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [isPaying, setIsPaying] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadBills = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/bills', { cache: 'no-store' });
      const result = await response.json();
      if (Array.isArray(result.data)) {
        setBills(
          result.data.map(
            (item: {
              id: string;
              subscriberId: string;
              subscriber?: { name: string };
              plan: string;
              billingPeriod: string;
              amount: number;
              dueDate: string;
              status: string;
              paymentMethod?: string | null;
              referenceNumber?: string | null;
              receiptImage?: string | null;
            }) => [
              item.id,
              item.subscriberId,
              formatPersonName(item.subscriber?.name || ''),
              item.plan.replace('_', ' '),
              formatBillingPeriod(item.billingPeriod),
              `₱${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              formatDueDate(item.dueDate),
              item.status,
              item.paymentMethod || '',
              item.referenceNumber || '',
              item.receiptImage || '',
              Number(item.amount) || 0,
            ],
          ),
        );
      }
    } catch {
      // ignore fetch error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBills();
  }, [loadBills]);

  const stats = useMemo(() => {
    let paidCount = 0;
    let paidTotal = 0;
    let pendingCount = 0;
    let unpaidCount = 0;
    let unpaidTotal = 0;
    let overdueCount = 0;
    let overdueTotal = 0;

    for (const bill of bills) {
      const amount = bill[11];
      if (bill[7] === 'Paid') {
        paidCount += 1;
        paidTotal += amount;
      } else if (bill[7] === 'Pending_Confirmation') {
        pendingCount += 1;
      } else if (bill[7] === 'Overdue') {
        overdueCount += 1;
        overdueTotal += amount;
      } else {
        unpaidCount += 1;
        unpaidTotal += amount;
      }
    }

    return {
      total: bills.length,
      paidCount,
      paidTotal,
      pendingCount,
      unpaidCount,
      unpaidTotal,
      overdueCount,
      overdueTotal,
    };
  }, [bills]);

  const visibleBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          (filter === 'All' || bill[7] === filter) &&
          bill.slice(0, 10).join(' ').toLowerCase().includes(query.toLowerCase()),
      ),
    [bills, filter, query],
  );

  function openBill(bill: Bill) {
    setPaymentMethod(bill[8] || 'GCash');
    setSelectedBill(bill);
  }

  function openReceipt(bill: Bill) {
    setSelectedBill(bill);
    setIsReceiptOpen(true);
  }

  function closeReceipt() {
    setIsReceiptOpen(false);
    if (selectedBill?.[7] !== 'Pending_Confirmation') setSelectedBill(null);
  }

  async function confirmPayment() {
    if (!selectedBill) return;
    setIsPaying(true);
    try {
      const response = await fetch(`/api/bills/${selectedBill[0]}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, referenceNumber: selectedBill[9] || undefined }),
      });
      if (response.ok) {
        setBills((current) =>
          current.map((bill) =>
            bill[0] === selectedBill[0]
              ? [bill[0], bill[1], bill[2], bill[3], bill[4], bill[5], bill[6], 'Paid', paymentMethod, bill[9], bill[10], bill[11]]
              : bill,
          ),
        );
      }
    } finally {
      setIsPaying(false);
      setSelectedBill(null);
    }
  }

  function handleExportCsv() {
    if (!visibleBills.length) return;
    const header = ['Subscriber ID', 'Subscriber', 'Plan', 'Billing Month', 'Amount', 'Due Date', 'Status', 'Payment Method', 'Reference Number'];
    const csvRows = [
      header,
      ...visibleBills.map((b) => [b[1], b[2], b[3], b[4], String(b[11]), b[6], b[7] === 'Pending_Confirmation' ? 'Pending' : b[7], b[8], b[9]]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sky-tech-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const isReviewing = selectedBill?.[7] === 'Pending_Confirmation';

  const summaryCards: Array<{
    label: string;
    value: string;
    detail: string;
    Icon: typeof CircleDollarSign;
    tile: string;
    bar: string;
    dot: string;
    targetFilter: Filter;
  }> = [
    {
      label: 'Total collected',
      value: `₱${Math.round(stats.paidTotal).toLocaleString()}`,
      detail: `${stats.paidCount} paid ${stats.paidCount === 1 ? 'bill' : 'bills'}`,
      Icon: CircleDollarSign,
      tile: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
      dot: 'text-emerald-600',
      targetFilter: 'Paid',
    },
    {
      label: 'Pending review',
      value: stats.pendingCount.toLocaleString(),
      detail: stats.pendingCount > 0 ? 'Awaiting confirmation' : 'No proofs pending',
      Icon: Clock,
      tile: 'bg-orange-50 text-orange-600',
      bar: 'bg-orange-500',
      dot: stats.pendingCount > 0 ? 'text-orange-600' : 'text-emerald-600',
      targetFilter: 'Pending_Confirmation',
    },
    {
      label: 'Unpaid bills',
      value: stats.unpaidCount.toLocaleString(),
      detail: `₱${Math.round(stats.unpaidTotal).toLocaleString()} open balance`,
      Icon: FileText,
      tile: 'bg-blue-50 text-blue-600',
      bar: 'bg-blue-500',
      dot: stats.unpaidCount > 0 ? 'text-amber-600' : 'text-emerald-600',
      targetFilter: 'Unpaid',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount.toLocaleString(),
      detail: stats.overdueCount > 0 ? `₱${Math.round(stats.overdueTotal).toLocaleString()} past due` : 'All accounts on time',
      Icon: AlertTriangle,
      tile: 'bg-red-50 text-red-500',
      bar: 'bg-red-500',
      dot: stats.overdueCount > 0 ? 'text-red-500' : 'text-emerald-600',
      targetFilter: 'Overdue',
    },
  ];

  const filterTabs: Array<[Filter, string, number]> = [
    ['All', 'All', stats.total],
    ['Paid', 'Paid', stats.paidCount],
    ['Unpaid', 'Unpaid', stats.unpaidCount],
    ['Overdue', 'Overdue', stats.overdueCount],
    ['Pending_Confirmation', 'Pending', stats.pendingCount],
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Billing</h1>
            <p className="mt-1 text-sm text-slate-500">
              All active accounts, monthly billing cycles, and payment verification
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadBills(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!visibleBills.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, targetFilter }) => {
            const active = filter === targetFilter;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter((current) => (current === targetFilter ? 'All' : targetFilter))}
                className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                  active ? 'border-[#2166f3] ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                      {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-slate-100 align-middle" /> : value}
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
                <span className={`absolute inset-x-0 bottom-0 h-0.5 ${bar} transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            );
          })}
        </div>

        {/* Bills Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subscriber, ID, or period..."
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
                  const active = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
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

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {visibleBills.length} {visibleBills.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Subscriber</th>
                  <th className="px-5 py-3.5">Plan &amp; Period</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-5 w-28 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-7 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <Receipt size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No bills found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || filter !== 'All' ? 'Try adjusting your search or status filter.' : 'No billing records yet.'}
                      </p>
                      {(query || filter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setFilter('All');
                          }}
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleBills.map((bill) => {
                    const [id, subscriberId, name, plan, billingPeriod, formattedAmount, dueDate, billStatus, method, refNum, receiptImg] = bill;
                    return (
                      <tr key={id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{name}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">#{subscriberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2166f3]">
                            <Wifi size={12} />
                            {plan}
                          </span>
                          <p className="mt-1 text-xs text-slate-400">{billingPeriod}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold tabular-nums text-slate-900">{formattedAmount}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Due {dueDate}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${statusStyles[billStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {billStatus === 'Pending_Confirmation' ? 'Pending' : billStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">{method || '—'}</p>
                          {refNum && <p className="mt-0.5 font-mono text-[11px] text-slate-400">{refNum}</p>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {billStatus === 'Paid' ? (
                            receiptImg ? (
                              <button
                                type="button"
                                onClick={() => openReceipt(bill)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                              >
                                <Eye size={13} />
                                View Receipt
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Settled</span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => openBill(bill)}
                              className={
                                billStatus === 'Pending_Confirmation'
                                  ? 'whitespace-nowrap rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-orange-600'
                                  : 'rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700'
                              }
                            >
                              {billStatus === 'Pending_Confirmation' ? 'Review & Confirm' : 'Pay now'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Payment Confirmation / Verify Proof Modal */}
      {!isReceiptOpen && selectedBill && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3 backdrop-blur-xs sm:p-5"
          onMouseDown={() => setSelectedBill(null)}
        >
          <div
            className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-orange-600">
                  <Receipt size={21} />
                </span>
                <div>
                  <h2 className="text-lg font-bold">{isReviewing ? 'Verify GCash Proof' : 'Confirm Payment'}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {isReviewing
                      ? 'Confirm transaction number and receipt image to auto-deduct due bill.'
                      : 'Record this bill payment.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className={isReviewing ? 'space-y-4' : ''}>
                <dl className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <dt className="text-slate-500">Subscriber</dt>
                    <dd className="font-semibold">{selectedBill[2]}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-slate-500">Account ID</dt>
                    <dd className="font-mono font-semibold">{selectedBill[1]}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-semibold">{selectedBill[3]}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-slate-500">Billing period</dt>
                    <dd className="font-semibold">{selectedBill[4]}</dd>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-3">
                    <dt className="font-bold">Amount Due</dt>
                    <dd className="text-xl font-bold tabular-nums text-[#2563eb]">{selectedBill[5]}</dd>
                  </div>
                </dl>

                {isReviewing && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                      Submitted payment details
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        <span className="text-slate-500">Payment method:</span>{' '}
                        <strong>{selectedBill[8] || 'GCash'}</strong>
                      </p>
                      <p>
                        <span className="text-slate-500">Reference number:</span>{' '}
                        <strong className="font-mono">{selectedBill[9] || 'Not provided'}</strong>
                      </p>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-blue-800">
                      Confirming this payment will mark the bill as Paid and clear the subscriber&apos;s due balance.
                    </p>
                  </div>
                )}
              </div>

              {isReviewing && (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Uploaded {selectedBill[8] === 'GCash' ? 'GCash' : 'payment'} receipt
                    </p>
                    {selectedBill[10] && (
                      <button
                        type="button"
                        onClick={() => setIsReceiptOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        Open Full Size
                      </button>
                    )}
                  </div>
                  {selectedBill[10] ? (
                    <button
                      type="button"
                      onClick={() => setIsReceiptOpen(true)}
                      className="group relative mt-2 block h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950"
                    >
                      <img
                        src={selectedBill[10]}
                        alt="Uploaded payment receipt"
                        className="h-full w-full object-contain transition duration-200 group-hover:brightness-75"
                      />
                      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                        Click to Zoom Receipt
                      </span>
                    </button>
                  ) : (
                    <div className="mt-2 grid h-32 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                      Receipt image unavailable
                    </div>
                  )}
                </div>
              )}

              {!isReviewing && (
                <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payment method
                  <div className="relative mt-2">
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                    >
                      <option>GCash</option>
                      <option>Walk-in</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </label>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying}
                onClick={confirmPayment}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {isPaying ? (
                  'Processing...'
                ) : (
                  <>
                    <Check size={16} />
                    {isReviewing ? 'Confirm Payment & Deduct Bill' : 'Confirm Payment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size receipt lightbox */}
      {isReceiptOpen && selectedBill?.[10] && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-5 backdrop-blur-sm"
          onMouseDown={closeReceipt}
        >
          <div className="relative max-h-[92vh] max-w-[92vw]" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={closeReceipt}
              aria-label="Close full-size receipt"
              className="absolute -right-3 -top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-slate-700/90 text-2xl text-white shadow-lg hover:bg-slate-600"
            >
              ×
            </button>
            <img
              src={selectedBill[10]}
              alt="Full-size uploaded payment receipt"
              className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </PortalShell>
  );
}
