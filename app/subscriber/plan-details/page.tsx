'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type Account = { planName: string; monthlyPrice: number };

export default function PlanDetailsPage() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch('/api/account').then((response) => response.json()).then((result) => {
      if (result.data) setAccount(result.data);
    }).catch(() => undefined);
  }, []);

  const details = [
    { label: 'Your current plan', value: account?.planName || 'Loading plan...' },
    { label: 'Cut-off date', value: 'Every 9th of the month', note: 'The cut-off date is the last day of your billing cycle.' },
    { label: 'Bill due date', value: 'Every 30th of the month' },
    { label: 'Monthly fee', value: account ? `₱${account.monthlyPrice.toLocaleString()}.00 per month` : 'Loading...' },
  ];

  return <PortalShell role="subscriber"><div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#f7f9fc]"><header className="flex shrink-0 items-center gap-3 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10"><Link href="/subscriber/my-account" aria-label="Back to home" className="rounded-full bg-white/15 p-2 transition-colors duration-150 hover:bg-white/25"><ArrowLeft size={20} /></Link><h1 className="text-2xl font-bold">Plan Details</h1></header><div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-7 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl">{details.map((detail) => <section className="mb-6" key={detail.label}><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{detail.label}</p><div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-base font-bold text-[#24417e] shadow-sm sm:px-6">{detail.value}</div>{detail.note && <p className="mt-2 px-1 text-sm text-slate-400">{detail.note}</p>}</section>)}</div></div></div></PortalShell>;
}
