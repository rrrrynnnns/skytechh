'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, FileText as LucideFileText } from 'lucide-react';
import type { ComponentProps } from 'react';
import { PortalShell } from '@/app/components/PortalShell';

type Bill = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  billingPeriod: string;
  paymentDate?: string | null;
  postingDate?: string | null;
};

function FileText({ pesoColor = 'amber', ...props }: ComponentProps<typeof LucideFileText> & { pesoColor?: 'amber' | 'emerald' }) {
  return (
    <span className="relative inline-block text-[#2447b6]">
      <LucideFileText {...props} />
      <span className={`absolute -bottom-1 -right-1 text-[11px] font-extrabold leading-none ${pesoColor === 'emerald' ? 'text-emerald-600' : 'text-amber-500'}`}>₱</span>
    </span>
  );
}

const historyOptions = ['Last 3 months', 'Last 6 months', 'Last 12 months'];
const historyRangeMonths: Record<string, number> = {
  'Last 3 months': 3,
  'Last 6 months': 6,
  'Last 12 months': 12,
};

function formatBillingCycleParts(billingPeriod: string) {
	const [year, month] = billingPeriod.split('-').map(Number);
	const start = new Date(year, month - 1, 10);
	const end = new Date(year, month, 9);
	return {
		start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
		end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
	};
}

