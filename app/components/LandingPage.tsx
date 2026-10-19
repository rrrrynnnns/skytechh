'use client';

import { useEffect, useState } from 'react';

type Props = {
  onLogin: () => void;
  onBook: () => void;
};

function Icon({ name, size = 22 }: { name: 'wifi' | 'support' | 'shield' | 'portal' | 'check' | 'arrow' | 'pin'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'wifi') return <svg {...common}><path d="M2.5 8.5a15.5 15.5 0 0 1 19 0" /><path d="M5.5 12a10.7 10.7 0 0 1 13 0" /><path d="M8.8 15.5a5.8 5.8 0 0 1 6.4 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></svg>;
  if (name === 'support') return <svg {...common}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><path d="M4 13h2v5H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Z" /><path d="M20 13h-2v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2Z" /><path d="M18 18c-.6 2-2.6 3-5 3h-1" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.3 2.3 4.8-4.8" /></svg>;
  if (name === 'portal') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h.01M11 8h.01M7 12h10M7 16h6" /></svg>;
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

const benefits = [
  ['wifi', 'Pure fiber to your home', 'A direct fiber connection delivers consistent speed for every room and every device.'],
  ['support', 'Local support, 24/7', 'Talk to a real local team whenever you need a hand with your connection.'],
  ['shield', 'One simple monthly price', 'Clear plans, unlimited data, and no confusing surprises on your bill.'],
  ['portal', 'Everything in one portal', 'Manage your service, requests, payments, and updates in one secure place.'],
] as const;

type Plan = { name: string; speedMbps: number; price: number };

const fallbackPlans: Plan[] = [
  { name: 'Fiber 25Mbps', speedMbps: 25, price: 599 },
  { name: 'Fiber 50Mbps', speedMbps: 50, price: 799 },
  { name: 'Fiber 100Mbps', speedMbps: 100, price: 999 },
];

export function LandingPage({ onLogin, onBook }: Props) {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load plans.');
        const result = await response.json();
        if (Array.isArray(result.data?.plans) && result.data.plans.length) {
          const currentPlans = result.data.plans
            .map((plan: { name?: string; speedMbps?: number; price?: number }) => ({
              name: plan.name || '',
              speedMbps: Number(plan.speedMbps || 0),
              price: Number(plan.price || 0),
            }))
            .filter((plan: Plan) => plan.name && plan.speedMbps > 0 && plan.price >= 0);
          if (currentPlans.length) setPlans(currentPlans);
        }
      })
      .catch(() => undefined);
  }, []);

  const popularPlan = plans.find((plan) => plan.speedMbps === 50) || plans[Math.floor(plans.length / 2)];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden bg-[#071329] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(94,145,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,145,255,.08) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="pointer-events-none absolute -left-32 -top-48 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#071329]/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10" aria-label="Main navigation">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left" aria-label="Sky-Tech ISP home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-950/40"><Icon name="wifi" size={23} /></span>
            <span className="text-lg font-extrabold tracking-tight">Sky-Tech <span className="text-blue-400">ISP</span></span>
          </button>
          <div className="hidden items-center gap-7 text-sm font-semibold text-blue-100/75 md:flex">
            <a href="#features" className="transition hover:text-white">Why Sky-Tech</a><a href="#plans" className="transition hover:text-white">Plans</a><a href="#coverage" className="transition hover:text-white">Coverage</a><a href="#support" className="transition hover:text-white">Support</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3"><button onClick={onLogin} className="rounded-full px-3 py-2 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white sm:px-4">Sign in</button><button onClick={onBook} className="rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#071329]">Book now</button></div>
          </nav>
        </header>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-28 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-36">
          <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Service is operational</div><h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">The internet your home has been <span className="text-blue-400">waiting for.</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-blue-100/70 sm:text-lg">Reliable home fiber, local customer support, and plans starting at ₱999 per month. Free installation gets you online without the hassle.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={onBook} className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300">Book now <Icon name="arrow" size={17} /></button><a href="#plans" className="rounded-full border border-blue-200/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-blue-100 transition hover:bg-white/10">Explore plans</a></div><div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-blue-100/65">{['No lock-in contract', 'Unlimited data', 'Free installation'].map((item) => <span key={item} className="flex items-center gap-2"><Icon name="check" size={16} />{item}</span>)}</div></div>
          <div className="relative min-h-[22rem] overflow-visible sm:min-h-[31rem]"><div className="absolute -inset-5 rounded-[2rem] bg-blue-500/20 blur-2xl" /><div className="relative h-full min-h-[22rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1d3a] shadow-2xl sm:min-h-[31rem]"><img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85" alt="Family using a laptop together at home" className="h-full min-h-[22rem] w-full object-cover opacity-85 sm:min-h-[31rem]" /><div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-[#071329]/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8"><p className="max-w-sm text-xl font-bold leading-snug">Every call, class, stream, and game—connected.</p><p className="mt-2 text-sm text-blue-100/65">Fiber built for the way your home lives.</p></div></div><div className="absolute -left-3 top-7 rounded-2xl border border-white/10 bg-[#0b1d3a]/95 p-4 shadow-xl backdrop-blur sm:-left-7 sm:top-12"><p className="text-xs font-semibold text-blue-200/65">Network uptime</p><p className="mt-1 text-2xl font-black text-white">99.9%</p><p className="mt-1 text-xs font-semibold text-emerald-300">● Excellent</p></div><div className="absolute -bottom-5 -right-3 rounded-2xl border border-blue-400/20 bg-[#2563eb] p-4 shadow-xl sm:-right-7 sm:bottom-8"><p className="text-xs font-semibold text-blue-100">Home speed</p><p className="mt-1 text-2xl font-black text-white">100 Mbps</p></div></div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-5 py-8 lg:px-10"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 sm:grid-cols-4"><div><p className="text-2xl font-black text-[#071329] sm:text-3xl">5,000+</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">connected homes</p></div><div><p className="text-2xl font-black text-[#071329] sm:text-3xl">99.9%</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">average uptime</p></div><div><p className="text-2xl font-black text-[#071329] sm:text-3xl">&lt;2 hrs</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">support response</p></div><div><p className="text-2xl font-black text-[#071329] sm:text-3xl">24/7</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">local assistance</p></div></div></section>

      <section id="features" className="bg-[#f7faff] px-5 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563eb]">Why Sky-Tech</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">Reliable by design. Human when you need us.</h2><div className="mt-10 grid gap-4 md:grid-cols-2"><article className="rounded-3xl bg-[#0b1d3a] p-7 text-white shadow-xl shadow-blue-100 md:col-span-2 md:flex md:items-center md:justify-between md:p-9"><div><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Icon name="wifi" /></div><h3 className="mt-6 text-xl font-bold">Pure fiber to your home</h3><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/65">A direct fiber connection delivers consistent speed for every room and every device.</p></div><div className="mt-7 hidden h-28 w-56 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 md:flex"><div className="h-16 w-16 rounded-full border border-blue-300/30 p-3"><div className="grid h-full place-items-center rounded-full bg-blue-500/20 text-blue-300"><Icon name="wifi" /></div></div></div></article>{benefits.slice(1).map(([icon, title, text]) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#2563eb]"><Icon name={icon} /></div><h3 className="mt-6 text-lg font-bold text-[#071329]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}</div></div></section>

      <section id="plans" className="bg-white px-5 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563eb]">Internet plans</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">A plan for your kind of home.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">Simple monthly pricing. Unlimited data. No lock-in contract.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map((plan) => { const isPopular = plan.name === popularPlan?.name; return <article key={plan.name} className={`relative rounded-3xl border p-7 ${isPopular ? 'border-[#2563eb] bg-[#0b1d3a] text-white shadow-xl shadow-blue-100' : 'border-slate-200 bg-white'}`}>{isPopular && <span className="absolute right-6 top-6 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">Most popular</span>}<p className={`text-sm font-bold ${isPopular ? 'text-blue-300' : 'text-slate-500'}`}>{plan.name}</p><p className="mt-6 text-4xl font-black">{plan.speedMbps} Mbps</p><p className={`mt-2 text-sm ${isPopular ? 'text-blue-100/60' : 'text-slate-500'}`}>Reliable home fiber</p><p className="mt-8 text-2xl font-black">₱{plan.price.toLocaleString()}<span className={`text-sm font-semibold ${isPopular ? 'text-blue-100/60' : 'text-slate-400'}`}> / month</span></p><div className={`my-7 border-t ${isPopular ? 'border-white/10' : 'border-slate-100'}`} />{['Unlimited data', 'Free installation'].map((feature) => <p key={feature} className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isPopular ? 'text-blue-100' : 'text-slate-600'}`}><Icon name="check" size={16} />{feature}</p>)}<button onClick={onBook} className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold transition ${isPopular ? 'bg-[#2563eb] text-white hover:bg-blue-500' : 'bg-blue-50 text-[#2563eb] hover:bg-blue-100'}`}>Choose plan</button></article>; })}</div></div></section>

      <section id="coverage" className="bg-white px-5 pb-20 lg:px-10"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#071329] px-7 py-14 text-white sm:px-12"><div className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full border border-blue-400/20 shadow-[0_0_0_35px_rgba(37,99,235,.06),0_0_0_70px_rgba(37,99,235,.04)]" /><div className="relative z-10 max-w-xl"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Icon name="pin" /></div><h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">See if Sky-Tech fiber has reached your street.</h2><p className="mt-4 text-sm leading-6 text-blue-100/65">Tell us where you live and our team will check coverage, guide you through the plan options, and arrange a convenient installation.</p><button onClick={onBook} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500">Check availability <Icon name="arrow" size={17} /></button></div></div></section>

      <section id="support" className="bg-[#f7faff] px-5 py-20 lg:px-10"><div className="mx-auto max-w-4xl text-center"><div className="flex justify-center gap-1 text-amber-400" aria-label="5 out of 5 stars">★★★★★</div><blockquote className="mt-6 text-2xl font-bold leading-snug tracking-tight text-[#071329] sm:text-4xl">“Sky-Tech keeps my online shop running smoothly. When I need help, I get a real answer from a team that knows our area.”</blockquote><div className="mt-8 flex items-center justify-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#2563eb] text-sm font-black text-white">MR</span><div className="text-left"><p className="text-sm font-bold text-[#071329]">Mia Reyes</p><p className="text-xs font-semibold text-slate-500">Online business owner · Home Plus</p></div></div></div></section>

      <footer className="bg-[#071329] px-5 py-12 text-blue-100/60 lg:px-10"><div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]"><div><div className="flex items-center gap-3 text-white"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2563eb]"><Icon name="wifi" size={20} /></span><span className="font-extrabold">Sky-Tech <span className="text-blue-400">ISP</span></span></div><p className="mt-4 max-w-xs text-sm leading-6">Reliable fiber internet and local support for the homes and businesses we serve.</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-blue-200">Explore</p><div className="mt-4 space-y-3 text-sm"><a href="#features" className="block hover:text-white">Benefits</a><a href="#plans" className="block hover:text-white">Plans</a><a href="#coverage" className="block hover:text-white">Coverage</a></div></div><div><p className="text-xs font-bold uppercase tracking-wider text-blue-200">Account</p><div className="mt-4 space-y-3 text-sm"><button onClick={onLogin} className="block hover:text-white">Subscriber login</button><button onClick={onBook} className="block hover:text-white">Check availability</button></div></div></div><div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Sky-Tech ISP. All rights reserved.</span><span>Photo by <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="text-blue-300 hover:text-white">Unsplash</a>.</span></div></footer>
    </main>
  );
}
