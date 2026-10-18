'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, type DemoRole } from '@/app/lib/demo-accounts';

type LoginProps = {
  onBooking: () => void;
  onBack?: () => void;
};

function Icon({ name, size = 19 }: { name: 'wifi' | 'mail' | 'lock' | 'eye' | 'eyeOff' | 'arrow' | 'user' | 'wrench' | 'shield' | 'alert'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'wifi') return <svg {...common}><path d="M2.5 8.5a15.5 15.5 0 0 1 19 0M5.5 12a10.7 10.7 0 0 1 13 0M8.8 15.5a5.8 5.8 0 0 1 6.4 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></svg>;
  if (name === 'mail') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  if (name === 'lock') return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  if (name === 'eye' || name === 'eyeOff') return <svg {...common}>{name === 'eye' ? <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></> : <><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.1 3.7M6.2 6.3C3.4 8.1 2 12 2 12s3.5 6 10 6a9.8 9.8 0 0 0 3.2-.5" /></>}</svg>;
  if (name === 'arrow') return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
  if (name === 'wrench') return <svg {...common}><path d="m14.7 6.3 3-3a5 5 0 0 0-6.4 6.4l-7.8 7.8a2 2 0 0 0 2.8 2.8l7.8-7.8a5 5 0 0 0 6.4-6.4l-3 3-2.8-.8-.8-2.8Z" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.3 2.3 4.8-4.8" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
}

const roles: Array<{ id: DemoRole; label: string; icon: 'shield' | 'wrench' | 'user'; color: string }> = [
  { id: 'admin', label: 'Administrator', icon: 'shield', color: 'blue' },
  { id: 'technician', label: 'Technician', icon: 'wrench', color: 'amber' },
  { id: 'subscriber', label: 'Subscriber', icon: 'user', color: 'emerald' },
];

export function Login({ onBooking }: LoginProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  function selectRole(role: DemoRole) {
    const account = DEMO_ACCOUNTS[role];
    setSelectedRole(role);
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  async function loginAs(nextEmail: string, nextPassword: string) {
    setError('');
    setIsSigningIn(true);
    const result = await signIn('credentials', { email: nextEmail, password: nextPassword, redirect: false });
    if (result?.error) {
      setError('The email or password you entered is incorrect.');
      setIsSigningIn(false);
      return;
    }
    const account = Object.values(DEMO_ACCOUNTS).find((item) => item.email === nextEmail);
    const role = account?.role || (nextEmail.startsWith('admin') ? 'admin' : nextEmail.startsWith('tech') ? 'technician' : 'subscriber');
    router.replace(role === 'admin' ? '/admin/dashboard' : role === 'technician' ? '/technician/my-tasks' : '/subscriber/my-account');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginAs(email, password);
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#071329] px-4 py-6 text-slate-900 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(94,145,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,145,255,.08) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-3xl" />
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-50 lg:block" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 720C230 560 290 820 530 650S840 210 1120 390s190 80 360-40" stroke="#2563eb" strokeOpacity=".25" strokeWidth="2" fill="none" /><path d="M-20 170C280 370 380 40 650 230s370 420 800 250" stroke="#7896e8" strokeOpacity=".18" strokeWidth="1.5" strokeDasharray="8 12" fill="none" /><circle cx="530" cy="650" r="5" fill="#60a5fa" /><circle cx="1120" cy="390" r="5" fill="#818cf8" /><circle cx="650" cy="230" r="4" fill="#60a5fa" /></svg>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <header className="flex items-center"><Link href="/landing-page" className="flex items-center gap-3 text-white" aria-label="Return to Sky-Tech landing page"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2452c7] text-white shadow-lg shadow-blue-950/40"><Icon name="wifi" size={23} /></span><span><span className="block text-lg font-extrabold tracking-tight">Sky-Tech</span><span className="block text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">ISP Portal</span></span></Link></header>
        <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <section className="w-full max-w-[460px] rounded-3xl border border-white/70 bg-white px-5 py-7 shadow-2xl shadow-black/30 sm:px-10 sm:py-9" aria-labelledby="login-title">
            <div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#2452c7] text-white shadow-lg shadow-blue-200"><Icon name="wifi" size={30} /></div><h1 id="login-title" className="mt-5 text-3xl font-black tracking-tight text-[#071329]">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to manage your Sky-Tech account.</p></div>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label htmlFor="email" className="block text-sm font-bold text-slate-700">Email address<div className={`mt-2 flex h-12 items-center overflow-hidden rounded-xl border bg-white px-3 transition focus-within:ring-2 focus-within:ring-blue-100 ${error ? 'border-red-300' : 'border-slate-200 focus-within:border-[#2452c7]'}`}><span className="shrink-0 text-slate-400"><Icon name="mail" /></span><input id="email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSelectedRole(null); }} required autoComplete="email" placeholder="you@skytech.net" className="min-w-0 flex-1 appearance-none !border-0 bg-transparent px-3 text-sm text-slate-900 !outline-none !ring-0 !shadow-none placeholder:text-slate-400 focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none" /></div></label>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">Password<div className={`mt-2 flex h-12 items-center overflow-hidden rounded-xl border bg-white px-3 transition focus-within:ring-2 focus-within:ring-blue-100 ${error ? 'border-red-300' : 'border-slate-200 focus-within:border-[#2452c7]'}`}><span className="shrink-0 text-slate-400"><Icon name="lock" /></span><input id="password" name="password" type="text" value={password} onChange={(event) => { setPassword(event.target.value); setSelectedRole(null); }} required autoComplete="current-password" placeholder="Enter your password" className={`min-w-0 flex-1 appearance-none !border-0 bg-transparent px-3 text-sm text-slate-900 !outline-none !ring-0 !shadow-none placeholder:text-slate-400 focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none ${showPassword ? '' : 'password-mask'}`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="shrink-0 !border-0 !bg-transparent !p-1 !shadow-none text-slate-400 transition hover:text-[#2452c7] focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none"><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button></div></label>
              <div className="flex justify-end"><button type="button" onClick={() => setRecoveryMessage(true)} className="text-sm font-bold text-[#2452c7] hover:underline">Forgot password?</button></div>
              {recoveryMessage && <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Password recovery is not available in this demo.</p>}
              {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"><Icon name="alert" size={18} /> <span>{error}</span></div>}
              <button type="submit" disabled={isSigningIn} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2452c7] px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1d43aa] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60">{isSigningIn ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Signing in...</> : 'Sign in'}</button>
            </form>
            <div className="my-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />Quick demo access<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="grid grid-cols-3 gap-2">{roles.map((role) => <button key={role.id} type="button" onClick={() => selectRole(role.id)} className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-1 text-center text-[11px] font-bold transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 ${selectedRole === role.id ? 'border-[#2452c7] bg-blue-50 text-[#2452c7]' : 'border-slate-200 bg-white text-slate-500'}`}><span className={role.color === 'amber' ? 'text-amber-500' : role.color === 'emerald' ? 'text-emerald-500' : 'text-[#2452c7]'}><Icon name={role.icon} size={20} /></span>{role.label}</button>)}</div>
            <p className="mt-7 text-center text-sm text-slate-500">New to Sky-Tech? <button type="button" onClick={onBooking} className="font-bold text-[#2452c7] hover:underline">Book a connection</button></p>
          </section>
        </div>
        <footer className="pb-2 text-center text-xs font-semibold text-blue-100/45">© 2026 Sky-Tech ISP. Secure account access.</footer>
      </div>
    </main>
  );
}

export default function LoginPage() {
  const router = useRouter();
  return <Login onBooking={() => router.push('/booking')} onBack={() => router.push('/')} />;
}
