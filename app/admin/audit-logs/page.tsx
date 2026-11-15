'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  Download,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type AuditLog = {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
};

type RoleFilter = 'all' | 'admin' | 'technician' | 'subscriber';
type TimeFilter = 'all' | 'today' | '7d';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFullTimestamp(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(label: string) {
  return (
    label
      .trim()
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'SY'
  );
}

function getActionBadgeStyle(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('delete') || lower.includes('reject') || lower.includes('cancel') || lower.includes('remove')) {
    return 'bg-rose-50 text-rose-700';
  }
  if (lower.includes('create') || lower.includes('approve') || lower.includes('complete') || lower.includes('paid')) {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (lower.includes('update') || lower.includes('edit') || lower.includes('assign') || lower.includes('reschedule')) {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-blue-50 text-blue-700';
}

function getRoleBadgeStyle(role: string) {
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'bg-violet-50 text-violet-700';
  if (lower === 'technician') return 'bg-sky-50 text-sky-700';
  if (lower === 'subscriber') return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function isSameLocalDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function escapeCsvCell(value: string) {
  const safe = value.replace(/"/g, '""');
  return /[",\n]/.test(safe) ? `"${safe}"` : safe;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      if (!isRefresh) {
        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'Viewed', resource: 'System Audit Logs' }),
        });
      }
      const response = await fetch('/api/audit-logs', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load system audit logs.');
      if (!Array.isArray(result.data)) throw new Error('Unable to load system audit logs.');
      setLogs(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load system audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs(false);
  }, [loadLogs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayCount = logs.filter((log) => isSameLocalDay(new Date(log.createdAt), now)).length;
    const adminCount = logs.filter((log) => log.actorRole.toLowerCase() === 'admin').length;
    const uniqueActors = new Set(logs.map((log) => log.actorEmail || log.actorName || 'System')).size;
    const uniqueResources = new Set(logs.map((log) => log.resource).filter(Boolean)).size;
    return {
      total: logs.length,
      today: todayCount,
      admin: adminCount,
      uniqueActors,
      uniqueResources,
    };
  }, [logs]);

  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = {
      all: logs.length,
      admin: 0,
      technician: 0,
      subscriber: 0,
    };
    for (const log of logs) {
      const role = log.actorRole.toLowerCase();
      if (role === 'admin') counts.admin += 1;
      else if (role === 'technician') counts.technician += 1;
      else if (role === 'subscriber') counts.subscriber += 1;
    }
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (roleFilter !== 'all' && log.actorRole.toLowerCase() !== roleFilter) return false;

      if (timeFilter === 'today' && !isSameLocalDay(new Date(log.createdAt), now)) return false;
      if (timeFilter === '7d' && new Date(log.createdAt) < sevenDaysAgo) return false;

      if (!query) return true;
      const haystack = [
        log.actorName || '',
        log.actorEmail || '',
        log.actorRole || '',
        log.action || '',
        log.resource || '',
        log.resourceId || '',
        log.details || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [logs, roleFilter, timeFilter, search]);

  function exportCsv() {
    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Role', 'Action', 'Resource', 'Resource ID', 'Details'];
    const rows = filteredLogs.map((log) => [
      formatFullTimestamp(log.createdAt),
      log.actorName || '',
      log.actorEmail || '',
      log.actorRole,
      log.action,
      log.resource,
      log.resourceId || '',
      log.details || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skytech-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch('');
    setRoleFilter('all');
    setTimeFilter('all');
  }

  const hasActiveFilters = search.trim() !== '' || roleFilter !== 'all' || timeFilter !== 'all';

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">System Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review system-wide changes, administrative actions, and security events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadLogs(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filteredLogs.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6] disabled:opacity-60"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadLogs(true)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition-colors hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={clearFilters}
            className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Events</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" /> : stats.total}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Activity size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Click to show all events</p>
          </button>

          <button
            type="button"
            onClick={() => setTimeFilter((current) => (current === 'today' ? 'all' : 'today'))}
            className={`admin-stat-card rounded-xl border px-5 py-4 text-left transition-all ${
              timeFilter === 'today'
                ? 'border-[#2166f3] bg-blue-50/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Today&apos;s Activity</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" /> : stats.today}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarClock size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {timeFilter === 'today' ? 'Filtering today only' : 'Click to filter today'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter((current) => (current === 'admin' ? 'all' : 'admin'))}
            className={`admin-stat-card rounded-xl border px-5 py-4 text-left transition-all ${
              roleFilter === 'admin'
                ? 'border-[#2166f3] bg-blue-50/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Admin Actions</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" /> : stats.admin}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <ShieldCheck size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {roleFilter === 'admin' ? 'Filtering admin role' : 'Click to filter admin role'}
            </p>
          </button>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Unique Actors</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" />
                  ) : (
                    stats.uniqueActors
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Users size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{stats.uniqueResources} resources tracked</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative min-w-64 flex-1 sm:max-w-sm">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actor, action, resource, or details..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-9 pl-9 text-sm text-slate-900 outline-none transition-colors focus:border-[#2166f3] focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(['all', 'admin', 'technician', 'subscriber'] as RoleFilter[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      roleFilter === role
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {role} ({roleCounts[role]})
                  </button>
                ))}
              </div>

              <select
                aria-label="Timeframe filter"
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#2166f3]"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
              </select>

              <span className="text-xs font-medium text-slate-400">
                {filteredLogs.length} of {logs.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-6 py-4">
                  <span className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                  <span className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                  <span className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                  <span className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[#2166f3]">
                <History size={22} />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                {hasActiveFilters ? 'No matching audit logs' : 'No system audit logs yet'}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {hasActiveFilters
                  ? 'Try adjusting your search query, role filter, or timeframe.'
                  : 'System activity will appear here once an action is recorded.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Resource</th>
                    <th className="px-6 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const actorLabel = log.actorName || log.actorEmail || 'System admin';
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-6 py-3.5">
                          <p className="text-sm font-medium text-slate-700">{formatDate(log.createdAt)}</p>
                          <p className="text-xs text-slate-400">{formatTime(log.createdAt)}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {getInitials(actorLabel)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{actorLabel}</p>
                              {log.actorName && log.actorEmail && (
                                <p className="truncate text-xs text-slate-400">{log.actorEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleBadgeStyle(log.actorRole)}`}
                          >
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getActionBadgeStyle(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-slate-700">{log.resource}</p>
                          {log.resourceId && (
                            <p className="font-mono text-xs text-slate-400">#{log.resourceId}</p>
                          )}
                        </td>
                        <td className="max-w-xs truncate px-6 py-3.5 text-slate-500">
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedLog && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-[1px]"
            onMouseDown={() => setSelectedLog(null)}
          >
            <div
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Audit Event Details</h2>
                  <p className="text-xs text-slate-400">{formatFullTimestamp(selectedLog.createdAt)}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 px-6 py-5 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actor</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedLog.actorName || selectedLog.actorEmail || 'System admin'}
                    </p>
                    {selectedLog.actorEmail && (
                      <p className="text-xs text-slate-500">{selectedLog.actorEmail}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleBadgeStyle(selectedLog.actorRole)}`}
                    >
                      {selectedLog.actorRole}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Action</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getActionBadgeStyle(selectedLog.action)}`}
                    >
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resource</p>
                    <p className="mt-1 font-medium text-slate-800">{selectedLog.resource}</p>
                    {selectedLog.resourceId && (
                      <p className="font-mono text-xs text-slate-400">ID: {selectedLog.resourceId}</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
                  <div className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700">
                    {selectedLog.details || 'No additional details recorded for this event.'}
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
