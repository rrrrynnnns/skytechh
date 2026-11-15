'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Ticket as TicketIcon,
  Wrench,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { AdminDatePicker } from '@/app/components/AdminDatePicker';
import { formatPersonName } from '@/app/lib/name';

type Ticket = readonly [
  string, // 0: id
  string, // 1: subscriberName
  string, // 2: concern/type
  string, // 3: subject
  string, // 4: priority
  string, // 5: status
  string, // 6: createdAt
  string, // 7: description
  string, // 8: address
  string | null, // 9: visitDate
  string | null, // 10: visitTime
  string | null, // 11: technicianId
];

type TicketApiItem = {
  id: string;
  subscriber?: {
    name: string;
    address: string;
    street?: string | null;
    barangay?: string | null;
    city?: string | null;
    province?: string | null;
  };
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
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getMinimumVisitDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isSunday(value: string) {
  return new Date(`${value}T00:00:00`).getDay() === 0;
}

function normalizeTimeSlot(value: string | null | undefined) {
  if (!value) return '';
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const statusStyles: Record<string, string> = {
  Open: 'bg-blue-50 text-blue-600',
  'In Progress': 'bg-emerald-50 text-emerald-600',
  Resolved: 'bg-slate-100 text-slate-600',
  Closed: 'bg-amber-50 text-amber-600',
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);

  const loadTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/tickets', { cache: 'no-store' });
      const result = await response.json();
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
            [
              item.subscriber?.street,
              item.subscriber?.barangay,
              item.subscriber?.city,
              item.subscriber?.province,
            ]
              .filter(Boolean)
              .join(', ') ||
              item.subscriber?.address ||
              '',
            item.visitDate || null,
            item.visitTime || null,
            item.technicianId || null,
          ]),
        );
      }
    } catch {
      // ignore error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    fetch('/api/installations')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setInstallationSchedules(
            result.data.map((installation: InstallationSchedule) => ({
              id: installation.id,
              technicianId: installation.technicianId,
              date: installation.date,
              time: installation.time,
            })),
          );
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

  function handleVisitDateChange(value: string) {
    if (value && isSunday(value)) {
      window.alert('Support tickets cannot be scheduled on Sundays.');
      setVisitDate('');
      setScheduleChanged(true);
      return;
    }
    setVisitDate(value);
    setScheduleChanged(true);
  }

  const isTechnicianAvailable = (technician: Technician) =>
    !tickets.some(
      (ticket) =>
        ticket[11] === technician.id &&
        ticket[9]?.slice(0, 10) === visitDate &&
        normalizeTimeSlot(ticket[10]) === normalizeTimeSlot(timeSlot) &&
        ticket[0] !== selectedTicket?.[0],
    ) &&
    !installationSchedules.some(
      (installation) =>
        installation.technicianId === technician.id &&
        installation.date.slice(0, 10) === visitDate &&
        normalizeTimeSlot(installation.time) === normalizeTimeSlot(timeSlot),
    );

  const unavailableTicketDates = useMemo(
    () =>
      new Set(
        technicians.length
          ? Array.from({ length: 366 }, (_, dayOffset) => {
              const date = new Date();
              date.setDate(date.getDate() + dayOffset + 1);
              return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
              ].join('-');
            }).filter(
              (date) =>
                !technicians.some((technician) =>
                  ['9:00 AM – 12:00 NN', '1:00 PM – 4:00 PM'].some(
                    (time) =>
                      !tickets.some(
                        (ticket) =>
                          ticket[11] === technician.id &&
                          ticket[9]?.slice(0, 10) === date &&
                          normalizeTimeSlot(ticket[10]) === time &&
                          ticket[0] !== selectedTicket?.[0],
                      ) &&
                      !installationSchedules.some(
                        (installation) =>
                          installation.technicianId === technician.id &&
                          installation.date.slice(0, 10) === date &&
                          normalizeTimeSlot(installation.time) === time,
                      ),
                  ),
                ),
            )
          : [],
      ),
    [technicians, tickets, installationSchedules, selectedTicket],
  );

  const availableTechnicianCount = technicians.filter(isTechnicianAvailable).length;

  const counts = useMemo(
    () => ({
      total: tickets.length,
      Open: tickets.filter((ticket) => ticket[5] === 'Open').length,
      'In Progress': tickets.filter((ticket) => ticket[5] === 'In Progress').length,
      Resolved: tickets.filter((ticket) => ticket[5] === 'Resolved').length,
      Closed: tickets.filter((ticket) => ticket[5] === 'Closed').length,
    }),
    [tickets],
  );

  const visibleTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          (statusFilter === 'All' || ticket[5] === statusFilter) &&
          ticket.join(' ').toLowerCase().includes(query.toLowerCase()),
      ),
    [tickets, statusFilter, query],
  );

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
    if (!selectedTicket || isSaving) return;
    if (visitDate && isSunday(visitDate)) {
      window.alert('Support tickets cannot be scheduled on Sundays.');
      return;
    }
    if (visitDate && visitDate < getMinimumVisitDate()) {
      window.alert('Please choose a future support visit date.');
      return;
    }
    setIsSaving(true);
    const nextStatus = status === 'Open' && visitDate && timeSlot && technicianId ? 'In Progress' : status;
    try {
      const response = await fetch(`/api/tickets/${selectedTicket[0]}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, adminNote, technicianId, visitDate, visitTime: timeSlot }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        window.alert(result?.error || 'Unable to save ticket changes.');
        return;
      }
      if (nextStatus !== status) setStatus(nextStatus);
      setTickets((current) =>
        current.map((ticket) =>
          ticket[0] === selectedTicket[0]
            ? [
                ticket[0],
                ticket[1],
                ticket[2],
                ticket[3],
                ticket[4],
                nextStatus,
                ticket[6],
                ticket[7],
                ticket[8],
                visitDate || null,
                timeSlot || null,
                technicianId || null,
              ]
            : ticket,
        ),
      );
      setSelectedTicket(null);
    } finally {
      setIsSaving(false);
    }
  }

  function handleExportCsv() {
    if (!visibleTickets.length) return;
    const header = ['Ticket ID', 'Subscriber', 'Concern', 'Subject', 'Visit Date', 'Visit Time', 'Status', 'Address'];
    const csvRows = [
      header,
      ...visibleTickets.map((t) => [
        t[0],
        t[1],
        t[2],
        t[3],
        formatVisitDate(t[9]),
        normalizeTimeSlot(t[10]) || '—',
        getStatusLabel(t[5]),
        t[8],
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sky-tech-support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: typeof Inbox;
    tile: string;
    bar: string;
    dot: string;
    target: string;
  }> = [
    {
      label: 'Submitted',
      value: counts.Open,
      detail: counts.Open > 0 ? 'Awaiting dispatch' : 'No new tickets',
      Icon: Inbox,
      tile: 'bg-blue-50 text-blue-600',
      bar: 'bg-blue-500',
      dot: counts.Open > 0 ? 'text-blue-600' : 'text-emerald-600',
      target: 'Open',
    },
    {
      label: 'Repair confirmed',
      value: counts['In Progress'],
      detail: 'Scheduled for visit',
      Icon: Wrench,
      tile: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
      dot: 'text-emerald-600',
      target: 'In Progress',
    },
    {
      label: 'Repair closed',
      value: counts.Resolved,
      detail: 'Completed & resolved',
      Icon: CheckCircle2,
      tile: 'bg-violet-50 text-violet-600',
      bar: 'bg-violet-500',
      dot: 'text-slate-500',
      target: 'Resolved',
    },
    {
      label: 'Rescheduled',
      value: counts.Closed,
      detail: counts.Closed > 0 ? 'Needs new slot' : 'All on schedule',
      Icon: CalendarClock,
      tile: 'bg-amber-50 text-amber-600',
      bar: 'bg-amber-500',
      dot: counts.Closed > 0 ? 'text-amber-600' : 'text-emerald-600',
      target: 'Closed',
    },
  ];

  const filterTabs: Array<[string, string, number]> = [
    ['All', 'All', counts.total],
    ['Open', 'Submitted', counts.Open],
    ['In Progress', 'Confirmed', counts['In Progress']],
    ['Resolved', 'Closed', counts.Resolved],
    ['Closed', 'Rescheduled', counts.Closed],
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Support Tickets</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage subscriber repair requests, dispatch technicians, and track resolution
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadTickets(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!visibleTickets.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, target }) => {
            const active = statusFilter === target;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStatusFilter((current) => (current === target ? 'All' : target))}
                className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                  active ? 'border-[#2166f3] ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                      {loading ? (
                        <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-100 align-middle" />
                      ) : (
                        value.toLocaleString()
                      )}
                    </p>
                  </div>
                  <span className={`admin-stat-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tile}`}>
                    <Icon size={20} />
                  </span>
                </div>
                <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${dot}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {detail}
                </p>
                <span
                  className={`absolute inset-x-0 bottom-0 h-0.5 ${bar} transition-opacity ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subscriber, concern, or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[#2166f3] focus:bg-white"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
                {filterTabs.map(([key, label, count]) => {
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {label}{' '}
                      <span className={`ml-1 tabular-nums ${active ? 'text-[#2166f3]' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {visibleTickets.length} {visibleTickets.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Subscriber</th>
                  <th className="px-5 py-3.5">Concern &amp; Subject</th>
                  <th className="px-5 py-3.5">Scheduled Visit</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-5 w-36 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-7 w-20 animate-pulse rounded-xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <TicketIcon size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No support tickets found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || statusFilter !== 'All'
                          ? 'Try adjusting your search or status filter.'
                          : 'Subscriber support requests will appear here.'}
                      </p>
                      {(query || statusFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setStatusFilter('All');
                          }}
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleTickets.map((ticket) => {
                    const [id, subscriberName, concern, subject, , ticketStatus, , , address, ticketVisitDate, ticketVisitTime] = ticket;
                    return (
                      <tr key={id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(subscriberName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{subscriberName}</p>
                              <p className="mt-0.5 max-w-xs truncate font-mono text-[11px] text-slate-400">
                                #{id}{address ? ` · ${address}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{concern}</p>
                          {subject && subject !== concern && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{subject}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {ticketVisitDate ? (
                            <>
                              <p className="flex items-center gap-1.5 font-medium text-slate-800">
                                <Calendar size={13} className="shrink-0 text-slate-400" />
                                {formatVisitDate(ticketVisitDate)}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                                <Clock size={12} className="shrink-0" />
                                {normalizeTimeSlot(ticketVisitTime) || '—'}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${
                              statusStyles[ticketStatus] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {getStatusLabel(ticketStatus)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openManager(ticket)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2166f3] transition-colors hover:bg-blue-100"
                          >
                            <SlidersHorizontal size={13} />
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Manage Ticket Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-3 backdrop-blur-xs sm:p-5"
          onMouseDown={() => setSelectedTicket(null)}
        >
          <div
            className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-7">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Manage Ticket</h2>
                <p className="mt-0.5 font-mono text-xs text-slate-400">#{selectedTicket[0]}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-scroll">
              <div className="space-y-6 px-6 py-6 sm:px-7">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-bold text-slate-900">{selectedTicket[1]}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    {selectedTicket[8] || 'No address provided'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-200 pt-3 text-xs">
                    <span className="text-slate-500">
                      Concern: <strong className="text-slate-800">{selectedTicket[2]}</strong>
                    </span>
                    <span className="text-slate-500">
                      Subject: <strong className="text-slate-800">{selectedTicket[3]}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Details</p>
                  <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-600">
                    {selectedTicket[7] || 'No details provided.'}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Technician visit date and time
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <AdminDatePicker
                        minDate={getMinimumVisitDate()}
                        value={visitDate}
                        onChange={handleVisitDateChange}
                        unavailableDates={unavailableTicketDates}
                        disabled={status === 'Resolved' || status === 'In Progress'}
                      />
                    </div>
                    <select
                      value={normalizeTimeSlot(timeSlot)}
                      onChange={(event) => {
                        setTimeSlot(event.target.value);
                        setScheduleChanged(true);
                      }}
                      disabled={status === 'Resolved' || status === 'In Progress'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">— Time slot —</option>
                      <option>9:00 AM – 12:00 NN</option>
                      <option>1:00 PM – 4:00 PM</option>
                    </select>
                  </div>
                </div>

                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Technician{' '}
                  {scheduleChanged && visitDate && timeSlot && (
                    <span className="font-normal normal-case text-[#2447b6]">
                      ({availableTechnicianCount} available on this date and time)
                    </span>
                  )}
                  <select
                    disabled={!scheduleChanged && Boolean(selectedTicket[9] && selectedTicket[10] && selectedTicket[11])}
                    value={technicianId}
                    onChange={(event) => setTechnicianId(event.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">— Choose available technician —</option>
                    {(visitDate && timeSlot
                      ? scheduleChanged
                        ? technicians.filter(isTechnicianAvailable)
                        : technicians
                      : []
                    ).map((technician) => (
                      <option value={technician.id} key={technician.id}>
                        {formatPersonName(technician.name)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                  <select
                    value={status}
                    onChange={(event) => selectTicketStatus(event.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#3b4fd8]"
                  >
                    {status === 'Open' && (
                      <option value="Open" hidden>
                        Submitted
                      </option>
                    )}
                    {!['Resolved', 'Closed', 'Repair Closed', 'Repair Rescheduled'].includes(status) && (
                      <option value="In Progress">Repair Confirmed</option>
                    )}
                    {status !== 'Open' && <option value="Resolved">Repair Closed</option>}
                    {status !== 'Open' && <option value="Closed">Repair Rescheduled</option>}
                  </select>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={saveTicket}
                className="rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30 hover:bg-[#1d57d6]"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
