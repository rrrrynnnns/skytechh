'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Wifi } from 'lucide-react';
import { Spinner } from '@/app/components/Spinner';

type LocationOption = { code: string; name: string; regionCode?: string; provinceCode?: string | false };
type InternetPlan = { name: string };
type SubmittedBooking = { id: string; name: string; email: string; contact: string; plan: string };
const PSGC_API = 'https://psgc.gitlab.io/api';

function sortLocations(options: LocationOption[]) {
  return [...options].sort((first, second) => first.name.localeCompare(second.name, 'en', { sensitivity: 'base' }));
}

export default function BookingPage() {
  const [sent, setSent] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<SubmittedBooking | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<InternetPlan[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load internet plans.');
        const configuredPlans = Array.isArray(result.data?.plans)
          ? result.data.plans.filter((plan: InternetPlan) => plan.name)
          : [];
        setPlans(configuredPlans);
      })
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    fetch(`${PSGC_API}/provinces/`)
      .then((response) => response.json())
      .then((items: LocationOption[]) => setProvinces(sortLocations(items)))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!province) {
      setCities([]);
      setBarangays([]);
      return;
    }
    const selectedProvince = provinces.find((item) => item.name === province);
    if (!selectedProvince) return;
    fetch(`${PSGC_API}/provinces/${selectedProvince.code}/cities-municipalities/`)
      .then((response) => response.json())
      .then((items: LocationOption[]) => setCities(sortLocations(items)))
      .catch(() => setCities([]));
  }, [province, provinces]);

  useEffect(() => {
    if (!city) {
      setBarangays([]);
      return;
    }
    const selectedCity = cities.find((item) => item.name === city);
    if (!selectedCity) return;
    fetch(`${PSGC_API}/cities-municipalities/${selectedCity.code}/barangays/`)
      .then((response) => response.json())
      .then((items: LocationOption[]) => setBarangays(sortLocations(items)))
      .catch(() => setBarangays([]));
  }, [city, cities]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      data.name = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
      data.address = [data.street, data.barangay, data.city, data.province, data.zipCode].filter(Boolean).join(', ');
      data.preferredDate = new Date().toISOString();
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok || !result.data) {
        setError(result.error || 'We could not submit your request. Please try again.');
        return;
      }
      setSubmittedBooking({
        id: String(result.data.id),
        name: String(data.name),
        email: String(data.email),
        contact: String(data.contact),
        plan: String(data.plan).replace(/_/g, ' '),
      });
      setSent(true);
    } catch {
      setError('We could not submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#071329] px-6 py-8 text-slate-900 sm:px-8 sm:py-10">
    <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(94,145,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,145,255,.08) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
    <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-3xl" />
    <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-50 lg:block" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-40 720C230 560 290 820 530 650S840 210 1120 390s190 80 360-40" stroke="#2563eb" strokeOpacity=".25" strokeWidth="2" fill="none" />
      <path d="M-20 170C280 370 380 40 650 230s370 420 800 250" stroke="#7896e8" strokeOpacity=".18" strokeWidth="1.5" strokeDasharray="8 12" fill="none" />
      <circle cx="530" cy="650" r="5" fill="#60a5fa" />
      <circle cx="1120" cy="390" r="5" fill="#818cf8" />
      <circle cx="650" cy="230" r="4" fill="#60a5fa" />
    </svg>
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col">
    <header className="flex items-center">
      <Link href="/" className="flex items-center gap-3 text-white" aria-label="Return to Sky-Tech home">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2452c7] text-white shadow-lg shadow-blue-950/40">
          <Wifi size={23} />
        </span>
        <span>
          <span className="block text-lg font-extrabold tracking-tight">Sky-Tech</span>
          <span className="block text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">ISP Portal</span>
        </span>
      </Link>
    </header>
    <div className="flex flex-1 flex-col items-center justify-center py-8 sm:py-12">
    <div className="w-full max-w-[460px]">
    {!sent && <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 hover:text-white"><ArrowLeft size={16} /> Back to login</Link>}
    <div className="mt-3 w-full rounded-3xl border border-white/70 bg-white px-5 py-7 shadow-2xl shadow-black/30 sm:px-10 sm:py-9">
      {sent && submittedBooking ? <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-500"><CheckCircle2 size={36} /></span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-[#071329]">Request Submitted</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">Our team will get back to you within 24 hours to confirm your installation schedule.</p>
        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Booking ID</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#071329]">{submittedBooking.id}</p>
        </div>
        <div className="mt-7 space-y-4 text-left text-sm">
          {[['Name', submittedBooking.name], ['Email', submittedBooking.email], ['Contact', submittedBooking.contact], ['Plan', submittedBooking.plan]].map(([label, value]) => <div className="flex items-start justify-between gap-5" key={label}><span className="text-slate-400">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></div>)}
        </div>
        <Link href="/login" className="mt-8 block rounded-xl bg-[#2f68e6] px-5 py-3 text-sm font-bold text-white hover:bg-[#2458c8]">Back to Login</Link>
      </div> : <><div className="text-center"><h1 className="text-3xl font-black tracking-tight text-[#071329]">Apply for Internet Connection</h1><p className="mt-2 text-sm text-slate-500">We&apos;ll get back to you within 24 hours.</p></div><form onSubmit={submit} className="mt-8 grid gap-5">
        {[
          ['firstName', 'First Name *', true], ['middleName', 'Middle Name (Optional)', false],
          ['lastName', 'Last Name *', true], ['email', 'Email *', true], ['contact', 'Contact *', true],
        ].map(([name, label, required]) => <label key={String(name)} className="text-sm font-bold text-slate-700">{label}<input required={Boolean(required)} name={String(name)} type={name === 'email' ? 'email' : 'text'} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#2452c7]" /></label>)}
        <label className="text-sm font-bold text-slate-700">Plan<select name="plan" required disabled={!plans.length} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#2452c7] disabled:bg-slate-50"><option value="">{plans.length ? 'Select plan...' : 'No plans available'}</option>{plans.map((plan) => <option key={plan.name} value={plan.name.replace(/\s+/g, '_')}>{plan.name.replace(/_/g, ' ')}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">Province / State *<select name="province" required value={province} onChange={(event) => { setProvince(event.target.value); setCity(''); setBarangay(''); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#2452c7]"><option value="">Select province / state...</option>{provinces.map((item) => <option key={item.code}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">City / Municipality *<select name="city" required value={city} disabled={!province} onChange={(event) => { setCity(event.target.value); setBarangay(''); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#2452c7] disabled:bg-slate-50"><option value="">Select city / municipality...</option>{cities.map((item) => <option key={item.code}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">Barangay *<select name="barangay" required value={barangay} disabled={!city} onChange={(event) => setBarangay(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#2452c7] disabled:bg-slate-50"><option value="">Select barangay...</option>{barangays.map((item) => <option key={item.code}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">House No. / Street *<input name="street" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#2452c7]" /></label>
        <label className="text-sm font-bold text-slate-700">ZIP Code<input name="zipCode" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#2452c7]" /></label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3b4fd8] px-5 py-3 font-bold text-white">{isSubmitting && <Spinner />}{isSubmitting ? 'Submitting...' : 'Submit booking request'}</button>
      </form></>}
    </div>
    </div>
    </div>
  </div></main>;
}
