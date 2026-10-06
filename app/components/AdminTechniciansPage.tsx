'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
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

type StatusFilter = 'All' | 'Active' | 'On Leave' | 'Archived';

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

const statusStyles: Record<string, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Off Duty': 'border-slate-200 bg-slate-50 text-slate-600',
  'On Leave': 'border-amber-200 bg-amber-50 text-amber-600',
};

export function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/technicians')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load technicians.');
        if (Array.isArray(result.data)) {
          setTechnicians(
            result.data.map((item: { id: string; name: string; email: string; status: string; contact?: string | null; archived?: boolean }) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              status: normalizeStatus(item.status),
              contact: item.contact || '',
              archived: Boolean(item.archived),
            })),
          );
        }
      })
      .catch(() => setTechnicians([]));
  }, []);

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
      const response = await fetch(editingTechnician ? `/api/technicians/${editingTechnician.id}` : '/api/technicians', {
        method: editingTechnician ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save technician.');
      const saved = result.data;
      const technician: Technician = {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        status: normalizeStatus(saved.status),
        contact,
      };
      setTechnicians((current) => editingTechnician
        ? current.map((item) => item.id === technician.id ? technician : item)
        : [technician, ...current]);
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
    const response = await fetch(`/api/technicians/${technician.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) });
    if (response.ok) setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, archived: true } : item));
    else window.alert('Unable to archive technician.');
  }

  async function unarchiveTechnician(technician: Technician) {
    const response = await fetch(`/api/technicians/${technician.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) });
    if (response.ok) setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, archived: false } : item));
    else window.alert('Unable to unarchive technician.');
  }

  const summaryCounts = useMemo(
    () => ({
      total: technicians.length,
      active: technicians.filter((technician) => technician.status === 'Active').length,
      offDuty: technicians.filter((technician) => technician.status === 'Off Duty').length,
      onLeave: technicians.filter((technician) => technician.status === 'On Leave').length,
    }),
    [technicians],
  );

  const visibleTechnicians = technicians.filter((technician) => {
    const matchesFilter = showArchived
      ? technician.archived
      : !technician.archived && (filter === 'All' || technician.status === filter);
    const haystack = `${technician.id} ${technician.name} ${technician.email} ${technician.status}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  });

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technicians</h1>
          <p className="mt-1 text-sm text-slate-500">Manage field technicians</p>
        </div>

        <button onClick={openAddModal} className="inline-flex items-center gap-2 rounded-full bg-[#3b4fd8] px-5 py-3 text-sm font-bold text-white hover:bg-[#2d3fc7]">
          <Plus size={17} />
          Add Technician
        </button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['TOTAL', String(summaryCounts.total)],
          ['ACTIVE', String(summaryCounts.active)],
          ['OFF DUTY', String(summaryCounts.offDuty)],
          ['ON LEAVE', String(summaryCounts.onLeave)],
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
            placeholder="Search..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]"
          />
        </div>

        <label className="status-filter-container relative">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as StatusFilter)}
          className="admin-filter-dropdown status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]"
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
        </label>
        <button type="button" onClick={() => setShowArchived((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600">{showArchived ? "Active" : "Archived"}</button>
        <span className="ml-auto text-sm text-slate-400">{visibleTechnicians.length} records</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {['TECHNICIAN ID', 'Name', 'Email', 'Contact', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {visibleTechnicians.map((technician) => (
                <tr key={technician.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-slate-900">{technician.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatPersonName(technician.name)}</td>
                  <td className="px-5 py-4 text-slate-700">{technician.email}</td>
                  <td className="px-5 py-4 text-slate-700">{technician.contact || '—'}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[technician.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
                    >
                      {technician.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3 text-xs font-semibold">
                      {!technician.archived && <button onClick={() => openEditModal(technician)} className="text-[#2563eb]">Edit</button>}
                      {!technician.archived && <button onClick={() => void archiveTechnician(technician)} className="text-slate-500">Archive</button>}
                      {technician.archived && <>
                        <button onClick={() => void unarchiveTechnician(technician)} className="text-[#2563eb]">Unarchive</button>
                        <button onClick={() => void deleteTechnician(technician)} className="text-red-500">Delete</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5" onMouseDown={() => setIsModalOpen(false)}>
          <form onSubmit={saveTechnician} onMouseDown={(event) => event.stopPropagation()} className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <h2 className="text-lg font-bold">{editingTechnician ? 'Edit Technician' : 'Add Technician'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-scroll">
              <div className="space-y-5 px-6 py-6">
              {(() => { const name = splitName(editingTechnician?.name || ''); return <>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">First name *<input name="firstName" required defaultValue={name.firstName} placeholder="Juan" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]" /></label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Middle name (optional)<input name="middleName" defaultValue={name.middleName} placeholder="Santos" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]" /></label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Last name *<input name="lastName" required defaultValue={name.lastName} placeholder="dela Cruz" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]" /></label>
              </>; })()}
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email *<input name="email" required type="email" defaultValue={editingTechnician?.email || ''} placeholder="email@skytech.net" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]" /></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Contact *<input name="contact" required defaultValue={editingTechnician?.contact || ''} placeholder="09XXXXXXXXX" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]" /></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Status<select name="status" defaultValue={editingTechnician?.status || 'Active'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"><option>Active</option><option>Off Duty</option><option>On Leave</option></select></label>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">{isSaving ? 'Saving...' : editingTechnician ? 'Save changes' : 'Add Technician'}</button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
