'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Mail,
  Megaphone,
  Power,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type Settings = {
  enabled: boolean;
  category: string;
  impact: string;
  title: string;
  description: string;
  startsAt: string;
  restoresAt: string;
  dispatchEmail: boolean;
};

type Announcement = {
  id: string;
  title: string;
  description: string;
  impact: string;
  sentCount: number;
  createdAt: string;
};

const initialSettings: Settings = {
  enabled: false,
  category: 'Scheduled Network Maintenance',
  impact: 'Slow Internet / High Latency Advisory',
  title: 'Network Maintenance Notice',
  description:
    'We are conducting fiber optical network maintenance. Internet speeds may be degraded or temporarily unavailable.',
  startsAt: '',
  restoresAt: '',
  dispatchEmail: true,
};

const presets: { label: string; values: Partial<Settings> }[] = [
  {
    label: 'Scheduled Maintenance',
    values: {
      category: 'Scheduled Network Maintenance',
      impact: 'Slow Internet / High Latency Advisory',
      title: 'Scheduled Fiber Network Maintenance',
      description:
        'Our engineering team will perform scheduled fiber core maintenance to improve network stability. Subscribers may experience brief latency spikes during this window.',
    },
  },
  {
    label: 'Emergency Fiber Repair',
    values: {
      category: 'Emergency Fiber Cable Repair',
      impact: 'Internet Disabled / Total Outage',
      title: 'Emergency Fiber Cut Repair Advisory',
      description:
        'An unexpected fiber line cut has been detected in your area. Our field technicians are already on-site splicing and restoring connectivity as quickly as possible.',
    },
  },
  {
    label: 'Service Restored',
    values: {
      category: 'Custom Maintenance Announcement',
      impact: 'Slow Internet / High Latency Advisory',
      title: 'Network Service Fully Restored',
      description:
        'Maintenance and line restoration work is now complete. All fiber services are operating normally. Please restart your ONU/router if you still experience issues.',
    },
  },
];

function toInputDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function formatPreviewDateTime(value: string) {
  if (!value) return 'To be announced';
  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MaintenancePage() {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeSubscriberCount, setActiveSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMaintenance = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await fetch('/api/maintenance', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load maintenance settings.');
      const value = result.data?.settings;
      if (value) {
        setSettings({
          enabled: Boolean(value.enabled),
          category: typeof value.category === 'string' ? value.category : initialSettings.category,
          impact: typeof value.impact === 'string' ? value.impact : initialSettings.impact,
          title: typeof value.title === 'string' ? value.title : initialSettings.title,
          description: typeof value.description === 'string' ? value.description : initialSettings.description,
          startsAt: toInputDate(value.startsAt),
          restoresAt: toInputDate(value.restoresAt),
          dispatchEmail: true,
        });
      }
      setAnnouncements(Array.isArray(result.data?.announcements) ? result.data.announcements : []);
      setActiveSubscriberCount(Number(result.data?.activeSubscriberCount || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load maintenance settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMaintenance(false);
  }, [loadMaintenance]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmMaintenance(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function update(field: keyof Settings, value: string | boolean) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function applyPreset(values: Partial<Settings>) {
    setSettings((current) => ({ ...current, ...values }));
    setMessage('');
  }

  function requestMaintenanceChange() {
    setConfirmMaintenance(!settings.enabled);
  }

  async function confirmMaintenanceChange() {
    if (confirmMaintenance === null) return;
    const nextEnabled = confirmMaintenance;
    const nextSettings = { ...settings, enabled: nextEnabled };
    setTogglingMaintenance(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update maintenance mode.');
      setSettings(nextSettings);
      setConfirmMaintenance(null);
      setMessage(
        nextEnabled
          ? 'Portal maintenance mode enabled. Subscriber and technician logins are now locked.'
          : 'Portal maintenance mode disabled. Normal subscriber and technician access restored.',
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update maintenance mode.');
      setConfirmMaintenance(null);
    } finally {
      setTogglingMaintenance(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save maintenance settings.');
      setMessage('Maintenance settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save maintenance settings.');
    } finally {
      setSaving(false);
    }
  }

  async function sendAnnouncement() {
    setSending(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send announcement.');
      setAnnouncements((current) => [result.data, ...current]);
      setMessage(`Announcement sent to ${result.data.sentCount} active subscriber accounts.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send announcement.');
    } finally {
      setSending(false);
    }
  }

  const totalNotificationsSent = useMemo(
    () => announcements.reduce((sum, item) => sum + (item.sentCount || 0), 0),
    [announcements],
  );

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Maintenance &amp; Broadcasts</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  settings.enabled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${settings.enabled ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                {settings.enabled ? 'Maintenance Mode On' : 'Normal Operations'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Publish network advisories, control subscriber portal lockouts, and broadcast email alerts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadMaintenance(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={sendAnnouncement}
              disabled={loading || sending || !settings.title.trim() || !settings.description.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-sm font-semibold text-[#2166f3] transition-colors hover:bg-blue-100/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              {sending ? 'Sending...' : 'Broadcast'}
            </button>
            <button
              type="submit"
              form="maintenance-form"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6] disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save & Apply'}
            </button>
          </div>
        </div>

        {(message || error) && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {error ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
              <span>{error || message}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => {
                setError('');
                setMessage('');
              }}
              className="rounded-lg p-1 opacity-70 hover:opacity-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={requestMaintenanceChange}
            disabled={loading}
            className={`admin-stat-card rounded-xl border px-5 py-4 text-left transition-all ${
              settings.enabled
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Portal Mode</p>
                <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-950">
                  {loading ? (
                    <span className="inline-block h-6 w-24 animate-pulse rounded bg-slate-100" />
                  ) : settings.enabled ? (
                    'Locked'
                  ) : (
                    'Normal'
                  )}
                </p>
              </div>
              <span
                className={`admin-stat-icon grid h-10 w-10 place-items-center rounded-xl ${
                  settings.enabled ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <ShieldAlert size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Click to {settings.enabled ? 'disable' : 'enable'}</p>
          </button>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Target Subscribers</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" />
                  ) : (
                    activeSubscriberCount
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Users size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Active accounts reachable</p>
          </div>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Broadcasts Sent</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-100" />
                  ) : (
                    announcements.length
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Megaphone size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{totalNotificationsSent} total alerts delivered</p>
          </div>

          <button
            type="button"
            onClick={() => update('dispatchEmail', !settings.dispatchEmail)}
            disabled={loading}
            className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Email Dispatch</p>
                <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-950">
                  {loading ? (
                    <span className="inline-block h-6 w-20 animate-pulse rounded bg-slate-100" />
                  ) : settings.dispatchEmail ? (
                    'Enabled'
                  ) : (
                    'In-App Only'
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Mail size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Click to toggle email alerts</p>
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
            <div className="space-y-5">
              <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
              <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
            </div>
            <div className="space-y-5">
              <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
              <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
            </div>
          </div>
        ) : (
          <form id="maintenance-form" onSubmit={save} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,.85fr)]">
            <div className="min-w-0 space-y-5">
              <section
                className={`rounded-xl border p-5 transition-colors ${
                  settings.enabled ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        settings.enabled ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Power size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-sm font-bold text-slate-900">
                          Portal Maintenance Mode (Subscribers &amp; Technicians)
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            settings.enabled ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {settings.enabled ? 'ACTIVE / LOCKED' : 'DISABLED / NORMAL'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {settings.enabled
                          ? 'Subscriber & technician logins are locked. Non-admin users will be blocked and shown this active maintenance advisory.'
                          : 'All subscriber and technician accounts have full access to login, view bills, manage tasks, and file requests.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={settings.enabled}
                    aria-label="Toggle subscriber maintenance mode"
                    onClick={requestMaintenanceChange}
                    className={`relative h-7 w-14 shrink-0 rounded-full transition-colors ${
                      settings.enabled ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        settings.enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Maintenance Announcement Details</h2>
                    <p className="text-xs text-slate-400">
                      Configure the notice and publish an alert to active subscribers
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset.values)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#2166f3]"
                      >
                        <Sparkles size={11} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Maintenance category
                      </span>
                      <select
                        value={settings.category}
                        onChange={(event) => update('category', event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                      >
                        <option>Slow Internet Advisory</option>
                        <option>Emergency Fiber Cable Repair</option>
                        <option>Scheduled Network Maintenance</option>
                        <option>Total Internet Outage / Line Shutdown</option>
                        <option>Power Substation Maintenance</option>
                        <option>Custom Maintenance Announcement</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Subscriber impact
                      </span>
                      <select
                        value={settings.impact}
                        onChange={(event) => update('impact', event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                      >
                        <option>Slow Internet / High Latency Advisory</option>
                        <option>Internet Disabled / Total Outage</option>
                        <option>Intermittent Fluctuations / Core Splicing</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Announcement title / email subject
                    </span>
                    <input
                      required
                      value={settings.title}
                      onChange={(event) => update('title', event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Announcement description &amp; instructions
                    </span>
                    <textarea
                      required
                      rows={5}
                      value={settings.description}
                      onChange={(event) => update('description', event.target.value)}
                      className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                    />
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Maintenance start window
                      </span>
                      <input
                        type="datetime-local"
                        value={settings.startsAt}
                        onChange={(event) => update('startsAt', event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Estimated restoration
                      </span>
                      <input
                        type="datetime-local"
                        value={settings.restoresAt}
                        onChange={(event) => update('restoresAt', event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                      />
                    </label>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.dispatchEmail}
                      onChange={(event) => update('dispatchEmail', event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#2166f3]"
                    />
                    <span>
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <Mail size={15} className="text-[#2166f3]" />
                        Automatically dispatch email announcement to all subscribers
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Sends a branded HTML notice to registered subscriber emails and creates in-app notification
                        alerts.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                  <button
                    type="button"
                    onClick={sendAnnouncement}
                    disabled={sending || !settings.title.trim() || !settings.description.trim()}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2166f3] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={15} />
                    {sending ? 'Sending...' : 'Broadcast to subscribers'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1d57d6] disabled:opacity-60"
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save & Apply Maintenance'}
                  </button>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Subscriber Preview</h2>
                    <p className="text-xs text-slate-400">Live advisory card &amp; email header</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2166f3]">
                    Live Preview
                  </span>
                </div>
                <div className="p-5">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="bg-[#172554] px-5 py-4 text-center text-white">
                      <p className="text-sm font-bold tracking-wide">SKY-TECH FIBER</p>
                      <p className="mt-0.5 text-[11px] text-blue-200">Official Service Advisory</p>
                    </div>
                    <div
                      className={`px-4 py-2 text-center text-xs font-semibold ${
                        settings.impact.includes('Disabled')
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {settings.impact}
                    </div>
                    <div className="space-y-3 p-5">
                      <h3 className="text-sm font-bold text-slate-900">
                        {settings.title || 'Announcement title'}
                      </h3>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {settings.description || 'Announcement details will appear here.'}
                      </p>
                      <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-700">Category:</span> {settings.category}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock size={12} className="shrink-0 text-slate-400" />
                          <span>
                            <span className="font-semibold text-slate-700">Starts:</span>{' '}
                            {formatPreviewDateTime(settings.startsAt)}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock size={12} className="shrink-0 text-slate-400" />
                          <span>
                            <span className="font-semibold text-slate-700">Est. restoration:</span>{' '}
                            {formatPreviewDateTime(settings.restoresAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <BellRing size={15} className="text-[#2166f3]" />
                    <h2 className="text-sm font-bold text-slate-900">Broadcast Log</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {announcements.length} sent
                  </span>
                </div>
                <div className="max-h-96 space-y-2.5 overflow-y-auto p-4">
                  {announcements.length ? (
                    announcements.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:border-slate-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2166f3]">
                            {item.sentCount} sent
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="truncate">{item.impact}</span>
                          <span className="shrink-0">{new Date(item.createdAt).toLocaleString('en-PH')}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">No announcements broadcast yet.</p>
                  )}
                </div>
              </section>
            </div>
          </form>
        )}

        {confirmMaintenance !== null && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-confirm-title"
            onMouseDown={() => !togglingMaintenance && setConfirmMaintenance(null)}
          >
            <div
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3.5">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                      confirmMaintenance ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {confirmMaintenance ? <ShieldAlert size={22} /> : <CheckCircle2 size={22} />}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Portal Access Control
                    </p>
                    <h2 id="maintenance-confirm-title" className="text-lg font-bold text-slate-900">
                      {confirmMaintenance ? 'Enable maintenance mode?' : 'Disable maintenance mode?'}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={togglingMaintenance}
                  aria-label="Close confirmation"
                  onClick={() => setConfirmMaintenance(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  {confirmMaintenance
                    ? 'Enabling maintenance mode immediately restricts portal access for non-admin accounts while preserving admin controls.'
                    : 'Disabling maintenance mode restores full portal access for all subscribers and technicians.'}
                </p>

                {confirmMaintenance ? (
                  <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold uppercase tracking-wider text-rose-700">Active Advisory</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                        {settings.impact}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {settings.title || 'Scheduled Network Maintenance'}
                    </p>
                    <ul className="space-y-1.5 text-slate-600">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Subscriber &amp; technician logins are locked immediately
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Active sessions see the maintenance notice screen
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Admin portal remains fully accessible
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-slate-600">
                    <p className="font-bold uppercase tracking-wider text-emerald-700">What happens next</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Subscriber &amp; technician logins are unlocked immediately
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Maintenance lockout screen is removed from portals
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                <button
                  type="button"
                  disabled={togglingMaintenance}
                  onClick={() => setConfirmMaintenance(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={togglingMaintenance}
                  onClick={() => void confirmMaintenanceChange()}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-60 ${
                    confirmMaintenance ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2166f3] hover:bg-[#1d57d6]'
                  }`}
                >
                  {togglingMaintenance ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Applying...
                    </>
                  ) : confirmMaintenance ? (
                    'Enable maintenance'
                  ) : (
                    'Disable maintenance'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
