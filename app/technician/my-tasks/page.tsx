'use client';

import Link from 'next/link';
import { Bell, CalendarDays, CheckSquare, Clock3, ChevronLeft, ChevronRight, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type ScheduledTask = {
  id: string;
  name: string;
  type: string;
  isInstallation: boolean;
  time: string;
  date: string;
  status: 'Scheduled' | 'In Progress' | 'Done';
  rawStatus: string;
  requestType?: string;
  description?: string;
  details?: string;
  address?: string;
  technicianName?: string;
};

type Technician = { id: string; name: string; status: string };
type InstallationApiItem = { id: string; date: string; time: string; type: string; status: string; notes?: string | null; address?: string | null; technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null };
type TicketApiItem = { id: string; subject: string; description: string; type: string; status: string; visitDate?: string | null; visitTime?: string | null; technician?: { name?: string | null } | null; subscriber?: { name?: string | null; address?: string | null } | null };

const installationStatusOptions = [
  ['Installation_Confirmed', 'Installation Confirmed'],
  ['Installation_Closed', 'Installation Closed'],
  ['Installation_Rescheduled', 'Installation Rescheduled'],
] as const;
const repairStatusOptions = [
  ['In Progress', 'Repair Confirmed'],
  ['Resolved', 'Repair Closed'],
  ['Closed', 'Repair Rescheduled'],
] as const;

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTaskStatus(status: string): ScheduledTask['status'] {
  const normalized = status.replace(/_/g, ' ');
  if (normalized === 'In Progress') return 'In Progress';
  if (['Completed', 'Closed', 'Resolved', 'Installation Closed', 'Installation_Closed'].includes(normalized)) return 'Done';
  return 'Scheduled';
}

function getDisplayStatus(status: string) {
  const normalized = String(status || '').trim();
  const map: Record<string, string> = {
    Open: 'Submitted',
    Submitted: 'Submitted',
    Scheduled: 'Installation Confirmed',
    'In Progress': 'Repair Confirmed',
    In_Progress: 'Repair Confirmed',
    Completed: 'Installation Closed',
    Closed: 'Repair Rescheduled',
    Cancelled: 'Installation Rescheduled',
    Resolved: 'Repair Closed',
    'Installation Confirmed': 'Installation Confirmed',
    Installation_Confirmed: 'Installation Confirmed',
    'Installation Closed': 'Installation Closed',
    Installation_Closed: 'Installation Closed',
    'Installation Rescheduled': 'Installation Rescheduled',
    Installation_Rescheduled: 'Installation Rescheduled',
  };
  return map[normalized] || normalized.replace(/_/g, ' ');
}

function getInstallationDisplayStatus(status: string) {
  const normalized = String(status || '').trim().replace(/_/g, ' ');
  if (['Scheduled', 'In Progress', 'Installation Confirmed'].includes(normalized)) return 'Installation Confirmed';
  if (['Completed', 'Installation Closed'].includes(normalized)) return 'Installation Closed';
  if (['Cancelled', 'Canceled', 'Installation Rescheduled'].includes(normalized)) return 'Installation Rescheduled';
  return normalized;
}

const statusStyles: Record<string, string> = {
  Submitted: 'border-blue-200 bg-blue-50 text-blue-600',
  Scheduled: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'In Progress': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  Done: 'border-slate-200 bg-slate-50 text-slate-600',
  'Installation Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Installation Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Installation Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
  'Repair Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Repair Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Repair Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
};

function formatTaskDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function TechnicianTasks() {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [monthDate, setMonthDate] = useState(() => new Date());
  const hasInitializedTaskDate = useRef(false);
  useEffect(() => {
    Promise.all([
      fetch('/api/technician/account').catch(() => null),
      fetch('/api/installations').catch(() => null),
      fetch('/api/tickets').catch(() => null),
    ]).then(async ([accountResponse, installationResponse, ticketResponse]) => {
      const [accountResult, installationResult, ticketResult] = await Promise.all([
        accountResponse?.ok ? accountResponse.json() : Promise.resolve({ data: null }),
        installationResponse?.ok ? installationResponse.json() : Promise.resolve({ data: [] }),
        ticketResponse?.ok ? ticketResponse.json() : Promise.resolve({ data: [] }),
      ]);

      if (accountResult.data) setTechnician(accountResult.data);

      const installations: ScheduledTask[] = Array.isArray(installationResult.data)
        ? installationResult.data.map((item: InstallationApiItem) => ({
          id: item.id,
            name: item.subscriber?.name || 'Subscriber',
            type: item.type === 'Installation' ? 'Date' : item.type.replace(/_/g, ' '),
          isInstallation: true,
            time: item.time || 'Time not set',
            date: item.date.slice(0, 10),
            status: getTaskStatus(item.status),
            rawStatus: item.status,
            requestType: item.type.replace(/_/g, ' '),
            description: item.notes || '',
            address: item.subscriber?.address || item.address || 'No address provided',
            technicianName: item.technician?.name || 'Not assigned yet',
          }))
        : [];
      const repairs: ScheduledTask[] = Array.isArray(ticketResult.data)
        ? ticketResult.data
            .filter((ticket: TicketApiItem) => ticket.visitDate)
            .map((ticket: TicketApiItem) => ({
              id: ticket.id,
              name: ticket.subscriber?.name || 'Subscriber',
              type: ticket.subject || ticket.type.replace(/_/g, ' '),
              isInstallation: false,
              time: ticket.visitTime || 'Time not set',
              date: ticket.visitDate!.slice(0, 10),
              status: getTaskStatus(ticket.status),
              rawStatus: ticket.status,
              requestType: ticket.type.replace(/_/g, ' '),
              description: ticket.subject,
              details: ticket.description,
              address: ticket.subscriber?.address || 'No address provided',
              technicianName: ticket.technician?.name || 'Not assigned yet',
            }))
        : [];

      const nextScheduledTasks = [...installations, ...repairs].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      setScheduledTasks(nextScheduledTasks);
      if (!hasInitializedTaskDate.current && nextScheduledTasks.length) {
        hasInitializedTaskDate.current = true;
        const today = toDateKey(new Date());
        if (!nextScheduledTasks.some((task) => task.date === today)) {
          const nextTaskDate = nextScheduledTasks.map((task) => task.date).filter((date) => date >= today).sort()[0]
            || nextScheduledTasks.map((task) => task.date).sort()[0];
          if (nextTaskDate) {
            setSelectedDate(nextTaskDate);
            setMonthDate(new Date(`${nextTaskDate}T12:00:00`));
          }
        }
      }
    });
  }, []);
  const selectedTasks = useMemo(() => scheduledTasks.filter((task) => task.date === selectedDate), [scheduledTasks, selectedDate]);
  const taskDates = new Set(scheduledTasks.map((task) => task.date));
  const pendingCount = scheduledTasks.filter((task) => task.status !== 'Done').length;
  const doneCount = scheduledTasks.filter((task) => task.status === 'Done').length;
  const today = toDateKey(new Date());
  const todaysTasks = scheduledTasks.filter((task) => task.date === today);
  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstDay + 1;
      const date = new Date(year, month, dayOffset);
      return { day: dayOffset <= 0 ? previousDays + dayOffset : dayOffset > daysInMonth ? dayOffset - daysInMonth : dayOffset, muted: dayOffset <= 0 || dayOffset > daysInMonth, date: toDateKey(date) };
    });
  }, [monthDate]);
  const displayName = formatPersonName(technician?.name || 'Technician');
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  function changeMonth(offset: number) {
    hasInitializedTaskDate.current = true;
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    setMonthDate(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  }

  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  function openTask(task: ScheduledTask) {
    setSelectedTask(task);
    setSelectedStatus(task.isInstallation
      ? installationStatusOptions.find(([, label]) => label === getInstallationDisplayStatus(task.rawStatus))?.[0] || installationStatusOptions[0][0]
      : task.rawStatus === 'Open' ? 'In Progress' : task.rawStatus.replace(/_/g, ' '));
    setStatusError('');
  }

  async function saveTaskStatus() {
    if (!selectedTask) return;
    setIsSavingStatus(true);
    setStatusError('');
    try {
      const endpoint = selectedTask.isInstallation
        ? `/api/installations/${selectedTask.id}`
        : `/api/tickets/${selectedTask.id}/status`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setStatusError(result?.error || 'Unable to update task status.');
        return;
      }
      const updatedTask = { ...selectedTask, rawStatus: selectedStatus, status: getTaskStatus(selectedStatus) };
      setScheduledTasks((current) => current.map((task) => task.id === selectedTask.id && task.isInstallation === selectedTask.isInstallation ? updatedTask : task));
      setSelectedTask(null);
    } catch {
      setStatusError('Unable to update task status.');
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <PortalShell role="technician">
      <div className="bg-[#2447b6] px-5 pb-7 pt-7 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#4770d6] text-lg font-bold">{initials}</span>
              <div><p className="text-sm text-blue-100">{greeting || 'Hello'}</p><h1 className="text-xl font-bold">{displayName.split(' ')[0]}</h1></div>
            </div>
            <Link href="/technician/notifications" aria-label="Notifications" className="relative rounded-2xl bg-[#4770d6] p-3"><Bell size={20} /><span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3b50] px-1 text-[9px] font-bold">2</span></Link>
          </div>
          <section className="overflow-hidden rounded-3xl bg-white text-slate-950 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2166f3] text-white"><Wrench size={22} /></span><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sky-Tech Technician</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${technician?.status?.replace(/_/g, ' ') === 'On Leave' ? 'bg-amber-500' : 'bg-emerald-600'}`}>{technician?.status?.replace(/_/g, ' ') || 'Active'}</span></div>
            <div className="flex items-end justify-between gap-4 px-4 py-6 sm:px-6"><div><h2 className="text-xl font-bold">{displayName}</h2><p className="mt-1 text-sm text-slate-400">{technician?.id || 'Technician account'}</p></div><div className="text-right"><p className="text-2xl font-bold text-[#2447b6]">{todaysTasks.length}</p><p className="text-xs text-slate-400">Tasks today</p></div></div>
            <div className="grid grid-cols-3 border-t border-slate-100 bg-[#f8faff] py-5">{[{ Icon: CheckSquare, value: String(doneCount), label: 'Done' }, { Icon: Clock3, value: String(pendingCount), label: 'Pending' }, { Icon: CalendarDays, value: String(scheduledTasks.length), label: 'All Task' }].map(({ Icon, value, label }) => <div className="flex flex-col items-center gap-2 border-r border-slate-200 last:border-0" key={label}><Icon size={21} className="text-[#2166f3]" /><strong>{value}</strong><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span></div>)}</div>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl bg-[#eef4fb] px-4 py-6 sm:px-8 lg:px-10">
        <h2 className="text-lg font-bold">My Task Today</h2>
        <div className="mt-4 grid gap-3">
          {todaysTasks.map((task) => {
            const displayStatus = getDisplayStatus(task.rawStatus || task.status);
            return (
              <button type="button" key={`${task.isInstallation ? 'installation' : 'repair'}-${task.id}`} onClick={() => openTask(task)} aria-label={`Open task for ${formatPersonName(task.name)}`} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3]">{task.isInstallation ? <CalendarDays size={20} /> : <Wrench size={20} />}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{formatPersonName(task.name)}</h3>
                    <p className="mt-1 truncate text-sm text-slate-400">{formatTaskDate(task.date)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[displayStatus] || 'border-blue-200 bg-blue-50 text-blue-600'}`}>{displayStatus}</span>
                </div>
              </button>
            );
          })}
          {!todaysTasks.length && <p className="rounded-2xl bg-white p-4 text-sm text-slate-400 shadow-sm">No tasks scheduled today.</p>}
        </div>
        <h2 className="mt-6 text-lg font-bold">View Scheduled Task</h2>
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between"><button aria-label="Previous month" onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-[#2166f3]"><ChevronLeft size={18} /></button><h3 className="text-sm font-bold sm:text-base">{monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3><button aria-label="Next month" onClick={() => changeMonth(1)} className="rounded-lg p-2 text-[#2166f3]"><ChevronRight size={18} /></button></div>
          <div className="mt-5 grid grid-cols-7 gap-y-2 text-center text-xs sm:gap-y-3 sm:text-sm"><div className="col-span-7 grid grid-cols-7 text-[10px] font-semibold text-slate-400 sm:text-xs">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>{calendarDays.map(({ day, muted, date }) => { const active = selectedDate === date; const hasTasks = taskDates.has(date); return <button key={date} disabled={muted} onClick={() => { hasInitializedTaskDate.current = true; setSelectedDate(date); }} className={`relative grid min-h-8 place-items-center rounded-xl font-semibold ${muted ? 'text-slate-300' : active ? 'bg-[#2447b6] text-white' : 'text-slate-800 hover:bg-blue-50'}`}>{day}{hasTasks && !active && <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}{hasTasks && active && <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-white" />}</button>; })}</div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><h3 className="font-bold">Task Overview</h3><p className="mt-2 text-sm text-slate-400">{selectedDateLabel}</p><p className={`mt-1 text-sm font-semibold ${selectedTasks.length ? 'text-emerald-600' : 'text-slate-400'}`}>{selectedTasks.length ? `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} scheduled` : 'No tasks scheduled'}</p></section>

        {selectedTasks.length > 0 && <div className="mt-4 grid gap-3">{selectedTasks.map((task) => {
          const displayStatus = getDisplayStatus(task.rawStatus || task.status);
          return (
            <button type="button" key={`${task.isInstallation ? 'installation' : 'repair'}-${task.id}`} onClick={() => openTask(task)} aria-label={`Open task for ${formatPersonName(task.name)}`} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2166f3]">{task.isInstallation ? <CalendarDays size={20} /> : <Wrench size={20} />}</span>
                <div className="min-w-0"><h3 className="truncate font-bold">{formatPersonName(task.name)}</h3><p className="mt-1 truncate text-sm text-slate-400">{formatTaskDate(task.date)}</p></div>
              </div>
              <div className="shrink-0 text-right"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[displayStatus] || 'border-blue-200 bg-blue-50 text-blue-600'}`}>{displayStatus}</span></div>
            </button>
          );
        })}</div>}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/40" onMouseDown={() => setSelectedTask(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="selected-task-title" className="absolute inset-y-0 right-0 w-full max-w-[720px] overflow-y-auto bg-[#eef4fb] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between bg-[#2447b6] px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15">{selectedTask.isInstallation ? <CalendarDays size={21} /> : <Wrench size={21} />}</span>
                <div><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Status</p><h2 id="selected-task-title" className="text-xl font-bold">{selectedTask.isInstallation ? getInstallationDisplayStatus(selectedTask.rawStatus) : getDisplayStatus(selectedTask.rawStatus)}</h2></div>
              </div>
              <button type="button" aria-label="Close task details" onClick={() => setSelectedTask(null)} className="rounded-full bg-white/15 p-2.5 transition-colors hover:bg-white/25"><X size={20} /></button>
            </header>
            <div className="space-y-5 p-5 sm:p-7">
              <div className="flex items-center justify-between rounded-xl bg-white/75 px-5 py-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Work order number</span><strong className="text-lg font-bold text-slate-900">{selectedTask.id}</strong></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-xl font-bold text-slate-900">Work order details</h3>
                <div className="mt-5 space-y-5">
                  <div><p className="text-sm text-slate-500">Technician visit date and time</p><p className="mt-1 text-lg font-semibold text-slate-800">{formatTaskDate(selectedTask.date)}, {selectedTask.time}</p></div>
                  <div><p className="text-sm text-slate-500">Technician</p><p className="mt-1 text-lg font-semibold text-slate-800">{formatPersonName(selectedTask.technicianName || 'Not assigned yet')}</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-xl font-bold text-slate-900">Request details</h3>
                <div className="mt-5 space-y-5">
                  <div><p className="text-sm text-slate-500">Name</p><p className="mt-1 text-lg font-semibold text-slate-800">{formatPersonName(selectedTask.name)}</p></div>
                  <div><p className="text-sm text-slate-500">Address</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedTask.address || 'No address provided'}</p></div>
                  <div><p className="text-sm text-slate-500">{selectedTask.isInstallation ? 'Request Type' : 'Concern'}</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedTask.requestType || selectedTask.type}</p></div>
                  {selectedTask.description && <div><p className="text-sm text-slate-500">Description</p><p className="mt-1 text-lg font-semibold text-slate-800">{selectedTask.description}</p></div>}
                  {!selectedTask.isInstallation && <div><p className="text-sm text-slate-500">Details</p><p className="mt-1 whitespace-pre-line text-base leading-7 text-slate-700">{selectedTask.details || 'No additional details provided.'}</p></div>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-bold text-slate-900">Update Status</h3>
                <div className="mt-4 grid gap-2">
                  {(selectedTask.isInstallation ? installationStatusOptions : repairStatusOptions).map(([value, label]) => (
                    <button type="button" key={value} onClick={() => setSelectedStatus(value)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${selectedStatus === value ? 'border-blue-200 bg-blue-50 text-[#2166f3]' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                      {selectedStatus === value && <span className="mr-2">✓</span>}{label}
                    </button>
                  ))}
                </div>
                {statusError && <p role="alert" className="mt-3 text-sm text-red-600">{statusError}</p>}
                <button type="button" disabled={isSavingStatus} onClick={saveTaskStatus} className="mt-4 w-full rounded-xl bg-[#2447b6] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{isSavingStatus ? 'Saving...' : 'Save Status'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </PortalShell>
  );
}
