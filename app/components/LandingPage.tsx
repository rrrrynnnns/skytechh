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
          <div className="flex items-center gap-2 sm:gap-3"><button onClick={onLogin} className="rounded-full px-3 py-2 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white sm:px-4">Sign in</button><button onClick={onBook} className="rounded-full bg-[#2166f3] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#1d57d6] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#071329]">Book now</button></div>
          </nav>
        </header>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-28 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-36">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              100% Fiber Optic Network &middot; Sibagat, Agusan del Sur
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              The internet your home has been{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                waiting for.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-blue-100/75 sm:text-base">
              Say goodbye to lag, hidden price spikes, and automated support bots. Sky-Tech delivers ultra-reliable
              fiber backed by our friendly local team right here in Sibagat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onBook}
                className="inline-flex items-center gap-2 rounded-full bg-[#2166f3] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#1d57d6] focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Book now <Icon name="arrow" size={17} />
              </button>
              <a
                href="#plans"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToPlans();
                }}
                className="rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-blue-100 backdrop-blur-xs transition hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                Explore plans
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-blue-100/90">
              {['Plans starting at ₱999/mo', 'No lock-in contract options', 'Free Wi-Fi 6 Router Installation'].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-sky-500/20 text-sky-400">
                      <Icon name="check" size={13} />
                    </span>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative min-h-[22rem] overflow-visible sm:min-h-[31rem]">
            <div className="absolute -inset-5 rounded-[2rem] bg-blue-500/20 blur-2xl" />
            <div className="relative h-full min-h-[22rem] overflow-hidden rounded-[2rem] border border-white/15 bg-[#0b1d3a] shadow-2xl sm:min-h-[31rem]">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85"
                alt="Family using a laptop together at home"
                className="h-full min-h-[22rem] w-full object-cover opacity-80 sm:min-h-[31rem]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-[#071329]/25 to-transparent" />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#071329]/80 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Wi-Fi 6 &middot; Pure Fiber to the Home
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="max-w-sm text-xl font-bold leading-snug text-white">
                  Every call, class, stream, and game&mdash;connected.
                </p>
                <p className="mt-1.5 text-sm text-blue-100/75">Fiber built for the way your home lives.</p>
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Speeds up to</p>
                    <p className="mt-0.5 text-sm font-black text-white">300 Mbps</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Reliability</p>
                    <p className="mt-0.5 text-sm font-black text-white">99.9% Uptime</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Support</p>
                    <p className="mt-0.5 text-sm font-black text-white">Local Team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="bg-[#f7faff] px-5 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#2166f3]">
              Why Sky-Tech Fiber
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">
              Built for real homes. Backed by real neighbors.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              We built the internet provider we always wished we had &mdash; no fine-print tricks, constant dropouts, or
              impersonal phone menus.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map(([icon, title, text], index) => {
              const accents = [
                { tile: 'bg-blue-50 text-[#2166f3]', bar: 'bg-[#2166f3]' },
                { tile: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
                { tile: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500' },
                { tile: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
                { tile: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500' },
                { tile: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500' },
              ];
              const accent = accents[index % accents.length];
              return (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-7 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-12 w-12 place-items-center rounded-xl ${accent.tile}`}>
                      <Icon name={icon} size={24} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-slate-300 transition-colors group-hover:text-[#2166f3]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight text-[#071329]">{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-500">{text}</p>
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.bar} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="plans" className="bg-white px-5 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#2166f3]">
              Straightforward Pricing
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#071329] sm:text-4xl">
              A fiber plan for every household size.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              All plans include unlimited data, free installation, and a high-speed Wi-Fi 6 router.
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-7 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPopular = plan.speedMbps === 200;
              const details = getPlanDetails(plan.speedMbps);
              return (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-3xl border bg-white p-8 transition duration-200 hover:-translate-y-1 ${
                    isPopular
                      ? 'border-[#2166f3] ring-4 ring-blue-50 shadow-[0_24px_50px_rgba(33,102,243,0.16)]'
                      : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2166f3] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-blue-500/30">
                      Most popular for families
                    </span>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`w-fit rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                        isPopular ? 'bg-blue-50 text-[#2166f3]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {details.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Unlimited Fiber</span>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-3xl font-black tracking-tight text-[#071329]">{plan.speedMbps} Mbps</h3>
                    <p className="mt-2 min-h-11 text-sm leading-6 text-slate-500">{details.description}</p>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50/80 px-4 py-4">
                    <p className={`text-3xl font-black tracking-tight tabular-nums ${isPopular ? 'text-[#2166f3]' : 'text-[#071329]'}`}>
                      &#8369;{plan.price.toLocaleString()}
                      <span className="text-sm font-semibold text-slate-500"> / month</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{details.billing}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {details.features.map((feature, index) => (
                      <p key={feature} className="flex items-start gap-2.5 text-sm font-medium leading-5 text-slate-600">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <Icon name="check" size={12} />
                        </span>
                        <span>{index === 0 ? `${plan.speedMbps} Mbps ${feature}` : feature}</span>
                      </p>
                    ))}
                  </div>

                  <div className="mt-auto pt-8">
                    <button
                      type="button"
                      onClick={onBook}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition ${
                        isPopular
                          ? 'bg-[#2166f3] text-white shadow-md shadow-blue-500/25 hover:bg-[#1d57d6]'
                          : 'border border-slate-200 bg-slate-50 text-[#071329] hover:border-[#2166f3] hover:bg-blue-50/50 hover:text-[#2166f3]'
                      }`}
                    >
                      {isPopular ? `Get ${plan.speedMbps} Mbps Now` : `Choose ${plan.speedMbps} Mbps`}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="coverage" className="bg-white px-5 py-16 text-[#071329] lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#2166f3]">
              Fiber Network Map &middot; Sibagat, Agusan del Sur
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#071329] sm:text-4xl">
              Check if Sky-Tech Fiber has reached your street.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Sky-Tech is locally headquartered in Sibagat. Type your barangay or street below, or explore the live
              coverage map to check real-time fiber availability.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const query = coverageQuery.trim();
                const match = coverageAreas.find(([area]) => area.toLowerCase() === query.toLowerCase());
                const result = match?.[0] || query || 'Poblacion';
                setSelectedCoverage(result);
                setCoverageSearchResult(result);
              }}
              className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/70 transition focus-within:border-[#2166f3] focus-within:ring-4 focus-within:ring-blue-50 sm:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  aria-label="Search coverage area"
                  value={coverageQuery}
                  onChange={(event) => setCoverageQuery(event.target.value)}
                  placeholder="e.g. Poblacion, Mahayahay, San Vicente, El Rio..."
                  className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-10 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:!border-0 focus:!shadow-none"
                />
                {coverageQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setCoverageQuery('');
                      setCoverageSearchResult(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    &times;
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#2166f3] px-7 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d57d6] sm:w-auto"
              >
                Check Coverage
              </button>
            </form>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-semibold text-slate-400">Popular areas:</span>
              {['Poblacion', 'Mahayahay', 'San Vicente', 'El Rio', 'Afga'].map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => {
                    setCoverageQuery(area);
                    setSelectedCoverage(area);
                    setCoverageSearchResult(area);
                  }}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    selectedCoverage === area
                      ? 'border-blue-200 bg-blue-50 text-[#2166f3]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-[#2166f3]'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>

            {coverageSearchResult && (
              <div
                className={`mx-auto mt-6 flex max-w-3xl gap-4 rounded-2xl border p-5 text-left shadow-lg ${
                  coverageSearchIsExpanding
                    ? 'border-amber-200 bg-amber-50 shadow-amber-100/70'
                    : 'border-sky-200 bg-sky-50 shadow-sky-100/70'
                }`}
              >
                <svg
                  aria-hidden="true"
                  className={`mt-0.5 h-8 w-8 shrink-0 ${
                    coverageSearchIsExpanding ? 'text-amber-500' : 'text-emerald-500'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d={coverageSearchIsExpanding ? 'M12 8v4M12 16h.01' : 'm8 12 2.5 2.5L16 9'} />
                </svg>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-[#071329]">
                    {coverageSearchIsExpanding ? 'Upcoming Expansion Area' : '\u2713 Fiber Available!'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    {coverageSearchIsExpanding
                      ? `Barangay ${coverageSearchResult}, Sibagat is in our current expansion phase. You can pre-book now to be connected first!`
                      : `Pure Fiber is ACTIVE in Barangay ${coverageSearchResult}, Sibagat! Speeds up to 300 Mbps are ready for same-day dispatch.`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onBook}
                      className="rounded-xl bg-[#2166f3] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1d57d6]"
                    >
                      Apply for this Address &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverageSearchResult(null)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-800/40 bg-gradient-to-br from-[#071329] via-[#0b1d3a] to-[#0f2952] p-5 text-white shadow-[0_24px_60px_rgba(7,19,41,0.28)] sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    LIVE FIBER GRID &middot; SIBAGAT, AGUSAN DEL SUR
                  </span>
                  <span className="font-mono text-[11px] text-blue-200/75">8.8211&deg; N, 125.6980&deg; E</span>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-inner">
                  <iframe
                    title="Sky-Tech fiber coverage map"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=125.62%2C8.75%2C125.78%2C8.9&amp;layer=mapnik&amp;marker=8.8211%2C125.6980"
                    className="h-[27rem] w-full border-0"
                    loading="lazy"
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-2.5 rounded-xl border border-white/15 bg-[#071329]/90 px-3 py-2 shadow-xl backdrop-blur-md">
                    <img
                      src="/sky-tech-logo.png"
                      alt="Sky-Tech logo"
                      className="h-7 w-7 shrink-0 rounded-full object-cover object-center ring-1 ring-white/20"
                    />
                    <div>
                      <p className="text-[11px] font-black text-white">Sky-Tech Central Hub</p>
                      <p className="text-[10px] text-sky-300">Poblacion, Sibagat, Agusan</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 w-[16.5rem] max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/15 bg-[#071329]/90 p-3 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-white">{selectedCoverage}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          selectedCoverageDetails?.[2] === 'active'
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-amber-400/20 text-amber-300'
                        }`}
                      >
                        {selectedCoverageDetails?.[2] === 'active' ? 'Active' : 'Expanding'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-blue-100/80">
                      {selectedCoverageDetails?.[1] || 'Coverage area selected'}
                      {selectedCoverageDetails?.[2] === 'active' ? ' \u00b7 Up to 300 Mbps' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={onBook}
                      className="mt-2.5 w-full rounded-xl bg-[#2166f3] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1d57d6]"
                    >
                      Apply for {selectedCoverage} &rarr;
                    </button>
                  </div>
                </div>
                <a
                  href="https://www.openstreetmap.org/?mlat=8.8211&amp;mlon=125.6980#map=12/8.8211/125.6980"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-blue-200/70 transition hover:text-white"
                >
                  View larger map on OpenStreetMap
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 5h5v5" />
                    <path d="M13 11 19 5" />
                    <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                  </svg>
                </a>
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">Covered Barangays in Sibagat</h3>
                    <p className="mt-1 text-xs leading-5 text-blue-100/70">
                      Select a barangay to inspect fiber availability or apply for installation:
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-blue-100/80">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Active Fiber
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Expanding Soon
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  {coverageAreas.map(([area, status, state]) => {
                    const isSelected = selectedCoverage === area;
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setSelectedCoverage(area)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-sky-300 bg-[#2166f3] shadow-lg shadow-blue-950/50'
                            : state === 'active'
                              ? 'border-white/10 bg-white/[0.06] hover:border-sky-400/50 hover:bg-white/[0.11]'
                              : 'border-amber-400/20 bg-amber-400/[0.08] hover:border-amber-300/60 hover:bg-amber-400/[0.14]'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-bold text-white">
                          <span className="truncate">{area}</span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              state === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                        </span>
                        <span className={`mt-1 block text-[11px] ${isSelected ? 'text-blue-50' : 'text-blue-100/70'}`}>
                          {status}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Selected: {selectedCoverage}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            selectedCoverageDetails?.[2] === 'active'
                              ? 'bg-emerald-400/20 text-emerald-300'
                              : 'bg-amber-400/20 text-amber-300'
                          }`}
                        >
                          {selectedCoverageDetails?.[2] === 'active' ? 'Active' : 'Expanding'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-blue-100/75">
                        {coverageDescriptions[selectedCoverage] ||
                          (selectedCoverageDetails?.[2] === 'active'
                            ? '100% Pure Fiber ready for installation'
                            : 'Scheduled for upcoming fiber expansion')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onBook}
                      className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#071329] shadow-sm transition hover:bg-blue-50"
                    >
                      Apply Now &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#080f20] px-5 py-14 text-slate-400 lg:px-10"><div className="mx-auto max-w-7xl"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1.2fr]"><div><div className="flex items-center gap-3 text-white"><img src="/sky-tech-logo.png" alt="Sky-Tech logo" className="h-11 w-11 rounded-full object-cover object-center" /><span className="text-xl font-black">Sky-Tech ISP</span></div><p className="mt-6 max-w-xs text-sm leading-7">Providing fast, transparent, and ultra-reliable fiber internet for local homes and businesses.</p></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Fiber Internet</h3><div className="mt-6 space-y-4 text-sm"><a href="#plans" className="block transition hover:text-white">Home Fiber Plans</a><a href="#coverage" className="block transition hover:text-white">Coverage Map</a><a href="#features" className="block transition hover:text-white">Why Choose Fiber</a><a href="#plans" className="block transition hover:text-white">Speed Test Portal</a></div></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Customer Support</h3><div className="mt-6 space-y-4 text-sm"><button onClick={onLogin} className="block transition hover:text-white">Subscriber Login</button><button onClick={onLogin} className="block transition hover:text-white">Pay Bill Online</button><button onClick={onLogin} className="block transition hover:text-white">Help Center &amp; FAQs</button><a href="#coverage" className="block transition hover:text-white">Network Status Page</a></div></div><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Local Office</h3><div className="mt-6 space-y-4 text-sm leading-6"><p className="flex items-start gap-3"><Icon name="pin" size={19} /><span>Poblacion, Agusan del Sur</span></p><p className="flex items-start gap-3"><span className="text-lg text-sky-500">@</span><span>support@skytech.net</span></p><p className="flex items-start gap-3"><span className="text-lg text-sky-500">&#9742;</span><span>Hotline: (085) 800-SKYTECH / 0917-123-4567</span></p></div><p className="mt-6 text-xs leading-5">Open Mon-Sat: 8:00 AM - 6:00 PM<br />24/7 Technical Dispatch</p></div></div><div className="mt-14 flex flex-col gap-4 border-t border-slate-800 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"><span>&copy; 2026 Sky-Tech ISP Inc. All rights reserved.</span><div className="flex flex-wrap gap-6"><a href="#" className="transition hover:text-white">Privacy Policy</a><a href="#" className="transition hover:text-white">Terms of Service</a><a href="#" className="transition hover:text-white">Fair Use Policy</a></div></div></div></footer>
    </main>
  );
}
