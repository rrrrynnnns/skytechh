'use client';

import { useEffect, useState } from 'react';
import { History, LoaderCircle } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type AuditLog = {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'Viewed', resource: 'System Audit Logs' }),
        });
        const response = await fetch('/api/audit-logs', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load system audit logs.');
        if (!Array.isArray(result.data)) throw new Error('Unable to load system audit logs.');
        setLogs(result.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load system audit logs.');
      } finally {
        setLoading(false);
      }
    }
    void loadLogs();
  }, []);

  return (
    <PortalShell role="admin">
      <div className="max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-widest text-[#3b4fd8]">System Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">System Audit Logs</h1>
        <p className="mt-2 text-slate-500">Review system-wide changes and actions across the admin portal.</p>
        {loading ? (
          <div className="mt-8 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            <LoaderCircle className="animate-spin" size={18} /> Loading system audit logs...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
        ) : logs.length === 0 ? (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-[#3b4fd8]"><History size={25} /></div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">No system audit logs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">System activity will appear here once an action is recorded.</p>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <tr><th className="px-5 py-4">Date and time</th><th className="px-5 py-4">User</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Resource</th><th className="px-5 py-4">Details</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => <tr key={log.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatTimestamp(log.createdAt)}</td><td className="px-5 py-4 font-semibold text-slate-700">{log.actorName || log.actorEmail || 'System admin'}</td><td className="px-5 py-4 font-semibold text-[#3b4fd8]">{log.action}</td><td className="px-5 py-4 text-slate-600">{log.resource}{log.resourceId ? ` · ${log.resourceId}` : ''}</td><td className="px-5 py-4 text-slate-500">{log.details || '—'}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}
