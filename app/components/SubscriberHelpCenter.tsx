'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  FileText,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
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
type InstallationResponse = {
  date: string;
  time: string;
  type: string;
  status: string;
  technician?: { name?: string | null } | null;
};
type TicketResponse = {
  visitDate?: string | null;
  visitTime?: string | null;
  type: string;
  status: string;
  technician?: { name?: string | null } | null;
};

const initialSuggestions = ['Check my bill', 'My installation schedule', 'Slow internet', 'File a ticket'];

function timeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function createMessage(
  sender: HelpMessage['sender'],
  text: string,
  suggestions?: string[],
  action?: AppRoute,
): HelpMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random()}`,
    sender,
    text,
    suggestions,
    action,
    timestamp: new Date(),
  };
}

function getActionLabel(route: AppRoute) {
  const labels: Record<string, string> = {
    '/subscriber/pay-bills': 'Pay bill now',
    '/subscriber/plan-details': 'View plan details',
    '/subscriber/my-transactions': 'View transactions',
  };
  return labels[route] ?? 'File a ticket now';
}

function toContext(
  account: AccountResponse,
  bills: BillResponse[],
  installations: InstallationResponse[],
  tickets: TicketResponse[],
): SubscriberHelpContext {
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
        const nextContext = toContext(
          accountResult.data as AccountResponse,
          Array.isArray(billsResult.data) ? billsResult.data : [],
          Array.isArray(installationsResult.data) ? installationsResult.data : [],
          Array.isArray(ticketsResult.data) ? ticketsResult.data : [],
        );
        setContext(nextContext);
        setMessages([
          createMessage(
            'bot',
            `Hello ${nextContext.firstName}! I’m your Sky-Tech virtual assistant. I can help you with billing, installation schedules, connection issues, plan upgrades, and filing support tickets. How can I help you today?`,
            initialSuggestions,
          ),
        ]);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load your help center.');
      });
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
    }, 850);
  }

  function resetChat() {
    if (!context || isSending) return;
    setMessages([
      createMessage(
        'bot',
        `Hello ${context.firstName}! I’m your Sky-Tech virtual assistant. How can I help you today?`,
        initialSuggestions,
      ),
    ]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(message);
  }

  return (
    <PortalShell role="subscriber">
      <div className="relative mb-[-5rem] box-border flex h-[calc(100svh-4rem)] min-h-0 touch-pan-y overscroll-none flex-col overflow-hidden bg-[#eef4fb] lg:mb-0 lg:h-screen">
        <header
          style={{ height: 76, minHeight: 76 }}
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/subscriber/my-account"
              aria-label="Back to home"
              className="rounded-full bg-white/15 p-2 transition-colors duration-150 hover:bg-white/25"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">Help Center</h1>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={resetChat}
                disabled={isSending}
                title="Reset conversation"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
            <Link
              href="/subscriber/my-tickets"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-semibold transition-colors duration-150 hover:bg-white/25 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              <FileText size={17} />
              My Requests
            </Link>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-24 sm:px-6 lg:px-10">
          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
            {loadError ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 text-sm font-medium text-rose-600 shadow-xs">
                {loadError}
              </div>
            ) : !context ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                <LoaderCircle className="mr-2 animate-spin text-[#2166f3]" size={18} />
                Loading your account details...
              </div>
            ) : (
              <>

                <div
                  className="scrollbar-hidden min-h-0 flex-1 touch-pan-y overscroll-contain space-y-4 overflow-x-hidden overflow-y-auto px-1 py-2"
                  aria-live="polite"
                >
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`flex ${item.sender === 'subscriber' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex max-w-[88%] flex-col sm:max-w-[75%] ${
                          item.sender === 'subscriber' ? 'items-end' : 'items-start'
                        }`}
                      >
                        {item.sender === 'bot' && (
                          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#2166f3] text-white shadow-xs">
                              <Bot size={12} />
                            </span>
                            Sky-Tech Assistant
                            <Sparkles size={11} className="text-[#2166f3]" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                            item.sender === 'subscriber'
                              ? 'rounded-tr-sm bg-[#2166f3] text-white'
                              : 'rounded-tl-sm border border-slate-200/80 bg-white text-slate-700'
                          }`}
                        >
                          <p className="whitespace-pre-line">{item.text}</p>
                        </div>
                        <span className="mt-1 px-1 text-[10px] font-medium text-slate-400">
                          {timeLabel(item.timestamp)}
                        </span>
                        {item.sender === 'bot' && (item.suggestions?.length || item.action) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.suggestions?.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                disabled={isSending}
                                onClick={() => sendMessage(suggestion)}
                                className="rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2166f3] shadow-2xs transition hover:border-[#2166f3] hover:bg-blue-50 disabled:opacity-50"
                              >
                                {suggestion}
                              </button>
                            ))}
                            {item.action && (
                              <Link
                                href={item.action}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#2166f3] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1d57d6]"
                              >
                                {getActionLabel(item.action)}
                                <ArrowRight size={13} />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start" aria-label="Assistant is typing">
                      <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white px-4 py-3 shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:border-[#2166f3] focus-within:ring-2 focus-within:ring-blue-100"
                >
                  <label className="sr-only" htmlFor="help-message">
                    Ask the assistant
                  </label>
                  <textarea
                    id="help-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
                      }
                    }}
                    disabled={isSending}
                    rows={1}
                    placeholder="Ask me anything about your account…"
                    className="h-10 min-h-10 flex-1 resize-none overflow-hidden rounded-xl border-0 bg-transparent px-3 py-2 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!message.trim() || isSending}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition-colors disabled:cursor-not-allowed ${
                      message.trim() && !isSending
                        ? 'bg-[#2166f3] shadow-xs hover:bg-[#1d57d6]'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </PortalShell>
  );
}
