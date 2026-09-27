'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, FileText, Plus, Router, Wrench, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { Badge } from '@/app/components/Badge';
import { Spinner } from '@/app/components/Spinner';
import { formatTicketStatus } from '@/app/lib/ticket-status';

type Ticket = {
  id: string;
  subscriber?: { name?: string | null; address?: string | null } | null;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  technicianName?: string | null;
  subscriberName?: string | null;
  subscriberAddress?: string | null;
  displayStatus?: string;
  visitDate?: string | null;
  visitTime?: string | null;
  details?: string | null;
};

const requestTypes = [
  ['Billing_Inquiry', 'Billing Inquiry'],
  ['No_Internet_Connection', 'No Internet Connection'],
  ['Slow_Internet_Connection', 'Slow Internet Connection'],
] as const;

function formatVisitDateTime(ticket: Ticket) {
  if (!ticket.visitDate && !ticket.visitTime) return 'Not scheduled yet';

  const date = ticket.visitDate
    ? new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return date || 'Not scheduled yet';
}

function formatSelectedVisitDateTime(ticket: Ticket) {
  if (ticket.status === 'Submitted' || (!ticket.visitDate && !ticket.visitTime)) return '';

  const date = ticket.visitDate
    ? new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return [date, ticket.visitTime].filter(Boolean).join(', ');
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [type, setType] = useState('Billing_Inquiry');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/tickets'), fetch('/api/installations')])
      .then(async ([ticketResponse, installationResponse]) => {
        const ticketsResult = ticketResponse.ok ? await ticketResponse.json() : { data: [] };
        const installationsResult = installationResponse.ok ? await installationResponse.json() : { data: [] };
        const tickets = Array.isArray(ticketsResult.data)
          ? ticketsResult.data.map((ticket: Ticket & { technician?: { name?: string | null } | null }) => ({
              ...ticket,
              technicianName: ticket.technician?.name || null,
              subscriberName: ticket.subscriber?.name || null,
              subscriberAddress: ticket.subscriber?.address || null,
            }))
          : [];
        const installations = Array.isArray(installationsResult.data)
          ? installationsResult.data.map((installation: { id: string; date: string; time: string; type: string; status: string; address: string; notes?: string | null; technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null }) => ({
              id: installation.id,
              type: 'Installation',
              subject: installation.type,
              description: installation.type,
              status: installation.status === 'Scheduled'
                ? 'Installation Confirmed'
                : ['Cancelled', 'Canceled'].includes(installation.status)
                  ? 'Installation Rescheduled'
                  : installation.status,
              displayStatus: installation.status === 'Scheduled'
                ? 'Installation Confirmed'
                : ['Cancelled', 'Canceled'].includes(installation.status)
                  ? 'Installation Rescheduled'
                  : installation.status.replace(/_/g, ' '),
              createdAt: installation.date,
              technicianName: installation.technician?.name || null,
              subscriberName: installation.subscriber?.name || null,
              subscriberAddress: installation.subscriber?.address || installation.address || null,
              visitDate: installation.date,
              visitTime: installation.time,
              details: installation.notes || null,
            }))
          : [];
        setTickets([...tickets, ...installations]);
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: values.subject,
          description: values.description,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit request.');

      setTickets((items) => [result.data, ...items]);
      setIsFormOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleTickets = tickets.filter((ticket) =>
    tab === 'active' ? !['Resolved', 'Installation_Closed'].includes(ticket.status) : ['Resolved', 'Installation_Closed'].includes(ticket.status),
  );

  const selectedVisitDateTime = selectedTicket ? formatSelectedVisitDateTime(selectedTicket) : '';

  return (
    <PortalShell role="subscriber">
      <div className="min-h-screen bg-[#f7f9fc]">
        <header className="flex items-center justify-between gap-4 bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Link href="/subscriber/my-account" aria-label="Back to home" className="rounded-full bg-white/15 p-2 transition-colors duration-150 hover:bg-white/25">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">My Requests</h1>
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-white/25"
          >
            <Plus size={17} /> New Request
          </button>
        </header>

        <div className="border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex gap-8">
            <button
              onClick={() => setTab('active')}
              className={`flex items-center gap-2 border-b-2 px-0 py-5 text-sm font-semibold transition-colors duration-150 ${
                tab === 'active' ? 'border-[#2166f3] text-[#2166f3]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              In Progress
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-[#2166f3]">
                {tickets.filter((ticket) => !['Resolved', 'Installation_Closed'].includes(ticket.status)).length}
              </span>
            </button>

            <button
              onClick={() => setTab('history')}
              className={`border-b-2 px-0 py-5 text-sm font-semibold transition-colors duration-150 ${
                tab === 'history' ? 'border-[#2166f3] text-[#2166f3]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              History
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-8 lg:px-10">
          {visibleTickets.length ? (
            <div className="grid gap-3">
              {visibleTickets.map((ticket) => (
                <button
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors duration-100 hover:bg-[#f8fafc]"
                  key={ticket.id}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3]">
                      {ticket.type === 'Installation' ? <CalendarDays size={20} /> : <Wrench size={20} />}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-800">{ticket.id}</h2>
                      <p className="mt-1 text-sm text-slate-600">{formatVisitDateTime(ticket)}</p>
                    </div>
                  </div>
                  <Badge value={formatTicketStatus(ticket.status)} compact={ticket.type === 'Installation'} />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <FileText size={88} className="text-blue-100" />
              <p className="mt-5 text-2xl font-bold text-[#2447b6]">No request yet.</p>
            </div>
          )}
        </main>

        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-950/30" onMouseDown={() => setSelectedTicket(null)}>
            <section
              className="absolute inset-y-0 right-0 w-full max-w-[980px] overflow-y-auto bg-[#edf3ff] p-0 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between bg-[#2447b6] px-5 py-6 text-white sm:px-8 lg:px-10">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
                      {selectedTicket.type === 'Installation' ? <CalendarDays size={18} /> : <Wrench size={18} />}
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Status</p>
                      <p className="text-xl font-bold">{selectedTicket.displayStatus || formatTicketStatus(selectedTicket.status)}</p>
                    </div>
                  </div>

                  <button
                    aria-label="Close request details"
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-full bg-white/15 p-2 transition-colors duration-150 hover:bg-white/20"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 bg-[#edf3ff] px-4 py-5 sm:px-6">
                  <div className="mb-5 flex items-end justify-between gap-4 rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Work order number</p>
                    <p className="text-lg font-bold leading-none text-slate-900">{selectedTicket.id}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-2xl font-bold text-slate-800">Work order details</h3>
                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-sm text-slate-500">Technician visit date and time</p>
                        {selectedVisitDateTime ? (
                          <p className="mt-1 text-lg font-semibold text-slate-800">{selectedVisitDateTime}</p>
                        ) : (
                          <p className="mt-1 text-sm text-slate-400">Not scheduled yet</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Technician</p>
                        <p className="mt-1 text-lg font-semibold text-slate-800">
                          {selectedTicket.technicianName || 'Not assigned yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-2xl font-bold text-slate-800">Request details</h3>
                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-sm text-slate-500">Name</p>
                        <p className="mt-1 text-lg font-semibold text-slate-800">{selectedTicket.subscriberName || 'Not available'}</p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Address</p>
                        <p className="mt-1 text-lg font-semibold text-slate-800">{selectedTicket.subscriberAddress || 'No address provided'}</p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">{selectedTicket.type === 'Installation' ? 'Service Type' : 'Concern'}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-800">{selectedTicket.type === 'Installation' ? 'Installation' : selectedTicket.subject}</p>
                      </div>

                      {selectedTicket.type !== 'Installation' && <div>
                        <p className="text-sm text-slate-500">Description</p>
                        <p className="mt-1 text-lg font-semibold text-slate-800">{selectedTicket.type.replace(/_/g, ' ')}</p>
                      </div>}

                      {selectedTicket.type !== 'Installation' && <div>
                        <p className="text-sm text-slate-500">Details</p>
                        {selectedTicket.details || selectedTicket.description ? (
                          <p className="mt-1 whitespace-pre-line text-base leading-7 text-slate-700">{selectedTicket.details || selectedTicket.description}</p>
                        ) : (
                          <p className="mt-1 text-lg font-semibold text-slate-800">No additional details provided.</p>
                        )}
                      </div>}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {isFormOpen && (
          <div
            className="modal-overlay fixed inset-0 z-50 flex items-end bg-slate-950/45"
            onMouseDown={() => !isSubmitting && setIsFormOpen(false)}
          >
            <section
              className="modal-panel max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:p-6"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-slate-200" />

              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold">New Support Request</h2>
                  <p className="mt-1 text-sm text-slate-400">Tell us about your concern</p>
                </div>

                <button
                  aria-label="Close request form"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition-colors duration-150 hover:bg-[#f1f5f9]"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-5">
                <fieldset>
                  <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Request type</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {requestTypes.map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setType(value)}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all duration-150 ${
                          type === value ? 'border-[#6694ff] bg-blue-50 text-[#2166f3]' : 'border-slate-100 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Router size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="block text-sm font-semibold">
                  Subject *
                  <input
                    required
                    name="subject"
                    placeholder="Brief description of your concern"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Details *
                  <textarea
                    required
                    name="description"
                    rows={5}
                    placeholder="Describe the issue in detail"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none"
                  />
                </label>

                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

                <button
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2161f2] px-5 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-[#1652dc]"
                >
                  {isSubmitting && <Spinner />}
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
