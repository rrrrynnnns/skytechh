'use client';

import { CalendarDays, FileText, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';
import { formatTicketStatus } from '@/app/lib/ticket-status';

type Task = readonly [string, string, string, string, string, string];

type InstallationApiItem = { id: string; date: string; time: string; type: string; status: string; address?: string | null; technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null };
type Ticket = { id: string; type: string; subject: string; description: string; status: string; createdAt: string; visitDate?: string | null; visitTime?: string | null; details?: string | null; technician?: { name: string } | null; subscriber?: { name: string; address?: string | null } };

const taskCategories = ['All', 'Installation', 'Repair'] as const;
const subStatusFilters = ['All', 'Confirmed', 'Rescheduled', 'Closed'] as const;
const installationStatusOptions = [
  ['Installation_Confirmed', 'Installation Confirmed'],
  ['Installation_Closed', 'Installation Closed'],
  ['Installation_Rescheduled', 'Installation Rescheduled'],
] as const;
const technicianTicketStatuses = [
  ['In Progress', 'Repair Confirmed'],
  ['Resolved', 'Repair Closed'],
  ['Closed', 'Repair Rescheduled'],
] as const;

const statusStyles: Record<string, string> = {
  Submitted: 'border-blue-200 bg-blue-50 text-blue-600',
  'Repair Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Installation Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Repair Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Installation Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Repair Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
  'Installation Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
};

function formatVisitDateTime(ticket: Ticket) {
  if (!ticket.visitDate && !ticket.visitTime) return 'Not scheduled yet';
  const date = ticket.visitDate
    ? new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  return [date, ticket.visitTime].filter(Boolean).join(', ') || 'Not scheduled yet';
}

function formatVisitDateOnly(ticket: Ticket) {
  if (!ticket.visitDate) return 'Not scheduled yet';
  return new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTaskDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatInstallationStatus(status: string) {
  const normalized = String(status || '').trim();
  const displayMap: Record<string, string> = {
    Scheduled: 'Installation Confirmed',
    'In Progress': 'Installation Confirmed',
    In_Progress: 'Installation Confirmed',
    'Installation Confirmed': 'Installation Confirmed',
    Installation_Confirmed: 'Installation Confirmed',
    Completed: 'Installation Closed',
    'Installation Closed': 'Installation Closed',
    Installation_Closed: 'Installation Closed',
    Cancelled: 'Installation Rescheduled',
    'Installation Rescheduled': 'Installation Rescheduled',
    Installation_Rescheduled: 'Installation Rescheduled',
  };
  return displayMap[normalized] || normalized.replace(/_/g, ' ');
}

function getInstallationStatusValue(status: string) {
  return formatInstallationStatus(status);
}

function getInstallationStatusOptionValue(status: string) {
  const displayStatus = formatInstallationStatus(status);
  return installationStatusOptions.find(([, label]) => label === displayStatus)?.[0] || installationStatusOptions[0][0];
}

export default function TechnicianTaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [installations, setInstallations] = useState<InstallationApiItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationApiItem | null>(null);
  const [ticketStatus, setTicketStatus] = useState('Open');
  const [installationStatus, setInstallationStatus] = useState('Installation_Confirmed');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    fetch('/api/installations').then((response) => response.json()).then((result) => {
      if (Array.isArray(result.data)) {
        const nextInstallations = result.data as InstallationApiItem[];
        setInstallations(nextInstallations);
        setTasks(nextInstallations.map((item) => [
          item.id,
          item.subscriber?.name || 'Subscriber',
          item.type.replace(/_/g, ' '),
          item.time,
          getInstallationStatusValue(item.status),
          item.date.slice(0, 10),
        ]));
        const requestedTaskId = new URLSearchParams(window.location.search).get('taskId');
        const requestedInstallation = requestedTaskId ? nextInstallations.find((item) => item.id === requestedTaskId) : null;
        if (requestedInstallation) {
          setSelectedTicket(null);
          setSelectedInstallation(requestedInstallation);
          setInstallationStatus(getInstallationStatusOptionValue(requestedInstallation.status));
        }
      }
    }).catch(() => {
      setInstallations([]);
      setTasks([]);
    });
    fetch('/api/tickets').then((response) => response.json()).then((result) => {
      if (Array.isArray(result.data)) {
        const nextTickets = result.data as Ticket[];
        setTickets(nextTickets);
        const requestedTaskId = new URLSearchParams(window.location.search).get('taskId');
        const requestedTicket = requestedTaskId ? nextTickets.find((ticket) => ticket.id === requestedTaskId) : null;
        if (requestedTicket) openTicket(requestedTicket);
      }
    }).catch(() => setTickets([]));
  }, []);
  const visibleTasks = tasks.filter((task) => filter === 'All' || filter === 'Installation' || task[4] === filter);
  const visibleTickets = tickets.filter((ticket) => {
    if (filter === 'All' || filter === 'Repair') return true;
    if (!filter.startsWith('Repair')) return false;
    return formatTicketStatus(ticket.status) === filter;
  });
  const activeCategory = filter.startsWith('Installation') ? 'Installation' : filter.startsWith('Repair') ? 'Repair' : filter;
  const activeSubStatus = filter.endsWith('Confirmed') ? 'Confirmed' : filter.endsWith('Rescheduled') ? 'Rescheduled' : filter.endsWith('Closed') ? 'Closed' : 'All';
  const visibleTaskCards = [
    ...visibleTickets.map((ticket) => ({
      kind: 'repair' as const,
      id: ticket.id,
      sortKey: `${(ticket.visitDate || ticket.createdAt).slice(0, 10)} ${ticket.visitTime || ''}`,
      ticket,
    })),
    ...visibleTasks.map((task) => ({
      kind: 'installation' as const,
      id: task[0],
      sortKey: `${task[5]} ${task[3]}`,
      task,
    })),
  ].sort((first, second) => second.sortKey.localeCompare(first.sortKey));
  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const allStatuses = [...tasks.map((task) => task[4]), ...tickets.map((ticket) => formatTicketStatus(ticket.status))];
  const counts = {
    total: tasks.length + tickets.length,
    today: tasks.filter((task) => task[5] === today).length + tickets.filter((ticket) => ticket.visitDate?.slice(0, 10) === today).length,
    pending: allStatuses.filter((status) => status.endsWith('Confirmed') || status.endsWith('Rescheduled')).length,
    done: allStatuses.filter((status) => status.endsWith('Closed')).length,
  };

  function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setSelectedInstallation(null);
    setTicketStatus(ticket.status === 'Open' ? 'In Progress' : ticket.status.replace(/_/g, ' '));
  }

  function openInstallationTask(name: string, type: string, detail: string, status: string, date: string) {
    const installation = installations.find((item) =>
      item.subscriber?.name === name &&
      item.date.slice(0, 10) === date &&
      item.time === detail &&
      item.type.replace(/_/g, ' ') === type
    ) || installations.find((item) => item.subscriber?.name === name && item.date.slice(0, 10) === date) || null;

    setSelectedTicket(null);
    setSelectedInstallation(installation ?? {
      id: `${date}-${name}`.replace(/\s+/g, '-'),
      date,
      time: detail,
      type,
      status,
      address: 'No address provided',
      technician: { name: 'Not assigned yet' },
      subscriber: { name, address: 'No address provided' },
    });
    setInstallationStatus(getInstallationStatusOptionValue(installation?.status || status));
  }

  async function saveTicketStatus() {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: ticketStatus }),
      });
      if (!response.ok) return;
      setTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id ? { ...ticket, status: ticketStatus } : ticket));
      setSelectedTicket(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveInstallationStatus() {
    if (!selectedInstallation) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/installations/${selectedInstallation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: installationStatus }),
      });
      if (!response.ok) return;
      setInstallations((current) => current.map((item) => item.id === selectedInstallation.id ? { ...item, status: installationStatus } : item));
      setTasks((current) => current.map((item) => item[0] === selectedInstallation.id ? [item[0], item[1], item[2], item[3], installationStatus.replace(/_/g, ' '), item[5]] : item));
      setSelectedInstallation(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PortalShell role="technician">
      <div className="min-h-screen bg-[#eef4fb]">
        <header className="bg-[#2447b6] px-5 py-5 text-white sm:px-8 sm:py-7 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-2xl font-bold">My Tasks</h1>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-8 sm:py-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {[
                [counts.total, 'Total'],
                [counts.today, 'Today'],
                [counts.pending, 'Pending'],
                [counts.done, 'Done'],
              ].map(([value, label]) => (
                <article key={label} className="rounded-2xl border border-slate-100 bg-white px-2 py-4 text-center shadow-sm sm:p-4">
                  <p className="text-xl font-bold text-[#2447b6] sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{label}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">
              {taskCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${activeCategory === category ? 'bg-[#2447b6] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            {activeCategory !== 'All' && <div className="mt-2 grid grid-cols-4 gap-2 md:flex md:flex-wrap">
              {subStatusFilters.map((subStatus) => {
                const nextFilter = subStatus === 'All' ? activeCategory : `${activeCategory} ${subStatus}`;
                return (
                  <button
                    key={subStatus}
                    type="button"
                    onClick={() => setFilter(nextFilter)}
                    className={`min-h-9 rounded-full border px-2 text-[11px] font-semibold transition-colors md:px-4 md:text-xs ${activeSubStatus === subStatus ? 'border-[#2447b6] bg-[#2447b6] text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {subStatus}
                  </button>
                );
              })}
            </div>}

            <div className="mt-4 grid gap-3">
              {visibleTaskCards.map((item) => item.kind === 'repair' ? (
                <button type="button" key={`repair-${item.id}`} onClick={() => openTicket(item.ticket)} className="flex min-h-[76px] w-full items-center justify-between gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 sm:gap-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3]"><Wrench size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900">{formatPersonName(item.ticket.subscriber?.name || 'Subscriber')}</h2>
                      <p className="mt-1 truncate text-xs text-slate-400">{formatVisitDateOnly(item.ticket)}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[formatTicketStatus(item.ticket.status)] || 'border-blue-200 bg-blue-50 text-blue-600'}`}>{formatTicketStatus(item.ticket.status)}</span>
                </button>
              ) : (
                <button type="button" key={`installation-${item.id}`} onClick={() => openInstallationTask(item.task[1], item.task[2], item.task[3], item.task[4], item.task[5])} className="flex min-h-[76px] w-full items-center justify-between gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 sm:gap-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3]"><CalendarDays size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900">{formatPersonName(item.task[1])}</h2>
                      <p className="mt-1 truncate text-xs text-slate-400">{formatTaskDate(item.task[5])}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[item.task[4]] || 'border-blue-200 bg-blue-50 text-blue-600'}`}>{item.task[4]}</span>
                </button>
              ))}
              {!visibleTasks.length && !visibleTickets.length && <p className="rounded-2xl bg-white p-4 text-sm text-slate-400 shadow-sm">No tasks found for this filter.</p>}
            </div>
          </div>
        </div>

        {(selectedTicket || selectedInstallation) && (
          <div className="fixed inset-0 z-50 bg-slate-950/40" onMouseDown={() => { setSelectedTicket(null); setSelectedInstallation(null); }}>
            <section className="absolute inset-y-0 right-0 w-full max-w-[980px] overflow-y-auto bg-[#eef4fb] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
              <header className="flex items-center justify-between bg-[#2447b6] px-5 py-5 text-white sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15"><FileText size={21} /></span>
                  <div><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Status</p><h2 className="text-xl font-bold">{selectedInstallation ? formatInstallationStatus(selectedInstallation.status || 'Scheduled') : formatTicketStatus(selectedTicket?.status || 'Open')}</h2></div>
                </div>
                <button aria-label="Close ticket details" onClick={() => { setSelectedTicket(null); setSelectedInstallation(null); }} className="rounded-full bg-white/15 p-2.5 transition-colors hover:bg-white/25"><X size={20} /></button>
              </header>
              <div className="space-y-5 p-5 sm:p-7">
                <div className="flex items-center justify-between rounded-xl bg-white/75 px-5 py-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Work order number</span>
                  <strong className="text-lg font-bold text-slate-900">{selectedInstallation?.id || selectedTicket?.id}</strong>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-2xl font-bold text-slate-900">Work order details</h3>
                  <div className="mt-5 space-y-5">
                    <div><p className="text-sm text-slate-500">Technician visit date and time</p><p className={`mt-1 text-lg font-semibold ${(selectedInstallation ? selectedInstallation.date || selectedInstallation.time : selectedTicket?.visitDate || selectedTicket?.visitTime) ? 'text-slate-800' : 'text-slate-400'}`}>{selectedInstallation ? `${new Date(`${selectedInstallation.date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${selectedInstallation.time}` : formatVisitDateTime(selectedTicket as Ticket)}</p></div>
                    <div><p className="text-sm text-slate-500">Technician</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedInstallation?.technician?.name || selectedTicket?.technician?.name || 'Not assigned yet'}</p></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-2xl font-bold text-slate-900">Request details</h3>
                  <div className="mt-5 space-y-5">
                    <div><p className="text-sm text-slate-500">Name</p><p className="mt-1 text-lg font-semibold text-slate-800">{formatPersonName(selectedInstallation?.subscriber?.name || selectedTicket?.subscriber?.name || 'Subscriber')}</p></div>
                    <div><p className="text-sm text-slate-500">Address</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedInstallation?.address || selectedInstallation?.subscriber?.address || selectedTicket?.subscriber?.address || 'No address provided'}</p></div>
                    <div><p className="text-sm text-slate-500">{selectedInstallation ? 'Request Type' : 'Concern'}</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedInstallation ? selectedInstallation.type.replace(/_/g, ' ') : selectedTicket?.type.replace(/_/g, ' ')}</p></div>
                    {!selectedInstallation && selectedTicket && <>
                      <div><p className="text-sm text-slate-500">Description</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedTicket.subject}</p></div>
                      <div><p className="text-sm text-slate-500">Details</p><p className="mt-1 whitespace-pre-line text-base leading-7 text-slate-700">{selectedTicket.details || selectedTicket.description || 'No additional details provided.'}</p></div>
                    </>}
                  </div>
                </div>

                {selectedInstallation ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-bold text-slate-900">Update Status</h3>
                    <div className="mt-4 grid gap-2">
                      {installationStatusOptions.map(([value, label]) => (
                        <button type="button" key={value} onClick={() => setInstallationStatus(value)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${installationStatus === value ? 'border-blue-200 bg-blue-50 text-[#2166f3]' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          {installationStatus === value && <span className="mr-2">✓</span>}{label}
                        </button>
                      ))}
                    </div>
                    <button disabled={isSaving} onClick={saveInstallationStatus} className="mt-4 w-full rounded-xl bg-[#2447b6] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Status'}</button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-bold text-slate-900">Update Status</h3>
                    <div className="mt-4 grid gap-2">
                      {technicianTicketStatuses.map(([value, label]) => (
                        <button type="button" key={value} onClick={() => setTicketStatus(value)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${ticketStatus === value ? 'border-blue-200 bg-blue-50 text-[#2166f3]' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          {ticketStatus === value && <span className="mr-2">✓</span>}{label}
                        </button>
                      ))}
                    </div>
                    <button disabled={isSaving} onClick={saveTicketStatus} className="mt-4 w-full rounded-xl bg-[#2447b6] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Status'}</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