function formatBillingCycle(billingPeriod: string) {
	const cycle = formatBillingCycleParts(billingPeriod);
	return `${cycle.start} to ${cycle.end}`;
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [subscriberName, setSubscriberName] = useState('Subscriber');
  const [subscriberId, setSubscriberId] = useState('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [historyRange, setHistoryRange] = useState('Last 3 months');
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/account')
      .then((response) => response.json())
      .then((result) => {
        if (result.data?.name) setSubscriberName(result.data.name);
        if (result.data?.id) setSubscriberId(result.data.id);
      })
      .catch(() => undefined);

    fetch('/api/bills')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setBills(result.data);
          const selectedId = new URLSearchParams(window.location.search).get('bill');
          const requestedBill = result.data.find((bill: Bill) => bill.id === selectedId);
          if (requestedBill) setSelectedBill(requestedBill);
        }
      })
      .catch(() => undefined);
  }, []);

  const pending = bills.find((bill) => bill.status !== 'Paid');
  const allPaidHistory = bills
    .filter((bill) => bill.status === 'Paid')
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const visibleHistoryCount = historyRangeMonths[historyRange];

  const history = allPaidHistory
    .filter((bill) => {
      const billDate = new Date(bill.dueDate);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - visibleHistoryCount);
      return billDate >= cutoff;
    })
    .slice(0, visibleHistoryCount);

  const hasVisibleHistory = history.length > 0;

  if (selectedBill) {
    if (selectedBill.status === 'Paid') {
      const paymentDate = new Date(selectedBill.paymentDate || selectedBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const postingDate = new Date(selectedBill.postingDate || selectedBill.paymentDate || selectedBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return (
        <PortalShell role="subscriber">
          <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-white">
            <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-[#f4f9fd] px-5 py-4 text-[#172b4d] sm:px-8 lg:px-10">
              <button type="button" onClick={() => setSelectedBill(null)} aria-label="Back to transactions" className="text-3xl leading-none">
                <ArrowLeft size={28} />
              </button>
              <h1 className="text-lg font-semibold uppercase tracking-[0.2em]">History</h1>
            </header>
            <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
              <section className="border-b border-slate-100 bg-[#f4f9fd] px-8 py-5 sm:px-12">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <FileText size={38} pesoColor="emerald" />
                    <h2 className="text-xl font-bold text-[#2447b6]">Amount paid</h2>
                  </div>
                  <p className="text-xl font-bold text-[#2447b6]">₱{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </div>
              </section>
              <section className="px-8 py-6 sm:px-12">
                <div className="divide-y divide-slate-200">
                  <div className="flex items-center justify-between gap-6 py-4 first:pt-0">
                    <p className="text-base text-slate-500">Account</p>
                    <p className="text-right text-base font-bold text-[#172b4d]">{subscriberName}{subscriberId ? <><br />{subscriberId}</> : null}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-4">
                    <p className="text-base text-slate-500">Payment channel</p>
                    <p className="text-right text-base font-bold text-[#172b4d]">{selectedBill.paymentMethod || 'Online payment'}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-4">
                    <p className="text-base text-slate-500">Payment date</p>
                    <p className="text-right text-base font-bold text-[#172b4d]">{paymentDate}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-4">
                    <p className="text-base text-slate-500">Posting date</p>
                    <p className="text-right text-base font-bold text-[#172b4d]">{postingDate}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-4">
                    <p className="text-base text-slate-500">OR number</p>
                    <p className="max-w-[60%] text-right text-base font-bold text-[#172b4d]">{selectedBill.referenceNumber || 'Not available'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="mt-10 w-full rounded-md border-2 border-[#2f68e6] px-4 py-3 text-lg font-bold text-[#2f68e6] transition hover:bg-[#edf4ff]"
                >
                  View OR
                </button>
              </section>
            </main>
          </div>
          {isReceiptOpen ? (
            <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f9fd]">
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                aria-label="Close official receipt"
                className="absolute right-5 top-5 z-10 text-4xl font-light leading-none text-[#244b80]"
              >
                ×
              </button>
              <div className="scrollbar-hidden flex-1 overflow-y-auto px-6 pb-32 pt-16">
                <article className="mx-auto max-w-[580px] bg-white px-7 py-10 font-mono text-[12px] leading-6 text-slate-900 shadow-sm sm:px-12 sm:text-sm">
                  <div className="text-center">
                    <p>Sky-Tech Communications, Inc.</p>
                    <p>Telecommunications</p>
                    <p className="mt-5">Official Receipt</p>
                  </div>
                  <div className="mt-8 space-y-1">
                    <p>Customer&apos;s Name: {subscriberName}</p>
                    <p>Account No.: {subscriberId || 'Not available'}</p>
                    <div className="mt-5 flex justify-between border-b border-slate-900 pb-1">
                      <span>Transaction</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly internet service</span>
                      <span>{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-4 flex justify-between border-t border-slate-900 pt-1">
                      <span>Total:</span>
                      <span>{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="mt-6">Paid by: {selectedBill.paymentMethod || 'Online payment'}</p>
                    <p>Receipt #: {selectedBill.referenceNumber || 'Not available'}</p>
                    <p>Date: {new Date(selectedBill.dueDate).toISOString().slice(0, 10)} 12:00:00</p>
                    <p className="mt-6 text-center">Thank you!</p>
                  </div>
                </article>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="absolute bottom-6 left-6 right-6 rounded-xl bg-[#2f78df] px-4 py-4 text-lg font-bold text-white shadow-lg"
              >
                Download OR
              </button>
            </div>
          ) : null}
        </PortalShell>
      );
    }

    return (
      <PortalShell role="subscriber">
        <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#eef4fb]">
          <header className="flex shrink-0 items-center gap-3 bg-[#2447b6] px-5 py-5 text-white sm:px-8 lg:px-10">
            <button type="button" onClick={() => setSelectedBill(null)} aria-label="Back to transactions" className="rounded-full bg-white/15 p-2">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Bill Details</h1>
          </header>
          <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10">
            <section className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h2 className="text-2xl font-bold text-[#2447b6]">{subscriberName}</h2>
                <p className="mt-1 text-base font-semibold text-slate-500">{formatBillingCycle(selectedBill.billingPeriod)}</p>
              </div>
              <div className="px-6 py-7 text-center sm:px-8">
                <p className="text-base font-semibold text-slate-500">Total amount to pay</p>
                <p className="mt-2 text-4xl font-bold text-[#2447b6]">₱{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <Link href="/subscriber/pay-bills" className="mt-6 block rounded-xl bg-[#2f68e6] px-5 py-3 text-base font-bold text-white transition hover:bg-[#2258d1]">
                  Pay Now
                </Link>
              </div>
            </section>
          </main>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell role="subscriber">
      <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#f7f9fc]">
        <header className="flex shrink-0 items-center gap-3 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10">
          <Link href="/subscriber/my-account" aria-label="Back to home" className="rounded-full bg-white/15 p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">My Transactions</h1>
        </header>

        <div className="shrink-0 border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('Pending')}
              className={`border-b-2 px-0 py-5 text-sm font-semibold ${activeTab === 'Pending' ? 'border-[#2f68e6] text-[#2f68e6]' : 'border-transparent text-slate-400'}`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('History')}
              className={`border-b-2 px-0 py-5 text-sm font-semibold ${activeTab === 'History' ? 'border-[#2f68e6] text-[#2f68e6]' : 'border-transparent text-slate-400'}`}
            >
              History
            </button>
          </div>
        </div>

        <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 lg:px-10">
          {activeTab === 'Pending' ? (
            pending ? (
              <button type="button" onClick={() => setSelectedBill(pending)} className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#2f68e6] hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <FileText size={35} className="text-[#2447b6]" />
                    <div>
                      <p className="text-xs text-slate-400">Amount to Pay</p>
                      <p className="mt-1 text-2xl font-bold text-[#2447b6]">₱{pending.amount.toLocaleString()}.00</p>
                    </div>
                  </div>
                  <div className="text-left text-xs leading-4 text-slate-400 sm:text-right sm:text-sm sm:leading-5">
                    <p className="sm:hidden">{formatBillingCycleParts(pending.billingPeriod).start} to</p>
                    <p className="sm:hidden">{formatBillingCycleParts(pending.billingPeriod).end}</p>
                    <p className="hidden sm:block">{formatBillingCycle(pending.billingPeriod)}</p>
                  </div>
                </div>
              </button>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No pending bills.</p>
            )
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-base text-slate-500">Showing transactions for the</p>

                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={isHistoryMenuOpen}
                    onClick={() => setIsHistoryMenuOpen((current) => !current)}
                    className="relative z-10 flex w-full items-center justify-between rounded-[14px] border-2 border-[#2f68e6] bg-white px-4 py-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#2f68e6]/30"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center text-[#2f68e6]">
                        <CalendarDays size={24} />
                      </span>
                      <span className="text-[19px] font-semibold text-[#2447b6]">{historyRange}</span>
                    </span>

                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#edf4ff] text-[#2f68e6]">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${isHistoryMenuOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>

                  {isHistoryMenuOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%-4px)] z-30 overflow-hidden rounded-[14px] border-2 border-[#2f68e6] bg-white shadow-[0_12px_24px_rgba(36,71,182,0.12)]">
                      {historyOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setHistoryRange(option);
                            setIsHistoryMenuOpen(false);
                          }}
                          className={`block w-full px-5 py-4 text-left text-lg font-semibold transition ${option === historyRange ? 'bg-[#edf4ff] text-[#2447b6]' : 'text-[#2447b6] hover:bg-sky-50'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {history.length ? (
                <div className="mt-2 space-y-5">
                  {history.map((bill) => (
                    <button type="button" key={bill.id} onClick={() => setSelectedBill(bill)} className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#2f68e6] hover:shadow-md">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <FileText size={36} className="text-[#2447b6]" pesoColor="emerald" />
                          <div>
                            <p className="text-xs text-slate-400">Amount paid</p>
                            <p className="mt-1 text-2xl font-bold leading-none text-[#2447b6]">₱{bill.amount.toLocaleString()}.00</p>
                          </div>
                        </div>
                        <div className="text-left text-xs leading-4 text-slate-400 sm:text-right sm:text-sm sm:leading-5">
                          <p className="sm:hidden">{formatBillingCycleParts(bill.billingPeriod).start} to</p>
                          <p className="sm:hidden">{formatBillingCycleParts(bill.billingPeriod).end}</p>
                          <p className="hidden sm:block">{formatBillingCycle(bill.billingPeriod)}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {hasVisibleHistory ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-2 py-8 text-center">
                      <p className="text-[22px] font-bold text-[#2447b6] sm:text-[30px]">&ldquo;You&apos;ve reached the end!&rdquo;</p>
                      <p className="text-sm text-slate-500 sm:text-lg">We clear bill statements that are older than 12 months.</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center gap-5 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[18px] bg-[#dfeaf7] text-[#9bb7d8] opacity-90">
                    <CalendarDays size={42} />
                  </div>
                  <p className="text-3xl font-bold text-[#2447b6]">No transactions yet.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </PortalShell>
  );
}
