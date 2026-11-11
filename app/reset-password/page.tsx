'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to reset password.');
      } else {
        setMessage('Your password has been reset. You can now sign in.');
        setPassword('');
        setConfirmation('');
      }
    } catch {
      setError('Unable to reset password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#071329] px-4 py-8">
    <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(94,145,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,145,255,.08) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
    <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-3xl" />
    <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-50 lg:block" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 720C230 560 290 820 530 650S840 210 1120 390s190 80 360-40" stroke="#2563eb" strokeOpacity=".25" strokeWidth="2" fill="none" /><path d="M-20 170C280 370 380 40 650 230s370 420 800 250" stroke="#7896e8" strokeOpacity=".18" strokeWidth="1.5" strokeDasharray="8 12" fill="none" /><circle cx="530" cy="650" r="5" fill="#60a5fa" /><circle cx="1120" cy="390" r="5" fill="#818cf8" /><circle cx="650" cy="230" r="4" fill="#60a5fa" /></svg>
    <section className="relative z-10 w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-10">
      <h1 className="text-2xl font-black text-[#071329]">Set a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Choose a new password with at least 8 characters.</p>
      {!token ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">This reset link is missing or invalid.</p> : <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-sm font-bold text-slate-700">New password<div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-[#2452c7]"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="min-w-0 flex-1 !border-0 !bg-transparent px-0 !outline-none !ring-0 !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} className="ml-2 !border-0 !bg-transparent p-1 text-slate-400 !shadow-none !outline-none hover:text-[#2452c7] focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
        <label className="block text-sm font-bold text-slate-700">Confirm new password<div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-[#2452c7]"><input type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required className="min-w-0 flex-1 !border-0 !bg-transparent px-0 !outline-none !ring-0 !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none" /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? 'Hide confirmed password' : 'Show confirmed password'} className="ml-2 !border-0 !bg-transparent p-1 text-slate-400 !shadow-none !outline-none hover:text-[#2452c7] focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none">{showConfirmation ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
        <button type="submit" disabled={isSaving || Boolean(message)} className="h-12 w-full rounded-xl bg-[#2452c7] text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Reset password'}</button>
      </form>}
      <Link href="/login" className="mt-6 block text-center text-sm font-bold text-[#2452c7] hover:underline">Back to sign in</Link>
    </section>
  </main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#071329] px-4 py-8"><div className="rounded-3xl bg-white px-8 py-6 text-sm font-semibold text-slate-500">Loading reset form...</div></main>}><ResetPasswordForm /></Suspense>;
}
