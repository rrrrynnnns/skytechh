'use client';

import { ChevronDown, ChevronRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Account = { id: string; name: string; email: string; contact: string; address: string; province?: string | null; city?: string | null; barangay?: string | null; street?: string | null; zipCode?: string | null };
type LocationOption = { code: string; name: string; regionCode?: string; provinceCode?: string | false };
type ProfileForm = { email: string; contact: string; firstName: string; middleName: string; lastName: string; addressLine1: string; addressLine2: string; street: string; province: string; city: string; barangay: string; zipCode: string };

const PSGC_API = 'https://psgc.gitlab.io/api';
const emptyForm: ProfileForm = { email: '', contact: '', firstName: '', middleName: '', lastName: '', addressLine1: '', addressLine2: '', street: '', province: '', city: '', barangay: '', zipCode: '' };

function sortLocations(options: LocationOption[]) { return [...options].sort((first, second) => first.name.localeCompare(second.name, 'en', { sensitivity: 'base' })); }
function getForm(account: Account): ProfileForm { const parts = account.name.trim().split(/\s+/); const firstName = parts.shift() || ''; const lastName = parts.pop() || ''; return { ...emptyForm, firstName, middleName: parts.join(' '), lastName, email: account.email, contact: account.contact, addressLine1: account.address, street: account.street || '', province: account.province || '', city: account.city || '', barangay: account.barangay || '', zipCode: account.zipCode || '' }; }
function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function LocationDropdown({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: string;
  options: LocationOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left text-sm outline-none transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400'
            : 'border-slate-200 bg-slate-50/50 text-slate-900 hover:border-slate-300 focus:border-[#2166f3] focus:bg-white focus:ring-2 focus:ring-blue-100'
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>{value || placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-[#2166f3]' : ''}`}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                onChange(option.name);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                option.name === value
                  ? 'bg-blue-50 font-semibold text-[#2166f3]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function SubscriberProfilePage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);

  useEffect(() => { fetch('/api/account').then((response) => response.json()).then((result) => { if (result.data) { setAccount(result.data); setForm(getForm(result.data)); } }).catch(() => setError('Unable to load profile details.')); }, []);
  useEffect(() => { Promise.all([fetch(`${PSGC_API}/provinces/`).then((response) => response.json()), fetch(`${PSGC_API}/regions/130000000/cities-municipalities/`).then((response) => response.json())]).then(([provinceOptions, ncrCities]) => { setProvinces(sortLocations([{ code: '130000000', name: 'NCR (Metro Manila)', regionCode: '130000000', provinceCode: false }, ...provinceOptions])); if (form.province === 'NCR (Metro Manila)') setCities(sortLocations(ncrCities)); }).catch(() => setError('Unable to load Philippine locations.')); }, [form.province]);
  useEffect(() => { const province = provinces.find((option) => option.name === form.province); if (!province || province.provinceCode === false) return; fetch(`${PSGC_API}/provinces/${province.code}/cities-municipalities/`).then((response) => response.json()).then((options: LocationOption[]) => setCities(sortLocations(options))).catch(() => setError('Unable to load cities.')); }, [form.province, provinces]);
  useEffect(() => { const city = cities.find((option) => option.name === form.city); if (!city) return; fetch(`${PSGC_API}/cities-municipalities/${city.code}/barangays/`).then((response) => response.json()).then((options: LocationOption[]) => setBarangays(sortLocations(options))).catch(() => setError('Unable to load barangays.')); }, [form.city, cities]);

  function updateField(field: keyof ProfileForm, value: string) { setForm((current) => ({ ...current, [field]: value, ...(field === 'province' ? { city: '', barangay: '' } : {}), ...(field === 'city' ? { barangay: '' } : {}) })); }
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!account) return; const name = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '); const address = [form.addressLine1, form.addressLine2, form.street, form.barangay, form.city, form.province, form.zipCode].filter(Boolean).join(', '); const response = await fetch(`/api/subscribers/${account.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email: form.email, contact: form.contact, address, province: form.province, city: form.city, barangay: form.barangay, street: form.street, zipCode: form.zipCode }) }); const result = await response.json(); if (!response.ok || !result.data) { setError(result.error || 'Unable to save profile details.'); return; } setAccount(result.data); setForm(getForm(result.data)); setIsEditing(false); }
  async function changePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget)); if (values.newPassword !== values.confirmPassword) { setError('New passwords do not match.'); return; } const response = await fetch('/api/account/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) }); const result = await response.json(); if (!response.ok) { setError(result.error || 'Unable to change password.'); return; } setIsChangingPassword(false); }
  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.assign('/login');
  }

  const displayName = formatPersonName(account?.name || 'Loading...');
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const provinceOptions = Array.from(new Map([...provinces, ...(form.province ? [{ code: 'saved-province', name: form.province }] : [])].map((option) => [option.name, option])).values());
  const cityOptions = Array.from(new Map([...cities, ...(form.city ? [{ code: 'saved-city', name: form.city }] : [])].map((option) => [option.name, option])).values());
  const barangayOptions = Array.from(new Map([...barangays, ...(form.barangay ? [{ code: 'saved-barangay', name: form.barangay }] : [])].map((option) => [option.name, option])).values());

  if (isChangingPassword) {
    return (
      <PortalShell role="subscriber">
        <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#eef4fb] lg:h-auto lg:min-h-screen">
          <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 py-4 text-slate-800 sm:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => {
                setIsChangingPassword(false);
                setError('');
              }}
              aria-label="Back to profile"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg text-slate-600 transition-colors hover:bg-slate-50"
            >
              &lsaquo;
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile &amp; Security</p>
              <h1 className="text-base font-bold text-slate-900">Change password</h1>
            </div>
          </header>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-8 lg:px-10 lg:py-10">
            <form
              onSubmit={changePassword}
              className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2166f3]">
                  <LockKeyhole size={24} />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950">Update your password</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Keep your Sky-Tech subscriber account secure.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  ['currentPassword', 'Current password', 'Enter current password'],
                  ['newPassword', 'New password', 'At least 8 characters'],
                  ['confirmPassword', 'Confirm new password', 'Re-enter new password'],
                ].map(([name, label, placeholder]) => {
                  const isVisible = visiblePasswords[name];
                  return (
                    <label key={name} className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                      <div className="relative mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 transition focus-within:border-[#2166f3] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                        <input
                          required
                          minLength={name === 'currentPassword' ? undefined : 8}
                          type={isVisible ? 'text' : 'password'}
                          name={name}
                          placeholder={placeholder}
                          className="min-w-0 flex-1 border-0 bg-transparent pr-8 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setVisiblePasswords((current) => ({ ...current, [name]: !isVisible }))}
                          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                          className="rounded-lg p-1 text-slate-400 transition-colors hover:text-[#2166f3]"
                        >
                          {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-700">Password requirements</p>
                <p className="mt-1">• Minimum of 8 characters</p>
                <p>• New password and confirmation must match</p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setError('');
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto sm:flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[#2166f3] px-5 text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-colors hover:bg-[#1d57d6] sm:w-auto sm:flex-[1.5]"
                >
                  Change password
                </button>
              </div>
            </form>
          </div>
        </div>
      </PortalShell>
    );
  }

  if (isEditing) {
    const fieldClass =
      'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#2166f3] focus:bg-white focus:ring-2 focus:ring-blue-100';
    return (
      <PortalShell role="subscriber">
        <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#eef4fb] lg:h-auto lg:min-h-screen">
          <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 py-4 text-slate-800 sm:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError('');
              }}
              aria-label="Back to profile"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg text-slate-600 transition-colors hover:bg-slate-50"
            >
              &lsaquo;
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile &amp; Account</p>
              <h1 className="text-base font-bold text-slate-900">Profile details</h1>
            </div>
          </header>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-8 lg:px-10 lg:py-10">
            <form
              onSubmit={saveProfile}
              className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
            >
              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2166f3] text-lg font-bold text-white shadow-xs">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-950">{displayName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {account?.id && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#2166f3]">
                        {account.id}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500">Sky-Tech Subscriber</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <span>Email address</span>
                      <span className="text-[10px] font-medium normal-case tracking-normal text-slate-400">Read-only</span>
                    </span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      readOnly
                      tabIndex={-1}
                      className="mt-1.5 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 text-sm text-slate-500 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact number</span>
                    <input
                      required
                      value={form.contact}
                      onChange={(event) => updateField('contact', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">First name</span>
                    <input
                      required
                      value={form.firstName}
                      onChange={(event) => updateField('firstName', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Middle name</span>
                    <input
                      value={form.middleName}
                      onChange={(event) => updateField('middleName', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last name</span>
                    <input
                      required
                      value={form.lastName}
                      onChange={(event) => updateField('lastName', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Address Line 1</span>
                    <input
                      required
                      value={form.addressLine1}
                      onChange={(event) => updateField('addressLine1', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Address Line 2</span>
                    <input
                      value={form.addressLine2}
                      onChange={(event) => updateField('addressLine2', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Province/State">
                    <LocationDropdown
                      value={form.province}
                      options={provinceOptions}
                      placeholder="Choose an option"
                      onChange={(value) => updateField('province', value)}
                    />
                  </Field>
                  <Field label="City/Municipality">
                    <LocationDropdown
                      value={form.city}
                      options={cityOptions}
                      placeholder="Choose an option"
                      disabled={!form.province}
                      onChange={(value) => updateField('city', value)}
                    />
                  </Field>
                  <Field label="Barangay">
                    <LocationDropdown
                      value={form.barangay}
                      options={barangayOptions}
                      placeholder="Choose an option"
                      disabled={!form.city}
                      onChange={(value) => updateField('barangay', value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Street</span>
                    <input
                      value={form.street}
                      onChange={(event) => updateField('street', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zip code</span>
                    <input
                      required
                      value={form.zipCode}
                      onChange={(event) => updateField('zipCode', event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError('');
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto sm:flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[#2166f3] px-5 text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-colors hover:bg-[#1d57d6] sm:w-auto sm:flex-[1.5]"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </PortalShell>
    );
  }

  return <PortalShell role="subscriber"><div className="min-h-[calc(100dvh-4rem)] bg-white"><section className="border-b border-slate-100 px-5 pb-9 pt-11 text-center sm:px-8"><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#2161e8] text-3xl font-bold text-white">{initials}</span><h1 className="mt-5 text-2xl font-bold text-[#24417e]">{displayName}</h1><p className="mt-1 text-lg font-bold text-[#2161e8]">{account?.id || ''}</p><p className="mt-1 text-sm text-slate-500">Sky-Tech Subscriber</p></section><main className="mx-auto max-w-7xl"><section><button onClick={() => setIsEditing(true)} className="flex w-full items-center gap-4 border-b border-slate-100 px-5 py-5 text-left text-base text-slate-600 hover:bg-slate-50 sm:px-8 lg:px-10">  <UserRound size={21} /><span className="flex-1">Profile details</span><ChevronRight size={18} /></button><button onClick={() => { setError(''); setIsChangingPassword(true); }} className="flex w-full items-center gap-4 border-b border-slate-100 px-5 py-5 text-left text-base text-slate-600 hover:bg-slate-50 sm:px-8 lg:px-10"><LockKeyhole size={21} /><span className="flex-1">Change password</span><ChevronRight size={18} /></button></section><div className="px-5 pb-32 pt-7 sm:px-8 lg:px-10"><button onClick={handleSignOut} className="w-full rounded-2xl border border-red-200 bg-red-50 py-4 text-base font-bold text-red-600">Sign Out</button></div></main></div></PortalShell>;
}
