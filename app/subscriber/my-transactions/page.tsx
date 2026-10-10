'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, FileText as LucideFileText } from 'lucide-react';
import type { ComponentProps } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { Badge } from '@/app/components/Badge';

type Bill = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  billingPeriod: string;
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

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
  const [bills, setBills] = useState<Bill[]>([]);
  const [historyRange, setHistoryRange] = useState('Last 3 months');
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/bills')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) setBills(result.data);
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
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <FileText size={35} className="text-[#2447b6]" />
                    <div>
                      <p className="text-xs text-slate-400">Amount to Pay</p>
                      <p className="mt-1 text-2xl font-bold text-[#2447b6]">₱{pending.amount.toLocaleString()}.00</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{new Date(pending.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <Badge value={pending.status} />
                  <Link href="/subscriber/pay-bills" className="rounded-xl bg-[#2f68e6] px-5 py-2.5 text-sm font-bold text-white">
                    Pay Bill
                  </Link>
                </div>
              </section>
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
                    <div key={bill.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <FileText size={36} className="text-[#2447b6]" pesoColor="emerald" />
                          <div>
                            <p className="text-xs text-slate-400">Amount paid</p>
                            <p className="mt-1 text-2xl font-bold leading-none text-[#2447b6]">₱{bill.amount.toLocaleString()}.00</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400">{new Date(bill.dueDate).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
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
