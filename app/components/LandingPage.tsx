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
  ['wifi', 'Dedicated Pure Fiber', 'Direct fiber-optic connection straight into your home. Equal upload and download speeds so gaming, video calling, and working from home never lag.'],
  ['support', '24/7 Local Support', 'When you call us, you speak directly to our local technicians. No automated loops or overseas call centers.'],
  ['shield', 'Transparent Pricing', 'What you see is what you pay. No unexpected bill increases, hidden surcharges, or setup fee surprises.'],
  ['shield', 'No Lock-In Flexibility', 'We believe in earning your trust every month. Choose a month-to-month plan or save more with annual commitments.'],
  ['portal', 'Easy Account App', 'Pay bills in one tap, test your live home speeds, request support, or manage Wi-Fi settings from your subscriber portal.'],
  ['wifi', 'Wi-Fi 6 Router Included', 'Get latest-generation dual-band Wi-Fi 6 hardware installed free of charge to eliminate dead spots in every room.'],
] as const;

type Plan = { name: string; speedMbps: number; price: number };

const fallbackPlans: Plan[] = [
  { name: 'Fiber 25Mbps', speedMbps: 25, price: 599 },
  { name: 'Fiber 50Mbps', speedMbps: 50, price: 799 },
  { name: 'Fiber 100Mbps', speedMbps: 100, price: 999 },
];

function getPlanDetails(speedMbps: number) {
  if (speedMbps <= 100) {
    return {
      label: 'FIBER STARTER',
      description: 'Ideal for small apartments & basic browsing',
      billing: 'Billed monthly • No contract',
      features: ['Equal Upload & Download', 'Unlimited High-Speed Data', 'Free Installation & Standard Router', '24/7 Local Customer Support'],
    };
  }
  if (speedMbps <= 200) {
    return {
      label: 'HOME PLUS',
      description: 'Perfect for 4K streaming & multiple devices',
      billing: 'Billed monthly • No lock-in',
      features: ['Equal Upload & Download', 'Unlimited High-Speed Data', 'Free Wi-Fi 6 Router Upgrade', 'Priority Same-Day Tech Dispatch'],
    };
  }
  return {
    label: 'MAX ULTRA',
    description: 'Heavy gaming, remote work & smart homes',
    billing: 'Billed monthly • No contract',
    features: ['Ultra-Low Latency', 'Unlimited High-Speed Data', 'Wi-Fi 6 Mesh Ready Hardware', 'Dedicated Account Specialist'],
  };
}

const coverageAreas = [
  ['Poblacion', '100% Pure Fiber', 'active'],
  ['Mahayahay', '100% Pure Fiber', 'active'],
  ['San Vicente', '100% Pure Fiber', 'active'],
  ['El Rio', '100% Pure Fiber', 'active'],
  ['Afga', '98% Fiber Ready', 'active'],
  ['Tabon-tabon', '95% Fiber Ready', 'active'],
  ['Ilihan', '95% Fiber Ready', 'active'],
  ['Sinai', '92% Fiber Ready', 'active'],
  ['Perez', 'Expanding soon', 'expanding'],
  ['Kauswagan', 'Expanding soon', 'expanding'],
] as const;

const coverageDescriptions: Record<string, string> = {
  Poblacion: 'Central Network Hub',
  Mahayahay: 'High Density Residential',
  'San Vicente': 'Fast Track Installation',
  'El Rio': 'Pure Optical Lines',
  Afga: 'Highway Commercial & Home',
  'Tabon-tabon': 'Direct Fiber Feed',
  Ilihan: 'Active Distribution Box',
  Sinai: 'Fast Fiber Access',
  Perez: 'Line Deployment Underway',
  Kauswagan: 'Line Deployment Underway',
};

