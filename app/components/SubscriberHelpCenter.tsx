'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, LoaderCircle, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { AppRoute, getHelpBotReply, HelpBotReply, SubscriberHelpContext } from '@/app/lib/help-bot';

type HelpMessage = {
  id: string;
  sender: 'subscriber' | 'bot';
  text: string;
  suggestions?: string[];
  action?: AppRoute;
  timestamp: Date;
};

type AccountResponse = { id: string; name: string; planName?: string };
type BillResponse = { amount?: number; dueDate?: string; billingPeriod?: string; status?: string };
type InstallationResponse = { date: string; time: string; type: string; status: string; technician?: { name?: string | null } | null };
type TicketResponse = { visitDate?: string | null; visitTime?: string | null; type: string; status: string; technician?: { name?: string | null } | null };

const initialSuggestions = ['Check my bill', 'My installation schedule', 'Slow internet', 'File a ticket'];

function timeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function createMessage(sender: HelpMessage['sender'], text: string, suggestions?: string[], action?: AppRoute): HelpMessage {
  return { id: `${sender}-${Date.now()}-${Math.random()}`, sender, text, suggestions, action, timestamp: new Date() };
}

function toContext(account: AccountResponse, bills: BillResponse[], installations: InstallationResponse[], tickets: TicketResponse[]): SubscriberHelpContext {
  const bill = bills.find((item) => item.status === 'Unpaid' || item.status === 'Overdue') || bills[0];
  const appointment = installations
    .filter((item) => ['Scheduled', 'In Progress'].includes(item.status.replace(/_/g, ' ')))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const ticketAppointment = tickets
    .filter((item) => item.visitDate && ['Open', 'In Progress'].includes(item.status.replace(/_/g, ' ')))
    .sort((a, b) => new Date(a.visitDate || '').getTime() - new Date(b.visitDate || '').getTime())[0];
  const selectedAppointment = appointment || ticketAppointment;
  return {
    subscriberId: account.id,
    firstName: account.name.trim().split(/\s+/)[0] || 'there',
    currentPlan: account.planName || 'your current plan',
    billStatus: bill?.status || null,
    billAmount: bill?.amount ?? null,
    billDueDate: bill?.dueDate || null,
    billingPeriod: bill?.billingPeriod || null,
    appointmentDate: appointment?.date || ticketAppointment?.visitDate || null,
    appointmentTime: appointment?.time || ticketAppointment?.visitTime || null,
    assignedTechnicianName: appointment?.technician?.name || ticketAppointment?.technician?.name || null,
    appointmentType: appointment?.type || (ticketAppointment ? 'Repair' : null),
    appointmentStatus: selectedAppointment?.status || null,
  };
}

export function SubscriberHelpCenter() {
  const [context, setContext] = useState<SubscriberHelpContext | null>(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/account'), fetch('/api/bills'), fetch('/api/installations'), fetch('/api/tickets')])
      .then(async ([accountResponse, billsResponse, installationsResponse, ticketsResponse]) => {
        const accountResult = accountResponse.ok ? await accountResponse.json() : { data: null };
        const billsResult = billsResponse.ok ? await billsResponse.json() : { data: [] };
        const installationsResult = installationsResponse.ok ? await installationsResponse.json() : { data: [] };
        const ticketsResult = ticketsResponse.ok ? await ticketsResponse.json() : { data: [] };
        if (!accountResult.data) throw new Error('Subscriber account was not found.');
        if (cancelled) return;
        const nextContext = toContext(accountResult.data as AccountResponse, Array.isArray(billsResult.data) ? billsResult.data : [], Array.isArray(installationsResult.data) ? installationsResult.data : [], Array.isArray(ticketsResult.data) ? ticketsResult.data : []);
        setContext(nextContext);
        setMessages([createMessage('bot', `Hello ${nextContext.firstName}! I’m your Sky-Tech virtual assistant. I can help you with billing, installation schedules, connection issues, plan upgrades, and filing support tickets. How can I help you today?`, initialSuggestions)]);
      })
      .catch((error: unknown) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load your help center.'); });
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  function sendMessage(value: string) {
    const content = value.trim();
    if (!content || !context || isSending) return;
    setMessage('');
    setIsSending(true);
    setIsTyping(true);
    setMessages((items) => [...items, createMessage('subscriber', content)]);
    timeoutRef.current = setTimeout(() => {
      const reply: HelpBotReply = getHelpBotReply(content, context);
      setMessages((items) => [...items, createMessage('bot', reply.text, reply.suggestions, reply.action)]);
      setIsTyping(false);
      setIsSending(false);
      timeoutRef.current = null;
    }, 1100);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(message);
  }

  return <PortalShell role="subscriber">
    <div className="flex min-h-screen flex-col bg-[#eef4fb]">
      <header className="flex items-center justify-between gap-4 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10">
        <div className="flex items-center gap-3"><Link href="/subscriber/my-account" aria-label="Back to home" className="rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25"><ArrowLeft size={20} /></Link><div><h1 className="text-2xl font-bold">Help Center</h1><p className="mt-1 text-xs text-blue-100">Sky-Tech virtual assistant</p></div></div>
        <Link href="/subscriber/my-tickets" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/25"><FileText size={16} /> My Requests</Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-8 lg:px-10"><div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        {loadError ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600">{loadError}</div> : !context ? <div className="flex flex-1 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={18} />Loading your account details...</div> : <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((item) => <div key={item.id} className={`flex ${item.sender === 'subscriber' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] sm:max-w-[70%] ${item.sender === 'subscriber' ? 'items-end' : 'items-start'} flex flex-col`}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${item.sender === 'subscriber' ? 'rounded-br-sm bg-[#2447b6] text-white' : 'rounded-bl-sm border border-blue-100 bg-white text-slate-700'}`}><p>{item.text}</p></div><span className="mt-1 px-1 text-[11px] text-slate-400">{timeLabel(item.timestamp)}</span>{item.sender === 'bot' && <div className="mt-2 flex flex-wrap gap-2">{item.suggestions?.map((suggestion) => <button key={suggestion} type="button" disabled={isSending} onClick={() => sendMessage(suggestion)} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-[#2166f3] transition-colors hover:bg-blue-50 disabled:opacity-50">{suggestion}</button>)}{item.action && <Link href={item.action} className="rounded-full bg-[#2166f3] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]">File a ticket now</Link>}</div>}</div></div>)}
            {isTyping && <div className="flex items-center gap-2 text-sm text-slate-400" aria-label="Assistant is typing"><span className="rounded-2xl border border-blue-100 bg-white px-4 py-3"><span className="animate-pulse">Assistant is typing...</span></span></div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><label className="sr-only" htmlFor="help-message">Ask the assistant</label><textarea id="help-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>); } }} disabled={isSending} rows={2} placeholder="Ask me anything about your account…" className="min-h-12 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60" /><button type="submit" aria-label="Send message" disabled={!message.trim() || isSending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2447b6] text-white transition-colors hover:bg-[#1d3b99] disabled:cursor-not-allowed disabled:opacity-40"><Send size={18} /></button></form>
        </>}
      </div></main>
    </div>
  </PortalShell>;
}
