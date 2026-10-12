'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Ticket = readonly [string, string, string, string, string, string, string, string, string, string | null, string | null, string | null];

type TicketApiItem = {
  id: string;
  subscriber?: { name: string; address: string; street?: string | null; barangay?: string | null; city?: string | null; province?: string | null };
  type: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  visitDate?: string | null;
  visitTime?: string | null;
  technicianId?: string | null;
};

type Technician = { id: string; name: string; status: string };
type InstallationSchedule = { id: string; technicianId: string; date: string; time: string };

function formatVisitDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatVisitTime(value: string | null) {
  return value || '—';
}

function getMinimumVisitDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeTimeSlot(value: string | null | undefined) {
  if (!value) return '';
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value;
}

const statusStyles: Record<string, string> = {
  Open: 'border-blue-200 bg-blue-50 text-blue-600',
  'In Progress': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  Resolved: 'border-slate-200 bg-slate-50 text-slate-600',
  Closed: 'border-amber-200 bg-amber-50 text-amber-600',
};

const statusLabels: Record<string, string> = {
  Open: 'Submitted',
  'In Progress': 'Repair Confirmed',
  Resolved: 'Repair Closed',
  Closed: 'Repair Rescheduled',
};

function getStatusLabel(status: string) {
  return statusLabels[status] || status;
}

