'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, Download, Search, X } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Bill = readonly [string, string, string, string, string, string, string, string, string];
type Filter = 'All' | 'Paid' | 'Unpaid' | 'Overdue';

function formatDueDate(value: string | Date | null | undefined) {
  if (!value) return '00-00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '00-00';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function formatBillingPeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const statusStyles: Record<string, string> = {
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  Unpaid: 'border-amber-200 bg-amber-50 text-amber-600',
  Overdue: 'border-red-200 bg-red-50 text-red-600',
};

export function AdminBillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    fetch('/api/bills').then((response) => response.json()).then((result) => {
      if (Array.isArray(result.data)) setBills(result.data.map((item: { id: string; subscriberId: string; subscriber?: { name: string }; plan: string; billingPeriod: string; amount: number; dueDate: string; status: string; paymentMethod?: string | null }) => [item.id, item.subscriberId, formatPersonName(item.subscriber?.name || ''), item.plan.replace('_', ' '), formatBillingPeriod(item.billingPeriod), `₱${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, formatDueDate(item.dueDate), item.status, item.paymentMethod || '']));
    }).catch(() => undefined);
  }, []);

  const visibleBills = bills.filter((bill) => (filter === 'All' || bill[7] === filter) && bill.join(' ').toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const table = document.querySelector('table[class*="min-w-[1050px]"]');
    const headers = table?.querySelectorAll<HTMLTableCellElement>('thead th');
    if (headers?.[0]) headers[0].textContent = 'SUBSCRIBER ID';
    if (headers?.[1]) headers[1].textContent = 'NAME';
  }, [bills]);

  async function confirmPayment() {
    if (!selectedBill) return;
    setIsPaying(true);
    try {
      const response = await fetch(`/api/bills/${selectedBill[0]}/pay`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod }) });
      if (response.ok) setBills((current) => current.map((bill) => bill[0] === selectedBill[0] ? [bill[0], bill[1], bill[2], bill[3], bill[4], bill[5], bill[6], 'Paid', paymentMethod] : bill));
    } finally {
      setIsPaying(false);
      setSelectedBill(null);
    }
  }

  return <PortalShell role="admin">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-2xl font-bold tracking-tight">Billing</h1><p className="mt-1 text-sm text-slate-500">All active accounts and their monthly billing cycle</p></div><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Download size={16} />Export CSV</button></div>
    <div className="mt-7 flex flex-wrap items-center gap-3"><div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subscriber..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]" /></div><label className="status-filter-container relative"><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter bills by status" className="status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]"><option>All</option><option>Paid</option><option>Unpaid</option><option>Overdue</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} /></label><span className="ml-auto text-sm text-slate-400">{visibleBills.length} records</span></div>
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left"><thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400"><tr>{['ID', 'SUBSCRIBER', 'Plan', 'BILLING MONTH', 'Amount', 'DUE', 'Status', 'Action'].map((heading) => <th className="px-5 py-4" key={heading}>{heading}</th>)}</tr></thead><tbody className="text-sm">{visibleBills.map((bill) => <tr className="border-t border-slate-100" key={bill[0]}><td className="px-5 py-4 text-slate-900">{bill[1]}</td><td className="px-5 py-4 font-semibold text-slate-900">{bill[2]}</td><td className="px-5 py-4 text-slate-500">{bill[3]}</td><td className="px-5 py-4 text-slate-500">{bill[4]}</td><td className="px-5 py-4 font-semibold text-slate-900">{bill[5]}</td><td className="px-5 py-4 text-slate-500">{bill[6]}</td><td className="px-5 py-4"><span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[bill[7]]}`}>{bill[7]}</span></td><td className="px-5 py-4">{bill[7] === 'Paid' ? <span className="text-slate-400">{bill[8]}</span> : <button onClick={() => setSelectedBill(bill)} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Pay now</button>}</td></tr>)}</tbody></table></div></div>
    {selectedBill && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5" onMouseDown={() => setSelectedBill(null)}><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="text-lg font-bold">Confirm Payment</h2><button onClick={() => setSelectedBill(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div><div className="p-6"><dl className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div className="flex justify-between py-1"><dt className="text-slate-500">ID</dt><dd className="font-semibold">{selectedBill[1]}</dd></div><div className="flex justify-between py-1"><dt className="text-slate-500">Subscriber</dt><dd className="font-semibold">{selectedBill[2]}</dd></div><div className="flex justify-between py-1"><dt className="text-slate-500">Plan</dt><dd className="font-semibold">{selectedBill[3]}</dd></div><div className="flex justify-between py-1"><dt className="text-slate-500">Period</dt><dd className="font-semibold">{selectedBill[4]}</dd></div><div className="mt-2 flex justify-between border-t border-slate-200 pt-3"><dt className="font-bold">Amount Due</dt><dd className="text-xl font-bold text-[#2563eb]">{selectedBill[5]}</dd></div></dl><label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">Payment method<div className="relative mt-2"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"><option>GCash</option><option>Walk-in</option><option>Bank Transfer</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} /></div></label><div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5"><button onClick={() => setSelectedBill(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={isPaying} onClick={confirmPayment} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">{isPaying ? 'Processing...' : <><Check size={16} />Confirm Payment</>}</button></div></div></div></div>}
  </PortalShell>;
}
