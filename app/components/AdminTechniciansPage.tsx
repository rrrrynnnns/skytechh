'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarOff,
  Clock,
  Download,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Technician = {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Off Duty' | 'On Leave';
  contact?: string;
  archived?: boolean;
};

type StatusFilter = 'All' | 'Active' | 'Off Duty' | 'On Leave';

const normalizeStatus = (status: string): Technician['status'] => {
  const normalized = status.replace(/_/g, ' ');
  return normalized === 'Off Duty' || normalized === 'On Leave' ? normalized : 'Active';
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
  };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const statusStyles: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-600',
  'Off Duty': 'bg-slate-100 text-slate-600',
  'On Leave': 'bg-amber-50 text-amber-600',
};

export function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadTechnicians = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/technicians', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load technicians.');
      if (Array.isArray(result.data)) {
        setTechnicians(
          result.data.map(
            (item: {
              id: string;
              name: string;
              email: string;
              status: string;
              contact?: string | null;
              archived?: boolean;
            }) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              status: normalizeStatus(item.status),
              contact: item.contact || '',
              archived: Boolean(item.archived),
            }),
          ),
        );
      }
    } catch {
      setTechnicians([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTechnicians();
  }, [loadTechnicians]);

  function openAddModal() {
    setEditingTechnician(null);
    setIsModalOpen(true);
  }

  function openEditModal(technician: Technician) {
    setEditingTechnician(technician);
    setIsModalOpen(true);
  }

  async function saveTechnician(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') || '').trim();
    const middleName = String(form.get('middleName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    const contact = String(form.get('contact') || '').trim();
    const payload = {
      name: [firstName, middleName, lastName].filter(Boolean).join(' '),
      email: String(form.get('email') || '').trim(),
      contact,
      status: String(form.get('status') || 'Active').replace(/\s+/g, '_'),
    };

    try {
      const response = await fetch(
        editingTechnician ? `/api/technicians/${editingTechnician.id}` : '/api/technicians',
        {
          method: editingTechnician ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save technician.');
      const saved = result.data;
      const technician: Technician = {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        status: normalizeStatus(saved.status),
        contact,
        archived: editingTechnician?.archived ?? false,
      };
      setTechnicians((current) =>
        editingTechnician
          ? current.map((item) => (item.id === technician.id ? technician : item))
          : [technician, ...current],
      );
      setIsModalOpen(false);
      setEditingTechnician(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save technician.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTechnician(technician: Technician) {
    if (!window.confirm(`Delete ${formatPersonName(technician.name)}?`)) return;
    const response = await fetch(`/api/technicians/${technician.id}`, { method: 'DELETE' });
    if (response.ok) setTechnicians((current) => current.filter((item) => item.id !== technician.id));
    else window.alert('Unable to delete technician.');
  }

  async function archiveTechnician(technician: Technician) {
    const response = await fetch(`/api/technicians/${technician.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    if (response.ok)
      setTechnicians((current) =>
        current.map((item) => (item.id === technician.id ? { ...item, archived: true } : item)),
      );
    else window.alert('Unable to archive technician.');
  }

  async function unarchiveTechnician(technician: Technician) {
    const response = await fetch(`/api/technicians/${technician.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });
    if (response.ok)
      setTechnicians((current) =>
        current.map((item) => (item.id === technician.id ? { ...item, archived: false } : item)),
      );
    else window.alert('Unable to unarchive technician.');
  }

  const summaryCounts = useMemo(() => {
    const nonArchived = technicians.filter((t) => !t.archived);
    return {
      total: nonArchived.length,
      active: nonArchived.filter((t) => t.status === 'Active').length,
      offDuty: nonArchived.filter((t) => t.status === 'Off Duty').length,
      onLeave: nonArchived.filter((t) => t.status === 'On Leave').length,
      archived: technicians.length - nonArchived.length,
    };
  }, [technicians]);

  const visibleTechnicians = useMemo(
    () =>
      technicians.filter((technician) => {
        const matchesFilter = showArchived
          ? technician.archived
          : !technician.archived && (filter === 'All' || technician.status === filter);
        const haystack = `${technician.id} ${technician.name} ${technician.email} ${technician.contact || ''} ${technician.status}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [technicians, showArchived, filter, query],
  );

  function handleExportCsv() {
    if (!visibleTechnicians.length) return;
    const header = ['Technician ID', 'Name', 'Email', 'Contact', 'Status'];
    const csvRows = [
      header,
      ...visibleTechnicians.map((t) => [t.id, formatPersonName(t.name), t.email, t.contact || '', t.status]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sky-tech-technicians-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: typeof Wrench;
    tile: string;
    bar: string;
    dot: string;
    activeRing: boolean;
    onClick: () => void;
  }> = [
    {
      label: 'Total technicians',
      value: summaryCounts.total,
      detail: 'Registered field staff',
      Icon: Wrench,
      tile: 'bg-blue-50 text-blue-600',
      bar: 'bg-blue-500',
      dot: 'text-blue-600',
      activeRing: !showArchived && filter === 'All',
      onClick: () => {
        setShowArchived(false);
        setFilter('All');
      },
    },
    {
      label: 'Active',
      value: summaryCounts.active,
      detail: 'Available for dispatch',
      Icon: UserCheck,
      tile: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
      dot: 'text-emerald-600',
      activeRing: !showArchived && filter === 'Active',
      onClick: () => {
        setShowArchived(false);
        setFilter('Active');
      },
    },
    {
      label: 'Off Duty',
      value: summaryCounts.offDuty,
      detail: 'Off shift',
      Icon: Clock,
      tile: 'bg-violet-50 text-violet-600',
      bar: 'bg-violet-500',
      dot: 'text-slate-500',
      activeRing: !showArchived && filter === 'Off Duty',
      onClick: () => {
        setShowArchived(false);
        setFilter('Off Duty');
      },
    },
    {
      label: 'On Leave',
      value: summaryCounts.onLeave,
      detail: summaryCounts.onLeave > 0 ? 'Temporarily away' : 'Full team available',
      Icon: CalendarOff,
      tile: 'bg-amber-50 text-amber-600',
      bar: 'bg-amber-500',
      dot: summaryCounts.onLeave > 0 ? 'text-amber-600' : 'text-emerald-600',
      activeRing: !showArchived && filter === 'On Leave',
      onClick: () => {
        setShowArchived(false);
        setFilter('On Leave');
      },
    },
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Technicians</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage field technicians, availability, and contact details
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadTechnicians(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!visibleTechnicians.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Plus size={17} />
              Add Technician
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, activeRing, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                activeRing ? 'border-[#2166f3] ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
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
                  activeRing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, ID, email, or contact..."
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
              {!showArchived && (
                <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(
                    [
                      ['All', summaryCounts.total],
                      ['Active', summaryCounts.active],
                      ['Off Duty', summaryCounts.offDuty],
                      ['On Leave', summaryCounts.onLeave],
                    ] as const
                  ).map(([tab, count]) => {
                    const active = filter === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFilter(tab)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab}{' '}
                        <span className={`ml-1 tabular-nums ${active ? 'text-[#2166f3]' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showArchived
                    ? 'border-[#2166f3] bg-blue-50 text-[#2166f3]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Archive size={14} />
                {showArchived ? 'Back to Active' : `Archived (${summaryCounts.archived})`}
              </button>

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {visibleTechnicians.length} {visibleTechnicians.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Technician</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Contact</th>
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
                            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <Wrench size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        {showArchived ? 'No archived technicians' : 'No technicians found'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || filter !== 'All'
                          ? 'Try adjusting your search or filter.'
                          : 'Add a field technician to get started.'}
                      </p>
                      {(query || filter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setFilter('All');
                          }}
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleTechnicians.map((technician) => {
                    const displayName = formatPersonName(technician.name);
                    return (
                      <tr key={technician.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(displayName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{displayName}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">#{technician.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{technician.email}</td>
                        <td className="px-5 py-4">
                          {technician.contact ? (
                            <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-700">
                              <Phone size={13} className="text-slate-400" />
                              {technician.contact}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${
                              statusStyles[technician.status] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {technician.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
                            {!technician.archived ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(technician)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[#2166f3] transition-colors hover:bg-blue-50"
                                >
                                  <Pencil size={13} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void archiveTechnician(technician)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                                >
                                  <Archive size={13} />
                                  Archive
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void unarchiveTechnician(technician)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[#2166f3] transition-colors hover:bg-blue-50"
                                >
                                  <ArchiveRestore size={13} />
                                  Unarchive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteTechnician(technician)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-red-500 transition-colors hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Add / Edit Technician Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-xs"
          onMouseDown={() => setIsModalOpen(false)}
        >
          <form
            key={editingTechnician?.id ?? 'new'}
            onSubmit={saveTechnician}
            onMouseDown={(event) => event.stopPropagation()}
            className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingTechnician ? 'Edit Technician' : 'Add Technician'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {editingTechnician
                    ? `Updating technician #${editingTechnician.id}`
                    : 'Register a new field technician'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-scroll">
              <div className="space-y-5 px-6 py-6">
                {(() => {
                  const name = splitName(editingTechnician?.name || '');
                  return (
                    <>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                        First name *
                        <input
                          name="firstName"
                          required
                          defaultValue={name.firstName}
                          placeholder="Juan"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Middle name (optional)
                        <input
                          name="middleName"
                          defaultValue={name.middleName}
                          placeholder="Santos"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Last name *
                        <input
                          name="lastName"
                          required
                          defaultValue={name.lastName}
                          placeholder="dela Cruz"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                        />
                      </label>
                    </>
                  );
                })()}
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email *
                  <input
                    name="email"
                    required
                    type="email"
                    defaultValue={editingTechnician?.email || ''}
                    placeholder="email@skytech.net"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Contact *
                  <input
                    name="contact"
                    required
                    defaultValue={editingTechnician?.contact || ''}
                    placeholder="09XXXXXXXXX"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                  <select
                    name="status"
                    defaultValue={editingTechnician?.status || 'Active'}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  >
                    <option>Active</option>
                    <option>Off Duty</option>
                    <option>On Leave</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30 hover:bg-[#1d57d6]"
              >
                {isSaving ? 'Saving...' : editingTechnician ? 'Save changes' : 'Add Technician'}
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
