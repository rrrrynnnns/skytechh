'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type Plan = { name: string; speedMbps: number; price: number };
type Settings = {
  companyName: string;
  companyEmail: string;
  phone: string;
  address: string;
  lateFeePercent: number;
  gracePeriodDays: number;
  billingDay: number;
  plans: Plan[];
};

const blank: Settings = {
  companyName: '',
  companyEmail: '',
  phone: '',
  address: '',
  lateFeePercent: 0,
  gracePeriodDays: 0,
  billingDay: 1,
  plans: [],
};

function normalizePlans(value: unknown): Plan[] {
  if (!Array.isArray(value)) return [];
  return value.map((plan: { name?: string; speedMbps?: number; speed?: string | number; price?: number }) => {
    const name = plan.name || '';
    return {
      name,
      speedMbps: Number(
        plan.speedMbps || String(plan.speed ?? '').replace(/[^0-9.]/g, '') || name.match(/[0-9]+/)?.[0] || 0,
      ),
      price: Number(plan.price || 0),
    };
  });
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(blank);
  const [planDraft, setPlanDraft] = useState<Plan | null>(null);
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ plan: Plan; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load settings.');
      if (result.data) {
        setSettings({ ...blank, ...result.data, plans: normalizePlans(result.data.plans) });
      }
      setDirty(false);
      setSaved(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings(false);
  }, [loadSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlanDraft(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function setField(field: keyof Omit<Settings, 'plans'>, value: string) {
    setSettings((current) => ({
      ...current,
      [field]: ['lateFeePercent', 'gracePeriodDays', 'billingDay'].includes(field) ? Number(value) : value,
    }));
    setSaved(false);
    setDirty(true);
  }

  function savePlanDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planDraft) return;
    setSettings((current) => ({
      ...current,
      plans:
        planIndex === null
          ? [...current.plans, planDraft]
          : current.plans.map((plan, index) => (index === planIndex ? planDraft : plan)),
    }));
    setPlanDraft(null);
    setPlanIndex(null);
    setSaved(false);
    setDirty(true);
  }

  function openNewPlan() {
    setPlanIndex(null);
    setPlanDraft({ name: '', speedMbps: 0, price: 0 });
  }

  function openEditPlan(plan: Plan, index: number) {
    setPlanIndex(index);
    setPlanDraft({ ...plan });
  }

  function confirmDeletePlan() {
    if (!deleteTarget) return;
    setSettings((current) => ({
      ...current,
      plans: current.plans.filter((_, idx) => idx !== deleteTarget.index),
    }));
    setDeleteTarget(null);
    setSaved(false);
    setDirty(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.');
      setSettings({ ...settings, ...result.data, plans: normalizePlans(result.data?.plans || settings.plans) });
      setSaved(true);
      setDirty(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const planSummary = useMemo(() => {
    if (!settings.plans.length) {
      return { count: 0, speedRange: 'No plans configured', lowestPrice: 0, lowestPlanName: 'No plans yet' };
    }
    const speeds = settings.plans.map((p) => p.speedMbps);
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    const sortedByPrice = [...settings.plans].sort((a, b) => a.price - b.price);
    return {
      count: settings.plans.length,
      speedRange: minSpeed === maxSpeed ? `${minSpeed} Mbps` : `${minSpeed}–${maxSpeed} Mbps`,
      lowestPrice: sortedByPrice[0]?.price ?? 0,
      lowestPlanName: sortedByPrice[0]?.name || 'Base plan',
    };
  }, [settings.plans]);

  const textField = (
    label: string,
    name: keyof Omit<Settings, 'plans'>,
    options?: { type?: string; placeholder?: string; min?: number; max?: number; step?: string; hint?: string },
  ) => (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={options?.type ?? 'text'}
        min={options?.min}
        max={options?.max}
        step={options?.step}
        placeholder={options?.placeholder}
        value={settings[name] as string | number}
        onChange={(event) => setField(name, event.target.value)}
        required
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#2166f3]"
      />
      {options?.hint && <span className="mt-1.5 block text-xs text-slate-400">{options.hint}</span>}
    </label>
  );

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Settings</h1>
              {dirty && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              {saved && !dirty && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check size={12} />
                  Saved
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage company information, billing rules, and internet plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSettings(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="submit"
              form="admin-settings-form"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6] disabled:opacity-60"
            >
              {saved && !dirty ? <Check size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved && !dirty ? 'Saved' : 'Save settings'}
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
              onClick={() => void loadSettings(true)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition-colors hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Internet Plans</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : planSummary.count}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Wifi size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{planSummary.speedRange}</p>
          </div>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Starting Price</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-20 animate-pulse rounded bg-slate-100" />
                  ) : (
                    `₱${planSummary.lowestPrice.toLocaleString()}`
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Receipt size={18} />
              </span>
            </div>
            <p className="mt-3 truncate text-xs font-medium text-slate-500">{planSummary.lowestPlanName}</p>
          </div>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Billing Cycle</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" />
                  ) : (
                    `Day ${settings.billingDay}`
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarDays size={18} />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {settings.gracePeriodDays}d grace · {settings.lateFeePercent}% late fee
            </p>
          </div>

          <div className="admin-stat-card rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">Company Profile</p>
                <p className="mt-1.5 truncate text-lg font-bold tracking-tight text-slate-950">
                  {loading ? (
                    <span className="inline-block h-7 w-28 animate-pulse rounded bg-slate-100" />
                  ) : (
                    settings.companyName || 'Not set'
                  )}
                </p>
              </div>
              <span className="admin-stat-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Building2 size={18} />
              </span>
            </div>
            <p className="mt-3 truncate text-xs font-medium text-slate-500">
              {settings.companyEmail || 'No email configured'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form id="admin-settings-form" onSubmit={save} className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
                  <Building2 size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Company Information</h2>
                  <p className="text-xs text-slate-400">
                    Shown on subscriber invoices, receipts, and portal communications
                  </p>
                </div>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                {textField('Company name', 'companyName', { placeholder: 'SkyTech Fiber Internet' })}
                {textField('Company email', 'companyEmail', { type: 'email', placeholder: 'billing@skytech.ph' })}
                {textField('Phone', 'phone', { placeholder: '+63 900 000 0000' })}
                {textField('Address', 'address', { placeholder: '123 Fiber Ave, Metro Manila' })}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <Receipt size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Billing Rules</h2>
                  <p className="text-xs text-slate-400">
                    Automated monthly statement generation and overdue penalty rules
                  </p>
                </div>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-3">
                {textField('Late fee (%)', 'lateFeePercent', {
                  type: 'number',
                  min: 0,
                  max: 100,
                  step: '0.1',
                  hint: 'Applied after the grace period ends',
                })}
                {textField('Grace period (days)', 'gracePeriodDays', {
                  type: 'number',
                  min: 0,
                  max: 60,
                  hint: 'Days after due date before penalty',
                })}
                {textField('Billing day', 'billingDay', {
                  type: 'number',
                  min: 1,
                  max: 28,
                  hint: 'Day of each month (1–28)',
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <Wifi size={17} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">Internet Plans</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {settings.plans.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Manage available subscriber fiber tiers and monthly rates</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openNewPlan}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2166f3] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1d57d6]"
                >
                  <Plus size={15} />
                  Add plan
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3.5">Plan Name</th>
                      <th className="px-6 py-3.5">Speed</th>
                      <th className="px-6 py-3.5">Price / Month</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.plans.length ? (
                      settings.plans.map((plan, index) => (
                        <tr
                          className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                          key={`${plan.name}-${index}`}
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              <Wifi size={12} />
                              {plan.speedMbps} Mbps
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold tabular-nums text-slate-700">
                            ₱{plan.price.toLocaleString()}
                            <span className="text-xs font-normal text-slate-400"> / mo</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditPlan(plan, index)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#2166f3]"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ plan, index })}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center">
                          <p className="text-sm font-semibold text-slate-700">No internet plans configured</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Add your first plan so subscribers can select a tier when booking.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4">
              <p className="text-xs text-slate-500">
                {dirty
                  ? 'You have unsaved changes. Save to apply them across the portal.'
                  : 'All settings are up to date.'}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6] disabled:opacity-60"
              >
                {saved && !dirty ? <Check size={16} /> : <Save size={16} />}
                {saving ? 'Saving...' : saved && !dirty ? 'Saved' : 'Save settings'}
              </button>
            </div>
          </form>
        )}

        {planDraft && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-[1px]"
            onMouseDown={() => setPlanDraft(null)}
          >
            <form
              onSubmit={savePlanDraft}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {planIndex === null ? 'Add Internet Plan' : 'Edit Internet Plan'}
                  </h2>
                  <p className="text-xs text-slate-400">Configure tier name, speed, and monthly rate</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPlanDraft(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plan Name</span>
                  <input
                    autoFocus
                    required
                    placeholder="e.g. Fiber 100"
                    value={planDraft.name}
                    onChange={(event) => setPlanDraft({ ...planDraft, name: event.target.value })}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Speed (Mbps)</span>
                    <input
                      required
                      min="1"
                      type="number"
                      placeholder="100"
                      value={planDraft.speedMbps || ''}
                      onChange={(event) => setPlanDraft({ ...planDraft, speedMbps: Number(event.target.value) })}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Price / Month (₱)
                    </span>
                    <input
                      required
                      min="0"
                      type="number"
                      placeholder="1499"
                      value={planDraft.price || ''}
                      onChange={(event) => setPlanDraft({ ...planDraft, price: Number(event.target.value) })}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#2166f3]"
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setPlanDraft(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2166f3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d57d6]"
                >
                  {planIndex === null ? 'Add Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {deleteTarget && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-[1px]"
            onMouseDown={() => setDeleteTarget(null)}
          >
            <div
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <h3 className="text-base font-bold text-slate-900">Delete internet plan?</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Remove <span className="font-semibold text-slate-700">{deleteTarget.plan.name}</span> (
                {deleteTarget.plan.speedMbps} Mbps · ₱{deleteTarget.plan.price.toLocaleString()}/mo) from your plan
                list? Remember to click <span className="font-semibold text-slate-700">Save settings</span> to persist
                this change.
              </p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePlan}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Delete plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