function scrollToPlans() {
  const plansSection = document.getElementById('plans');
  if (!plansSection) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    plansSection.scrollIntoView();
    return;
  }

  const startPosition = window.scrollY;
  const targetPosition = plansSection.getBoundingClientRect().top + startPosition;
  const distance = targetPosition - startPosition;
  const duration = 1200;
  let startTime: number | null = null;

  const animateScroll = (timestamp: number) => {
    if (startTime === null) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easedProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;

    window.scrollTo(0, startPosition + distance * easedProgress);
    if (progress < 1) requestAnimationFrame(animateScroll);
  };

  requestAnimationFrame(animateScroll);
}

export function LandingPage({ onLogin, onBook }: Props) {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [selectedCoverage, setSelectedCoverage] = useState('Poblacion');
  const [coverageQuery, setCoverageQuery] = useState('');
  const [coverageSearchResult, setCoverageSearchResult] = useState<string | null>(null);
  const selectedCoverageDetails = coverageAreas.find(([area]) => area === selectedCoverage);
  const coverageSearchIsExpanding = coverageAreas.find(([area]) => area === coverageSearchResult)?.[2] === 'expanding';

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

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden bg-[#071329] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(94,145,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,145,255,.08) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="pointer-events-none absolute -left-32 -top-48 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#071329]/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10" aria-label="Main navigation">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left" aria-label="Sky-Tech ISP home">
            <img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-11 w-11 rounded-full object-cover object-center" />
            <span><span className="block text-lg font-black tracking-tight">Sky-Tech</span><span className="block text-[9px] font-bold uppercase tracking-[.18em] text-sky-400">Home Fiber</span></span>
          </button>
          <div className="hidden items-center gap-7 text-sm font-semibold text-blue-100/75 md:flex">
            <a href="#features" className="transition hover:text-white">Why Sky-Tech</a><a href="#plans" className="transition hover:text-white">Fiber Plans</a><a href="#coverage" className="transition hover:text-white">Coverage &amp; Map</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3"><button onClick={onLogin} className="rounded-full px-3 py-2 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white sm:px-4">Sign in</button><button onClick={onBook} className="rounded-full bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#071329]">Book now</button></div>
          </nav>
        </header>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-28 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-36">
          <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-400" /> 100% Fiber Optic Network &middot; Sibagat, Agusan del Sur</div><h1 className="mt-6 max-w-xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl">The internet your home has been <span className="text-sky-500">waiting for.</span></h1><p className="mt-5 max-w-lg text-sm leading-6 text-blue-100/70 sm:text-base">Say goodbye to lag, hidden price spikes, and overseas customer bots. Sky-Tech delivers ultra-reliable fiber backed by our friendly local team right here in Sibagat.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={onBook} className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-blue-300">Book now <Icon name="arrow" size={17} /></button><a href="#plans" onClick={(event) => { event.preventDefault(); scrollToPlans(); }} className="rounded-full border border-blue-200/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-blue-100 transition hover:bg-white/10">Explore plans</a></div><div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-blue-100/90">{['Plans starting at ₱999/mo', 'No lock-in contract options', 'Free Wi-Fi 6 Router Installation'].map((item) => <span key={item} className="flex items-center gap-2"><span className="text-sky-400"><Icon name="check" size={17} /></span>{item}</span>)}</div></div>
          <div className="relative min-h-[22rem] overflow-visible sm:min-h-[31rem]"><div className="absolute -inset-5 rounded-[2rem] bg-blue-500/20 blur-2xl" /><div className="relative h-full min-h-[22rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1d3a] shadow-2xl sm:min-h-[31rem]"><img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85" alt="Family using a laptop together at home" className="h-full min-h-[22rem] w-full object-cover opacity-85 sm:min-h-[31rem]" /><div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-[#071329]/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8"><p className="max-w-sm text-xl font-bold leading-snug">Every call, class, stream, and game—connected.</p><p className="mt-2 text-sm text-blue-100/65">Fiber built for the way your home lives.</p></div></div></div>
        </div>
      </section>


      <section id="features" className="bg-[#f7faff] px-5 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-sky-600">WHY SKY-TECH FIBER</p><h2 className="mt-4 text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">Built for real homes. Backed by real neighbors.</h2><p className="mt-4 text-base leading-7 text-slate-500">We built the internet provider we always wished we had - no fine-print tricks, constant dropouts, or impersonal phone menus.</p></div><div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{benefits.map(([icon, title, text]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600"><Icon name={icon} size={28} /></div><h3 className="mt-8 text-xl font-bold text-[#071329]">{title}</h3><p className="mt-4 text-base leading-7 text-slate-500">{text}</p></article>)}</div></div></section>

            <section id="plans" className="bg-white px-5 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-sky-600">STRAIGHTFORWARD PRICING</p><h2 className="mt-4 text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">A fiber plan for every household size.</h2><p className="mt-4 text-base leading-7 text-slate-500">All plans include unlimited data, free installation, and high-speed Wi-Fi 6 router.</p></div><div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{plans.map((plan) => { const isPopular = plan.speedMbps === 200; const details = getPlanDetails(plan.speedMbps); return <article key={plan.name} className={`relative flex flex-col rounded-3xl border p-8 ${isPopular ? 'border-sky-500 shadow-[0_18px_40px_rgba(14,165,233,0.18)]' : 'border-slate-200 shadow-sm'}`}>{isPopular && <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-600 px-4 py-1.5 text-xs font-black uppercase text-white shadow-md">Most popular for families</span>}<span className={`w-fit rounded-full px-4 py-2 text-xs font-black tracking-wide ${isPopular ? 'text-sky-600' : 'bg-slate-100 text-slate-500'}`}>{details.label}</span><h3 className="mt-6 text-3xl font-black text-[#071329]">{plan.speedMbps} Mbps</h3><p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-slate-500">{details.description}</p><p className={`mt-6 text-3xl font-black ${isPopular ? 'text-sky-600' : 'text-[#071329]'}`}>&#8369;{plan.price.toLocaleString()}<span className="text-base font-semibold text-slate-500"> / month</span></p><p className="mt-1 text-sm text-slate-400">{details.billing}</p><div className="my-5 border-t border-slate-100" /><div className="space-y-3">{details.features.map((feature, index) => <p key={feature} className="flex items-start gap-3 text-sm font-semibold leading-5 text-slate-600"><span className="text-lg leading-4 text-emerald-500">&#10003;</span>{index === 0 ? `${plan.speedMbps} Mbps ${feature}` : feature}</p>)}</div><button onClick={onBook} className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-bold transition ${isPopular ? 'bg-sky-600 text-white shadow-lg shadow-sky-200 hover:bg-sky-500' : 'bg-slate-100 text-[#071329] hover:bg-slate-200'}`}>{isPopular ? `Get ${plan.speedMbps} Mbps Now` : `Choose ${plan.speedMbps} Mbps`}</button></article>; })}</div></div></section>

            <section id="coverage" className="bg-white px-5 py-16 text-[#071329] lg:px-10"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-sky-600">FIBER NETWORK MAP - SIBAGAT, AGUSAN DEL SUR</p><h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#071329] sm:text-4xl">Check if Sky-Tech Fiber has reached your street.</h2><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">Sky-Tech is locally headquartered in Sibagat. Type your barangay or street below, or explore the live coverage map to see real-time fiber availability.</p><form onSubmit={(event) => { event.preventDefault(); const query = coverageQuery.trim(); const match = coverageAreas.find(([area]) => area.toLowerCase() === query.toLowerCase()); const result = match?.[0] || query || 'Poblacion'; setSelectedCoverage(result); setCoverageSearchResult(result); }} className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border-0 bg-white p-2 shadow-lg shadow-slate-200/60 sm:flex-row"><div className="relative min-w-0 flex-1"><svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input aria-label="Search coverage area" value={coverageQuery} onChange={(event) => setCoverageQuery(event.target.value)} placeholder="e.g. Poblacion, Mahayahay, San Vicente, El Rio..." className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-4 text-sm text-slate-700 outline-none focus:!border-0 focus:!shadow-none placeholder:text-slate-400" /></div><button type="submit" className="h-12 w-full rounded-xl bg-sky-600 px-7 text-sm font-bold text-white transition hover:bg-sky-500 sm:w-auto">Check Coverage</button></form>{coverageSearchResult && <div className={`mx-auto mt-6 flex max-w-3xl gap-4 rounded-2xl border p-5 text-left shadow-lg ${coverageSearchIsExpanding ? 'border-amber-300 bg-amber-50 shadow-amber-100' : 'border-sky-300 bg-sky-50 shadow-sky-100'}`}><svg aria-hidden="true" className={`mt-0.5 h-8 w-8 shrink-0 ${coverageSearchIsExpanding ? 'text-amber-400' : 'text-emerald-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d={coverageSearchIsExpanding ? 'M12 8v4M12 16h.01' : 'm8 12 2.5 2.5L16 9'} /></svg><div className="min-w-0 flex-1"><h3 className="text-base font-black text-[#071329]">{coverageSearchIsExpanding ? 'Upcoming Expansion Area' : '\u2713 Fiber Available!'}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{coverageSearchIsExpanding ? `Barangay ${coverageSearchResult}, Sibagat is in our current expansion phase. You can pre-book now to be connected first!` : `Pure Fiber is ACTIVE in Barangay ${coverageSearchResult}, Sibagat! Speeds Up to 300 Mbps are ready for same-day dispatch.`}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onBook} className={`rounded-lg px-4 py-2 text-sm font-bold ${coverageSearchIsExpanding ? 'bg-white text-sky-600 hover:bg-sky-50' : 'bg-sky-600 text-white hover:bg-sky-500'}`}>Apply for this Address -&gt;</button><button type="button" onClick={() => setCoverageSearchResult(null)} className={`rounded-lg px-4 py-2 text-sm font-bold ${coverageSearchIsExpanding ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}>Dismiss</button></div></div></div>}</div><div className="mt-8 rounded-[1.5rem] bg-[#0f4d73] p-4 text-white shadow-xl sm:p-6"><div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><div><div className="mb-4 flex items-center justify-between gap-3 text-xs font-bold"><span className="flex items-center gap-2 text-emerald-300"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />LIVE FIBER GRID: SIBAGAT, AGUSAN DEL NORTE</span><span className="text-blue-200/80">Coords: 8.8211&deg; N, 125.6980&deg; E</span></div><div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-200"><iframe title="Sky-Tech fiber coverage map" src="https://www.openstreetmap.org/export/embed.html?bbox=125.62%2C8.75%2C125.78%2C8.9&amp;layer=mapnik&amp;marker=8.8211%2C125.6980" className="h-[27rem] w-full border-0" loading="lazy" /><div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-[#071329]/95 px-2 py-2 shadow-xl"><img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-7 w-7 shrink-0 rounded-full object-cover object-center" /><div><p className="text-[11px] font-black">Sky-Tech Central Hub</p><p className="text-[9px] text-sky-300">Poblacion, Sibagat, Agusan</p></div></div><div className="absolute bottom-3 right-3 w-[16rem] max-w-[calc(100%-1.5rem)] rounded-xl bg-[#071329]/95 p-2.5 shadow-xl"><div className="flex flex-col gap-2"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold">{selectedCoverage}</p><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${selectedCoverageDetails?.[2] === 'active' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>{selectedCoverageDetails?.[2] === 'active' ? 'Active' : 'Expanding'}</span></div><p className="text-[11px] text-blue-100/80">{selectedCoverageDetails?.[1] || 'Coverage area selected'}{selectedCoverageDetails?.[2] === 'active' ? ' · Up to 300 Mbps' : ''}</p><button onClick={onBook} className="w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500">Apply for {selectedCoverage} -&gt;</button></div></div></div><a href="https://www.openstreetmap.org/?mlat=8.8211&amp;mlon=125.6980#map=12/8.8211/125.6980" target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-blue-200/70 hover:text-white">View larger map on OpenStreetMap <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5" /><path d="M13 11 19 5" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg></a></div><div><h3 className="text-xl font-black">Covered Barangays in Sibagat</h3><p className="mt-1 text-xs leading-5 text-blue-100/75">Click any barangay to inspect network status or apply for instant installation:</p><div className="mt-4 grid grid-cols-2 gap-2">{coverageAreas.map(([area, status, state]) => <button key={area} type="button" onClick={() => setSelectedCoverage(area)} className={`rounded-xl border p-2.5 text-left transition ${selectedCoverage === area ? 'border-white bg-sky-600' : state === 'active' ? 'border-white/10 bg-white/10 hover:border-sky-300' : 'border-amber-300/20 bg-amber-400/10 hover:border-amber-300'}`}><span className="flex items-center justify-between gap-2 text-sm font-bold"><span>{area}</span><span className={`h-2.5 w-2.5 rounded-full ${state === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} /></span><span className={`mt-1 block text-[11px] ${selectedCoverage === area ? 'text-white' : 'text-blue-100/70'}`}>{status}</span></button>)}</div><div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 p-3"><div><p className="text-sm font-bold">Selected: {selectedCoverage}</p>            <p className="mt-1 text-xs text-blue-100/75">{coverageDescriptions[selectedCoverage]}</p></div><button onClick={onBook} className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-blue-50">Apply Now</button></div></div></div></div></div></section>

      <footer className="bg-[#080f20] px-5 py-14 text-slate-400 lg:px-10"><div className="mx-auto max-w-7xl"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1.2fr]"><div><div className="flex items-center gap-3 text-white"><img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-11 w-11 rounded-full object-cover object-center" /><span className="text-xl font-black">Sky-Tech ISP</span></div><p className="mt-6 max-w-xs text-sm leading-7">Providing fast, transparent, and ultra-reliable fiber internet for local homes and businesses.</p></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Fiber Internet</h3><div className="mt-6 space-y-4 text-sm"><a href="#plans" className="block transition hover:text-white">Home Fiber Plans</a><a href="#coverage" className="block transition hover:text-white">Coverage Map</a><a href="#features" className="block transition hover:text-white">Why Choose Fiber</a><a href="#plans" className="block transition hover:text-white">Speed Test Portal</a></div></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Customer Support</h3><div className="mt-6 space-y-4 text-sm"><button onClick={onLogin} className="block transition hover:text-white">Subscriber Login</button><button onClick={onLogin} className="block transition hover:text-white">Pay Bill Online</button><button onClick={onLogin} className="block transition hover:text-white">Help Center &amp; FAQs</button><a href="#coverage" className="block transition hover:text-white">Network Status Page</a></div></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Local Office</h3><div className="mt-6 space-y-4 text-sm leading-6"><p className="flex items-start gap-3"><Icon name="pin" size={19} /><span>Poblacion, Agusan del Sur</span></p><p className="flex items-start gap-3"><span className="text-lg text-sky-500">@</span><span>support@skytech.net</span></p><p className="flex items-start gap-3"><span className="text-lg text-sky-500">&#9742;</span><span>Hotline: (085) 800-SKYTECH / 0917-123-4567</span></p></div><p className="mt-6 text-xs leading-5">Open Mon-Sat: 8:00 AM - 6:00 PM<br />24/7 Technical Dispatch</p></div></div><div className="mt-14 flex flex-col gap-4 border-t border-slate-800 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"><span>&copy; 2026 Sky-Tech ISP Inc. All rights reserved.</span><div className="flex flex-wrap gap-6"><a href="#" className="transition hover:text-white">Privacy Policy</a><a href="#" className="transition hover:text-white">Terms of Service</a><a href="#" className="transition hover:text-white">Fair Use Policy</a></div></div></div></footer>
    </main>
  );
}
