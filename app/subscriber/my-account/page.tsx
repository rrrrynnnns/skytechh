'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, CalendarDays, CircleHelp, CreditCard, FileText, MessageSquare, Wifi, Wrench, Zap, X } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { Badge } from '@/app/components/Badge';
import { formatTicketStatus } from '@/app/lib/ticket-status';

const actions = [
  { label: 'Pay Bills', href: '/subscriber/pay-bills', Icon: CreditCard },
  { label: 'Plan Details', href: '/subscriber/plan-details', Icon: FileText },
  { label: 'My Transaction', href: '/subscriber/my-transactions', Icon: FileText },
  { label: 'Get Help', href: '/subscriber/help', Icon: CircleHelp },
];

type RequestHistoryItem = { id: string; type: string; subject: string; status: string; createdAt: string; visitDate?: string | null; visitTime?: string | null; technicianName?: string | null; subscriberName?: string | null; subscriberAddress?: string | null; description?: string | null; details?: string | null };

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '₱0.00';
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SubscriberAccount() {
  const [account, setAccount] = useState<{ id: string; name: string; contact: string; planName: string; speedMbps: number; monthlyPrice: number } | null>(null);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });
  const [transactions, setTransactions] = useState<Array<{ id: string; amount: number; dueDate: string; status: string }>>([]);
  const [requests, setRequests] = useState<RequestHistoryItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestHistoryItem | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    fetch('/api/account').then((response) => response.json()).then((result) => {
      if (result.data) setAccount(result.data);
    }).catch(() => undefined);

    fetch('/api/notifications', { cache: 'no-store' }).then((response) => response.json()).then((result) => {
      if (Array.isArray(result.data)) setUnreadNotificationCount(result.data.filter((item: { read?: boolean }) => !item.read).length);
    }).catch(() => undefined);

    fetch('/api/bills')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTransactions(
            result.data
              .map((bill: { id?: string; amount?: number; dueDate?: string | null; status?: string }) => ({
                id: String(bill.id || 'bill'),
                amount: Number(bill.amount || 0),
                dueDate: bill.dueDate || '',
                status: bill.status || 'Unpaid',
              }))
              .sort((a: { dueDate: string }, b: { dueDate: string }) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
          );
        }
      })
      .catch(() => undefined);

    Promise.all([fetch('/api/tickets'), fetch('/api/installations')])
      .then(async ([ticketResponse, installationResponse]) => {
        const ticketsResult = ticketResponse.ok ? await ticketResponse.json() : { data: [] };
        const installationsResult = installationResponse.ok ? await installationResponse.json() : { data: [] };
        const tickets = Array.isArray(ticketsResult.data)
          ? ticketsResult.data.map((ticket: RequestHistoryItem & { technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null }) => ({
              ...ticket,
              technicianName: ticket.technician?.name || null,
              subscriberName: ticket.subscriber?.name || null,
              subscriberAddress: ticket.subscriber?.address || null,
            }))
          : [];
        const installations = Array.isArray(installationsResult.data)
          ? installationsResult.data.map((installation: { id: string; date: string; time: string; type: string; status: string; address?: string | null; notes?: string | null; technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null }) => ({
              id: installation.id,
              type: 'Installation',
              subject: installation.type,
              status: ['Completed', 'Installation Completed', 'Installation_Closed', 'Installation Closed'].includes(installation.status)
                ? 'Installation Closed'
                : installation.status === 'Scheduled'
                  ? 'Installation Confirmed'
                  : ['Cancelled', 'Canceled'].includes(installation.status)
                    ? 'Installation Rescheduled'
                    : installation.status,
              createdAt: installation.date,
              visitDate: installation.date,
              visitTime: installation.time,
              technicianName: installation.technician?.name || null,
              subscriberName: installation.subscriber?.name || null,
              subscriberAddress: installation.subscriber?.address || installation.address || null,
              details: installation.notes || null,
            }))
          : [];
        setRequests(
          [...tickets, ...installations].sort(
            (a: RequestHistoryItem, b: RequestHistoryItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      })
      .catch(() => undefined);
  }, []);

  const fullName = account?.name || 'Loading account...';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const displayName = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : fullName;
  const firstName = parts[0] || 'Loading';
  const subscriberId = account?.id || 'Loading...';
  const price = account?.monthlyPrice != null ? formatMoney(account.monthlyPrice) : '';
  const visibleTransactions = transactions.slice(0, 3);
  const showAllTransactions = transactions.length > 3;

  function formatHistoryDate(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  function formatRequestVisitDateTime(request: RequestHistoryItem) {
    if (!request.visitDate && !request.visitTime) return 'Not scheduled yet';
    if (!request.visitDate) return 'Not scheduled yet';
    const date = new Date(`${request.visitDate.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Not scheduled yet';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const visibleRequests = requests.slice(0, 3);
  const showAllRequests = requests.length >= 3;

  return <PortalShell role="subscriber">
    <div className="w-full bg-[#2447b6] px-4 pb-7 pt-7 text-white sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-3"><span className="grid h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#4770d6] text-lg font-bold">{firstName.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="text-sm text-blue-100">{greeting || 'Hello'}</p><h1 className="text-xl font-bold">{firstName}</h1></div></div><div className="flex shrink-0 items-center gap-2"><Link href="/subscriber/notifications" aria-label="Notifications" className="relative rounded-2xl bg-[#4770d6] p-3"><Bell size={20} />{unreadNotificationCount > 0 && <span className="absolute right-1 top-0 grid h-4 min-w-4 items-center justify-center rounded-full bg-[#ff3b50] px-1 text-[9px] font-bold">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}</Link><Link href="/shared/my-tasks" className="flex items-center gap-2 rounded-2xl bg-[#4770d6] px-4 py-3 text-sm font-semibold"><MessageSquare size={16} />Help</Link></div></div>
        <section className="overflow-hidden rounded-3xl bg-white text-slate-950 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2166f3] text-white"><Wifi size={22} /></span><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sky-Tech Fiber</p></div><Badge value="Unpaid" /></div><div className="flex items-end justify-between gap-4 px-4 py-6 sm:px-6"><div><h2 className="text-xl font-bold">{displayName}</h2><p className="mt-1 text-sm text-slate-400">{subscriberId}</p></div><div className="text-right"><p className="text-2xl font-bold text-[#2447b6]">{price}</p><p className="text-xs text-slate-400">Amount to pay</p></div></div><div className="grid grid-cols-3 border-t border-slate-100 bg-[#f8faff] py-5"><div className="flex flex-col items-center justify-center gap-2 border-r border-slate-200"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2166f3]"><Wifi size={20} /></div><strong className="text-lg font-bold text-slate-900">{account ? 'Unli' : 'Loading'}</strong><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data</span></div><div className="flex flex-col items-center justify-center gap-2 border-r border-slate-200"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2166f3]"><Zap size={20} /></div><strong className="text-lg font-bold text-slate-900">{account?.speedMbps || ''} Mbps</strong><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Speed</span></div><div className="flex flex-col items-center justify-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2166f3] text-lg font-bold">₱</div><strong className="text-lg font-bold text-slate-900">{price}</strong><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly</span></div></div></section>
      </div>
    </div>
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <h2 className="text-lg font-bold">How Can We Help You?</h2>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
        {actions.map(({ label, href, Icon }) => <Link href={href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-1 py-3 text-center shadow-sm sm:min-h-32 sm:gap-4 sm:p-5" key={label}><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2166f3] sm:h-12 sm:w-12"><Icon size={20} /></span><span className="text-[10px] font-semibold sm:text-xs">{label}</span></Link>)}
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">My Transaction History</h2>
        {showAllTransactions ? <Link href="/subscriber/my-transactions" className="text-sm font-semibold text-[#2447b6]">View all</Link> : null}
      </div>
      <div className="mt-4 space-y-3">
        {visibleTransactions.length ? visibleTransactions.map((transaction) => <div key={transaction.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="relative inline-block text-[#2447b6]"><FileText size={34} /><span className={`absolute -bottom-1 -right-1 text-[11px] font-extrabold leading-none ${transaction.status === 'Paid' ? 'text-emerald-600' : 'text-amber-500'}`}>₱</span></span><div><p className="text-xs text-slate-400">{transaction.status === 'Paid' ? 'Amount paid' : 'Amount to Pay'}</p><p className="mt-1 text-2xl font-bold text-[#2447b6]">{formatMoney(transaction.amount)}</p></div></div><p className="text-sm text-slate-400">{formatHistoryDate(transaction.dueDate)}</p></div></div>) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No transactions yet.</div>}
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">My Request History</h2>
        {showAllRequests ? <Link href="/subscriber/my-tickets" className="text-sm font-semibold text-[#2447b6]">View all</Link> : null}
      </div>
      <div className="mt-4 grid gap-3">{visibleRequests.length ? visibleRequests.map((request) => {
        const status = formatTicketStatus(request.status);
        const statusClass = 'max-w-none shrink-0 justify-center whitespace-nowrap px-2 text-[9px] leading-3 sm:px-2.5 sm:text-xs sm:leading-normal';
        return <button type="button" onClick={() => setSelectedRequest(request)} className="flex min-w-0 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 sm:gap-4 sm:p-5" key={`${request.type}-${request.id}`}><div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3] sm:h-11 sm:w-11">{request.type === 'Installation' ? <CalendarDays size={19} /> : <Wrench size={19} />}</span><div className="min-w-0"><p className="truncate text-lg font-bold text-slate-800 sm:text-xl">{request.id}</p><p className="mt-1 text-sm leading-tight text-slate-600 sm:leading-normal">{formatRequestVisitDateTime(request)}</p></div></div><Badge value={status} className={statusClass} /></button>;
      }) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No requests yet.</div>}</div>
    </div>
    {selectedRequest ? <div className="fixed inset-0 z-50 bg-slate-950/30" onMouseDown={() => setSelectedRequest(null)}>
      <section className="absolute inset-y-0 right-0 w-full max-w-245 overflow-y-auto bg-[#edf3ff] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex min-h-full flex-col">
          <div className="flex items-center justify-between bg-[#2447b6] px-5 py-6 text-white sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">{selectedRequest.type === 'Installation' ? <CalendarDays size={18} /> : <Wrench size={18} />}</span>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Status</p><p className="truncate text-xl font-bold">{formatTicketStatus(selectedRequest.status)}</p></div>
            </div>
            <button aria-label="Close request details" onClick={() => setSelectedRequest(null)} className="rounded-full bg-white/15 p-2"><X size={20} /></button>
          </div>
          <div className="flex-1 px-4 py-5 sm:px-6">
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-white/70 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Work order number</p><p className="text-lg font-bold text-slate-900">{selectedRequest.id}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-800">Work order details</h3>
              <p className="mt-5 text-sm text-slate-500">Technician visit date and time</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{formatRequestVisitDateTime(selectedRequest)}</p>
              <p className="mt-4 text-sm text-slate-500">Technician</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{selectedRequest.technicianName || 'Not assigned yet'}</p>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-800">Request details</h3>
              <p className="mt-5 text-sm text-slate-500">Name</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedRequest.subscriberName || displayName}</p>
              <p className="mt-4 text-sm text-slate-500">Address</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedRequest.subscriberAddress || 'No address provided'}</p>
              <p className="mt-4 text-sm text-slate-500">{selectedRequest.type === 'Installation' ? 'Service Type' : 'Concern'}</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedRequest.type === 'Installation' ? 'Installation' : selectedRequest.subject}</p>
              {selectedRequest.type !== 'Installation' ? <><p className="mt-4 text-sm text-slate-500">Details</p><p className="mt-1 whitespace-pre-line text-base leading-7 text-slate-700">{selectedRequest.details || selectedRequest.description || 'No additional details provided.'}</p></> : null}
            </div>
          </div>
        </div>
      </section>
    </div> : null}
  </PortalShell>;
}