export function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [status, setStatus] = useState('Open');
  const [adminNote, setAdminNote] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [visitDate, setVisitDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [installationSchedules, setInstallationSchedules] = useState<InstallationSchedule[]>([]);
  const isTechnicianAvailable = (technician: Technician) => !tickets.some((ticket) =>
    ticket[11] === technician.id &&
    ticket[9]?.slice(0, 10) === visitDate &&
    normalizeTimeSlot(ticket[10]) === normalizeTimeSlot(timeSlot) &&
    ticket[0] !== selectedTicket?.[0],
  ) && !installationSchedules.some((installation) =>
    installation.technicianId === technician.id &&
    installation.date.slice(0, 10) === visitDate &&
    normalizeTimeSlot(installation.time) === normalizeTimeSlot(timeSlot),
  );
  const availableTechnicianCount = technicians.filter(isTechnicianAvailable).length;
  const counts = {
    Open: tickets.filter((ticket) => ticket[5] === 'Open').length,
    'In Progress': tickets.filter((ticket) => ticket[5] === 'In Progress').length,
    Resolved: tickets.filter((ticket) => ticket[5] === 'Resolved').length,
    Closed: tickets.filter((ticket) => ticket[5] === 'Closed').length,
  };
  const visibleTickets = tickets.filter(
    (ticket) =>
      (statusFilter === 'All' || ticket[5] === statusFilter) &&
      ticket.join(' ').toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    fetch('/api/tickets')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTickets(
            result.data.map((item: TicketApiItem) => [
              item.id,
              formatPersonName(item.subscriber?.name || ''),
              item.type.replace(/_/g, ' '),
              item.subject,
              item.priority,
              item.status.replace('_', ' '),
              item.createdAt,
              item.description,
              [item.subscriber?.street, item.subscriber?.barangay, item.subscriber?.city, item.subscriber?.province].filter(Boolean).join(', ') || item.subscriber?.address || '',
              item.visitDate || null,
              item.visitTime || null,
              item.technicianId || null,
            ]),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/installations')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setInstallationSchedules(result.data.map((installation: InstallationSchedule) => ({
            id: installation.id,
            technicianId: installation.technicianId,
            date: installation.date,
            time: installation.time,
          })));
        }
      })
      .catch(() => setInstallationSchedules([]));
  }, []);

  useEffect(() => {
    fetch('/api/technicians')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTechnicians(result.data.filter((item: Technician) => item.status === 'Active'));
        }
      })
      .catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    const table = document.querySelector('table[class*="min-w-300"]');
    const toolbar = table?.closest('.mt-4')?.previousElementSibling;
    if (!toolbar) return;
    toolbar.querySelectorAll('.installation-record-counter').forEach((node) => node.remove());
    toolbar.querySelectorAll('.live-record-counter').forEach((node, index) => {
      if (index > 0) node.remove();
    });
    let counter = toolbar.querySelector<HTMLSpanElement>('.live-record-counter');
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'live-record-counter ml-auto text-sm text-slate-400';
      toolbar.appendChild(counter);
    }
    counter.textContent = `${visibleTickets.length} records`;
  }, [visibleTickets.length]);

  function openManager(ticket: Ticket) {
    setSelectedTicket(ticket);
    setStatus(ticket[5]);
    setAdminNote('');
    setVisitDate(ticket[9]?.slice(0, 10) || '');
    setTimeSlot(ticket[10] || '');
    setTechnicianId(ticket[11] || '');
    setScheduleChanged(false);
  }

  function selectTicketStatus(nextStatus: string) {
    setStatus(nextStatus);
    if (nextStatus === 'Closed' && selectedTicket?.[5] !== 'Closed') {
      setVisitDate('');
      setTimeSlot('');
      setTechnicianId('');
    }
  }

  async function saveTicket() {
    if (!selectedTicket) return;
    try {
      await fetch(`/api/tickets/${selectedTicket[0]}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote, technicianId, visitDate, visitTime: timeSlot }),
      });
    } finally {
      setTickets((current) =>
        current.map((ticket) =>
          ticket[0] === selectedTicket[0]
            ? [ticket[0], ticket[1], ticket[2], ticket[3], ticket[4], status, ticket[6], ticket[7], ticket[8], visitDate || null, timeSlot || null, technicianId || null]
            : ticket,
        ),
      );
      setSelectedTicket(null);
    }
  }

  return (
    <PortalShell role="admin">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="mt-1 text-sm text-slate-500">Manage subscriber support requests</p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['SUBMITTED', counts.Open],
          ['REPAIR CONFIRMED', counts['In Progress']],
          ['REPAIR CLOSED', counts.Resolved],
          ['REPAIR RESCHEDULED', counts.Closed],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white px-6 py-5">
            <p className="text-xs font-bold tracking-wide text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tickets..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]"
          />
        </div>
        <label className="status-filter-container relative">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter support tickets" className="admin-filter-dropdown status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]">
          <option value="All">All</option>
          <option value="Open">Submitted</option>
          <option value="In Progress">Repair Confirmed</option>
          <option value="Resolved">Repair Closed</option>
          <option value="Closed">Repair Rescheduled</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto scrollbar-hidden">
          <table className="min-w-300 w-full text-left">
            <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {['Ticket ID', 'Subscriber', 'Concern', 'Date', 'Time', 'Status', 'Actions'].map((heading) => (
                  <th className="px-5 py-4" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {visibleTickets.map((ticket) => (
                <tr className="border-t border-slate-100" key={ticket[0]}>
                  <td className="px-5 py-4 text-slate-900">{ticket[0]}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{ticket[1]}</td>
                  <td className="px-5 py-4 text-slate-500">{ticket[2]}</td>
                  <td className="px-5 py-4 text-slate-500">{formatVisitDate(ticket[9])}</td>
                  <td className="px-5 py-4 text-slate-500">{formatVisitTime(ticket[10])}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[ticket[5]]}`}>{getStatusLabel(ticket[5])}</span>
                  </td>
                  <td className="px-5 py-4"><button onClick={() => openManager(ticket)} className="text-xs font-semibold text-[#2563eb]">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 sm:p-5" onMouseDown={() => setSelectedTicket(null)}>
          <div className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
              <h2 className="text-lg font-bold">Manage Ticket</h2>
              <button onClick={() => setSelectedTicket(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-scroll">
              <div className="space-y-6 px-6 py-7 sm:px-8">
              <div className="space-y-5">
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</p><p className="mt-2 text-sm text-slate-900">{selectedTicket[1]}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Address</p><p className="mt-2 text-sm text-slate-900">{selectedTicket[8] || 'No address provided'}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ticket ID</p><p className="mt-2 text-sm text-slate-900">{selectedTicket[0]}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Concern</p><p className="mt-2 text-sm text-slate-900">{selectedTicket[2]}</p></div>
                </div>

              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</p><p className="mt-2 text-sm text-slate-900">{selectedTicket[3]}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Details</p><p className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">{selectedTicket[7] || 'No details provided.'}</p></div>

              <div className="border-t border-slate-100 pt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Technician visit date and time</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <input min={getMinimumVisitDate()} type="date" value={visitDate} onChange={(event) => { setVisitDate(event.target.value); setScheduleChanged(true); }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#3b4fd8]" />
                  </div>
                  <select value={normalizeTimeSlot(timeSlot)} onChange={(event) => { setTimeSlot(event.target.value); setScheduleChanged(true); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8]"><option value="">— Time slot —</option><option>9:00 AM – 12:00 NN</option><option>1:00 PM – 4:00 PM</option></select>
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Technician {scheduleChanged && visitDate && timeSlot && <span className="font-normal normal-case text-[#2447b6]">({availableTechnicianCount} available on this date and time)</span>}<select disabled={!scheduleChanged && Boolean(selectedTicket[9] && selectedTicket[10] && selectedTicket[11])} value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"><option value="">— Choose available technician —</option>{(scheduleChanged ? technicians.filter(isTechnicianAvailable) : technicians).map((technician) => <option value={technician.id} key={technician.id}>{formatPersonName(technician.name)}</option>)}</select></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Status<select value={status} onChange={(event) => selectTicketStatus(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#3b4fd8]"><option value="In Progress">Repair Confirmed</option><option value="Resolved">Repair Closed</option><option value="Closed">Repair Rescheduled</option></select></label>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button onClick={() => setSelectedTicket(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={saveTicket} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
