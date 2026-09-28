'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Router } from 'lucide-react';
import { Spinner } from '@/app/components/Spinner';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();

  async function loginAs(email: string, password: string) {
    setError('');
    setIsSigningIn(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('Demo accounts are not seeded yet. Run npm run db:push and npm run db:seed.');
      setIsSigningIn(false);
      return;
    }
    const role = email.startsWith('admin') ? 'admin' : email.startsWith('tech') ? 'technician' : 'subscriber';
    router.replace(role === 'admin' ? '/admin/dashboard' : role === 'technician' ? '/technician/my-tasks' : '/subscriber/my-account');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await loginAs(String(values.email), String(values.password));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#2447b6] text-white"><Router size={26} /></span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account.</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <input name="email" type="email" required autoComplete="email" placeholder="you@skytech.net" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2447b6] focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2447b6] focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="-mt-2 flex justify-end">
            <a href="mailto:support@skytech.net?subject=Password%20reset%20request" className="text-sm font-medium text-slate-900 hover:underline">Forgot password?</a>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <button disabled={isSigningIn} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2447b6] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#1d3b99] disabled:opacity-60">
            {isSigningIn ? <><Spinner />Signing in...</> : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
