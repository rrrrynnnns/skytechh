'use client';

import { ChevronRight, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Technician = { id: string; name: string; email: string; contact?: string | null; status: string };
type ProfileForm = { firstName: string; middleName: string; lastName: string; email: string; contact: string };

function getForm(technician: Technician): ProfileForm {
  const parts = technician.name.trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.pop() || '';
  return {
    firstName,
    middleName: parts.join(' '),
    lastName,
    email: technician.email,
    contact: technician.contact || '',
  };
}

export default function TechnicianProfilePage() {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/technician/account')
      .then((response) => response.json())
      .then((result) => {
        if (result.data) {
          setTechnician(result.data);
          setForm(getForm(result.data));
        } else {
          setError(result.error || 'Unable to load profile details.');
        }
      })
      .catch(() => setError('Unable to load profile details.'));
  }, []);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!technician || !form) return;
    setIsSaving(true);
    setError('');
    const name = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    const response = await fetch('/api/technician/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: form.email, contact: form.contact }),
    });
    const result = await response.json();
    if (!response.ok || !result.data) {
      setError(result.error || 'Unable to save profile details.');
      setIsSaving(false);
      return;
    }
    setTechnician(result.data);
    setForm(getForm(result.data));
    setIsEditing(false);
    setIsSaving(false);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  if (!technician || !form) {
    return <PortalShell role="technician"><div className="p-6 text-sm text-slate-500">{error || 'Loading profile...'}</div></PortalShell>;
  }

  const displayName = formatPersonName(technician.name);
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const inputClass = 'mt-2 w-full border-b border-slate-300 px-0 py-3 outline-none';

  if (isEditing) {
    return <PortalShell role="technician">
      <div className="min-h-screen bg-white">
        <header className="flex items-center gap-5 bg-[#eef3fb] px-5 py-4 text-[#33415c] sm:px-8 lg:px-10">
          <button type="button" onClick={() => setIsEditing(false)} aria-label="Back to profile" className="text-2xl">&lsaquo;</button>
          <span className="text-sm font-semibold tracking-widest">PROFILE</span>
        </header>
        <form onSubmit={saveProfile} className="px-5 py-7 sm:px-8 lg:px-10">
          <h1 className="text-3xl font-bold text-[#24417e]">Profile details</h1>
          <p className="mt-4 text-sm text-slate-500">Update your technician profile details anytime.</p>
          <div className="mt-8 flex items-center gap-5">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#2161e8] text-2xl font-bold text-white">{initials}</span>
            <div><p className="text-xl font-bold text-[#24417e]">{displayName}</p><p className="font-bold text-[#2161e8]">{technician.id}</p></div>
          </div>
          <div className="mt-10 grid gap-6">
            <label className="text-sm text-slate-700">Email address<input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className={inputClass} /></label>
            <label className="text-sm text-slate-700">Primary contact number<input required value={form.contact} onChange={(event) => updateField('contact', event.target.value)} className={inputClass} /></label>
            <label className="text-sm text-slate-700">First name<input required value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} className={inputClass} /></label>
            <label className="text-sm text-slate-700">Middle name<input value={form.middleName} onChange={(event) => updateField('middleName', event.target.value)} className={inputClass} /></label>
            <label className="text-sm text-slate-700">Last name<input required value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} className={inputClass} /></label>
          </div>
          {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={isSaving} className="mt-8 w-full rounded-2xl bg-[#2161e8] px-5 py-4 font-bold text-white">{isSaving ? 'Saving...' : 'Save changes'}</button>
        </form>
      </div>
    </PortalShell>;
  }

  return <PortalShell role="technician">
    <div className="min-h-screen bg-white">
      <section className="border-b border-slate-100 px-5 pb-9 pt-11 text-center sm:px-8">
        <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#2161e8] text-3xl font-bold text-white">{initials}</span>
        <h1 className="mt-5 text-2xl font-bold text-[#24417e]">{displayName}</h1>
        <p className="mt-1 text-lg font-bold text-[#2161e8]">{technician.id}</p>
        <p className="mt-1 text-sm text-slate-500">Sky-Tech Technician</p>
      </section>
      <main className="mx-auto max-w-7xl">
        <section>
          <h2 className="px-5 pb-4 pt-7 text-xl font-bold text-[#24417e] sm:px-8 lg:px-10">Account Settings</h2>
          <button onClick={() => setIsEditing(true)} className="flex w-full items-center gap-4 border-b border-slate-100 px-5 py-5 text-left text-base text-slate-600 transition-colors duration-150 hover:bg-slate-50 sm:px-8 lg:px-10"><UserRound size={21} /><span className="flex-1">Profile details</span><ChevronRight size={18} /></button>
        </section>
        <div className="px-5 pb-32 pt-7 sm:px-8 lg:px-10"><button onClick={handleSignOut} className="w-full rounded-2xl border border-red-200 bg-red-50 py-4 text-base font-bold text-red-600 transition-colors duration-150 hover:bg-red-100">Sign Out</button></div>
      </main>
    </div>
  </PortalShell>;
}
