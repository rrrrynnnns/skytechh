'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export type TrendPoint = { label: string; value: number };

/* ---------------------------------- utils --------------------------------- */

const trimNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, ''));
const signed = (value: number, text: string) => `${value > 0 ? '+' : ''}${text}`;

export const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString()}`;

export function formatCompactPeso(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${trimNumber(value / 1_000_000)}M`;
  if (abs >= 1_000) return `₱${trimNumber(value / 1_000)}k`;
  return `₱${Math.round(value)}`;
}

function percentChange(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function niceStep(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

type Scale = { min: number; max: number; ticks: number[]; toPercent: (value: number) => number };

/** Builds a "nice" axis (round tick values, a bit of headroom above the highest value). */
function buildScale(values: number[], { integer = false, zeroBased = true } = {}): Scale {
  const high = Math.max(0, ...values);
  const rawLow = zeroBased || !values.length ? 0 : Math.min(...values);
  let step = niceStep((high - rawLow || high || 1) / 4);
  if (integer) step = Math.max(1, Math.ceil(step));

  const min = zeroBased ? 0 : Math.max(0, Math.floor(rawLow / step) * step - step);
  let max = min + Math.ceil((high - min) / step) * step;
  if (max <= high) max += step;

  const count = Math.round((max - min) / step);
  const ticks = Array.from({ length: count + 1 }, (_, index) => max - index * step);
  const toPercent = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return { min, max, ticks, toPercent };
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}

/* ------------------------------- primitives ------------------------------- */

function TrendPill({ value, label }: { value: number | null; label: string }) {
  const up = value !== null && value > 0;
  const down = value !== null && value < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const tone = up ? 'bg-emerald-50 text-emerald-600' : down ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500';

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tone}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function MiniStat({ label, value, tone = 'text-slate-800' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-l border-slate-100 pl-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function ChartTooltip({
  index,
  count,
  topPercent,
  title,
  value,
  change,
}: {
  index: number;
  count: number;
  topPercent: number;
  title: string;
  value: string;
  change: { value: number; text: string } | null;
}) {
  const shiftX = count > 2 && index === 0 ? '-18%' : count > 2 && index === count - 1 ? '-82%' : '-50%';

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: `${((index + 0.5) / count) * 100}%`,
        top: `${100 - topPercent}%`,
        transform: `translate(${shiftX}, calc(-100% - 14px))`,
      }}
    >
      <div className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-white shadow-xl shadow-slate-900/20">
        <p className="text-[11px] font-medium text-slate-400">{title}</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
        {change && (
          <p
            className={`mt-0.5 text-[11px] font-semibold ${
              change.value > 0 ? 'text-emerald-400' : change.value < 0 ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {change.text}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartFrame({
  labels,
  scale,
  formatTick,
  active,
  onActiveChange,
  loading,
  empty,
  emptyText,
  tooltip,
  children,
}: {
  labels: string[];
  scale: Scale;
  formatTick: (value: number) => string;
  active: number | null;
  onActiveChange: (index: number | null) => void;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  tooltip: ReactNode;
  children: ReactNode;
}) {
  const count = Math.max(labels.length, 1);
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  return (
    <div className="mt-6 grid grid-cols-[3.25rem_minmax(0,1fr)] grid-rows-[13.5rem_auto]">
      {/* Y axis */}
      <div className="relative" aria-hidden>
        {scale.ticks.map((tick, index) => (
          <span
            key={`tick-${index}`}
            className="absolute right-3 -translate-y-1/2 text-[11px] font-medium tabular-nums text-slate-400"
            style={{ top: `${100 - scale.toPercent(tick)}%` }}
          >
            {formatTick(tick)}
          </span>
        ))}
      </div>

      {/* Plot area */}
      <div className="relative" onMouseLeave={() => onActiveChange(null)}>
        {scale.ticks.map((tick, index) => (
          <div
            key={`grid-${index}`}
            className={`absolute inset-x-0 border-t ${tick === scale.min ? 'border-slate-200' : 'border-dashed border-slate-100'}`}
            style={{ top: `${100 - scale.toPercent(tick)}%` }}
          />
        ))}

        {active !== null && (
          <div
            className="absolute inset-y-0 rounded-lg bg-slate-50 transition-all duration-150"
            style={{ left: `${(active / count) * 100}%`, width: `${100 / count}%` }}
          />
        )}

        {children}

        {loading ? (
          <div className="absolute inset-0 animate-pulse rounded-lg bg-slate-50/80" />
        ) : empty ? (
          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">{emptyText}</span>
          </div>
        ) : (
          <div className="absolute inset-0 grid" style={columns}>
            {labels.map((label, index) => (
              <button
                key={`hit-${index}`}
                type="button"
                aria-label={label}
                className="h-full cursor-default rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                onMouseEnter={() => onActiveChange(index)}
                onFocus={() => onActiveChange(index)}
                onBlur={() => onActiveChange(null)}
                onClick={() => onActiveChange(index)}
              />
            ))}
          </div>
        )}

        {!loading && !empty && tooltip}
      </div>

      {/* X axis */}
      <div />
      <div className="grid pt-2.5" style={columns}>
        {labels.map((label, index) => (
          <span
            key={`label-${index}`}
            className={`text-center text-xs transition-colors ${
              active === index ? 'font-semibold text-slate-900' : index === count - 1 ? 'font-medium text-slate-600' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Monthly Revenue ---------------------------- */

export function RevenueCard({
  data,
  loading = false,
  subtitle = 'Paid bills collected over the last 6 months',
}: {
  data: TrendPoint[];
  loading?: boolean;
  subtitle?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const mounted = useMounted();

  const labels = data.map((point) => point.label);
  const values = data.map((point) => Number(point.value) || 0);
  const count = Math.max(values.length, 1);
  const scale = buildScale(values);

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = values.length ? total / values.length : 0;
  const latest = values.at(-1) ?? 0;
  const monthChange = percentChange(latest, values.at(-2));
  const bestIndex = values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
  const empty = values.every((value) => value === 0);

  const pillLabel =
    monthChange === null ? (latest > 0 ? 'New revenue this month' : 'No prior month') : `${signed(monthChange, trimNumber(Math.round(monthChange * 10) / 10))}% vs last month`;

  const activeChange = active !== null && active > 0 ? percentChange(values[active], values[active - 1]) : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-950">Monthly Revenue</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {!loading && <TrendPill value={monthChange} label={pillLabel} />}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="pr-2">
          <p className="text-3xl font-bold tracking-tight tabular-nums text-slate-950">{formatPeso(total)}</p>
          <p className="mt-0.5 text-xs text-slate-400">Total collected</p>
        </div>
        <MiniStat label="This month" value={formatPeso(latest)} />
        <MiniStat label="Monthly avg" value={formatPeso(average)} />
        <MiniStat label="Best month" value={empty ? '—' : labels[bestIndex]} tone="text-[#2f68e6]" />
      </div>

      <ChartFrame
        labels={labels}
        scale={scale}
        formatTick={formatCompactPeso}
        active={active}
        onActiveChange={setActive}
        loading={loading}
        empty={empty}
        emptyText="No revenue collected yet"
        tooltip={
          active !== null && (
            <ChartTooltip
              index={active}
              count={count}
              topPercent={scale.toPercent(values[active])}
              title={labels[active]}
              value={formatPeso(values[active])}
              change={
                active > 0
                  ? activeChange === null
                    ? { value: 1, text: `New vs ${labels[active - 1]}` }
                    : { value: activeChange, text: `${signed(activeChange, trimNumber(Math.round(activeChange * 10) / 10))}% vs ${labels[active - 1]}` }
                  : null
              }
            />
          )
        }
      >
        {/* Bars */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {values.map((value, index) => {
            const isLatest = index === values.length - 1;
            const dimmed = active !== null && active !== index;
            const height = value ? Math.max(1.5, scale.toPercent(value)) : 1.5;

            return (
              <div key={`bar-${index}`} className="relative flex h-full items-end justify-center">
                <div
                  className={`relative w-[46%] max-w-11 rounded-t-md transition-[height,opacity] duration-700 ease-out ${
                    !value
                      ? 'bg-slate-200'
                      : isLatest
                        ? 'bg-linear-to-t from-[#1f4fc4] to-[#3b74ee] shadow-md shadow-blue-500/20'
                        : 'bg-linear-to-t from-[#5f8ff0] to-[#9dbdf7]'
                  } ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                  style={{ height: mounted ? `${height}%` : '0%' }}
                >
                  {value > 0 && active !== index && (
                    <span
                      className={`absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums transition-opacity ${
                        isLatest ? 'text-[#1f4fc4]' : 'text-slate-500'
                      } ${dimmed ? 'opacity-0' : 'opacity-100'}`}
                    >
                      {formatCompactPeso(value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Average line */}
        {!empty && !loading && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-amber-400/80"
            style={{ top: `${100 - scale.toPercent(average)}%` }}
          >
            <span className="absolute -top-2.5 -right-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-amber-600 ring-1 ring-amber-200">
              Avg
            </span>
          </div>
        )}
      </ChartFrame>
    </section>
  );
}

/* ---------------------------- Subscriber Growth --------------------------- */

export function SubscriberGrowthCard({
  data,
  loading = false,
  subtitle = 'Active subscribers by month',
}: {
  data: TrendPoint[];
  loading?: boolean;
  subtitle?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const mounted = useMounted();
  const gradientId = `growth-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const labels = data.map((point) => point.label);
  const values = data.map((point) => Number(point.value) || 0);
  const count = Math.max(values.length, 1);
  const scale = buildScale(values, { integer: true, zeroBased: false });

  const first = values[0] ?? 0;
  const latest = values.at(-1) ?? 0;
  const monthDelta = values.length > 1 ? latest - values[values.length - 2] : 0;
  const netNew = latest - first;
  const averagePerMonth = values.length > 1 ? netNew / (values.length - 1) : 0;
  const growthRate = first > 0 ? (netNew / first) * 100 : null;
  const empty = values.every((value) => value === 0);

  const points = values.map((value, index) => ({ x: ((index + 0.5) / count) * 100, y: 100 - scale.toPercent(value) }));
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const areaPath = points.length ? `${linePath} L ${points.at(-1)!.x} 100 L ${points[0].x} 100 Z` : '';

  const deltaTone = (value: number) => (value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-500' : 'text-slate-800');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-950">Subscriber Growth</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {!loading && <TrendPill value={monthDelta} label={`${signed(monthDelta, String(monthDelta))} this month`} />}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="pr-2">
          <p className="text-3xl font-bold tracking-tight tabular-nums text-slate-950">{latest.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-400">Active subscribers</p>
        </div>
        <MiniStat label={`Net new (${values.length} mo)`} value={signed(netNew, netNew.toLocaleString())} tone={deltaTone(netNew)} />
        <MiniStat label="Avg / month" value={signed(averagePerMonth, trimNumber(Math.round(averagePerMonth * 10) / 10))} tone={deltaTone(averagePerMonth)} />
        <MiniStat
          label="Growth rate"
          value={growthRate === null ? '—' : `${signed(growthRate, trimNumber(Math.round(growthRate * 10) / 10))}%`}
          tone={growthRate === null ? 'text-slate-800' : deltaTone(growthRate)}
        />
      </div>

      <ChartFrame
        labels={labels}
        scale={scale}
        formatTick={(value) => value.toLocaleString()}
        active={active}
        onActiveChange={setActive}
        loading={loading}
        empty={empty}
        emptyText="No subscriber data yet"
        tooltip={
          active !== null && (
            <ChartTooltip
              index={active}
              count={count}
              topPercent={scale.toPercent(values[active])}
              title={labels[active]}
              value={`${values[active].toLocaleString()} subscribers`}
              change={
                active > 0
                  ? (() => {
                      const delta = values[active] - values[active - 1];
                      return { value: delta, text: `${signed(delta, String(delta))} vs ${labels[active - 1]}` };
                    })()
                  : null
              }
            />
          )
        }
      >
        {!empty && !loading && (
          <>
            {/* Area + line */}
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#3b71ed" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#3b71ed" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                className="transition-opacity duration-700"
                style={{ opacity: mounted ? 1 : 0 }}
              />
              <path
                d={linePath}
                fill="none"
                stroke="#2f6bed"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Crosshair */}
            {active !== null && (
              <div
                className="pointer-events-none absolute bottom-0 border-l border-dashed border-blue-300"
                style={{ left: `${points[active].x}%`, top: `${points[active].y}%` }}
              />
            )}

            {/* Points */}
            {points.map((point, index) => {
              const isActive = active === index;
              const isLatest = index === points.length - 1;
              return (
                <span
                  key={`pt-${index}`}
                  className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2f6bed] transition-all duration-150 ${
                    isActive ? 'h-4 w-4 bg-[#2f6bed] ring-4 ring-blue-100' : isLatest ? 'h-3 w-3 bg-[#2f6bed] ring-4 ring-blue-50' : 'h-2.5 w-2.5 bg-white'
                  }`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                />
              );
            })}
          </>
        )}
      </ChartFrame>
    </section>
  );
}


/* ----------------------------- Billing Status ----------------------------- */

export type BillingMix = { paid: number; unpaid: number; overdue: number };

const billingSegments: Array<{
  key: keyof BillingMix;
  label: string;
  color: string;
  dot: string;
  text: string;
  bar: string;
  activeBorder: string;
}> = [
  {
    key: 'paid',
    label: 'Paid',
    color: '#10b981',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
    activeBorder: 'border-emerald-300 bg-emerald-50/40',
  },
  {
    key: 'unpaid',
    label: 'Unpaid',
    color: '#f59e0b',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
    activeBorder: 'border-amber-300 bg-amber-50/40',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    color: '#f43f5e',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
    bar: 'bg-rose-500',
    activeBorder: 'border-rose-300 bg-rose-50/40',
  },
];

export function BillingStatusCard({
  mix,
  loading = false,
  subtitle = 'Current bill mix',
}: {
  mix: BillingMix;
  loading?: boolean;
  subtitle?: string;
}) {
  const [active, setActive] = useState<keyof BillingMix | null>(null);
  const mounted = useMounted();

  const counts: BillingMix = {
    paid: Math.max(0, Number(mix.paid) || 0),
    unpaid: Math.max(0, Number(mix.unpaid) || 0),
    overdue: Math.max(0, Number(mix.overdue) || 0),
  };

  const total = counts.paid + counts.unpaid + counts.overdue;
  const empty = total === 0;
  const collectionRate = total ? Math.round((counts.paid / total) * 100) : 0;
  const attentionCount = counts.unpaid + counts.overdue;

  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const nonZeroCount = billingSegments.filter((seg) => counts[seg.key] > 0).length;
  const gap = nonZeroCount > 1 ? 3 : 0;

  const arcs = billingSegments.map((seg, index) => {
    const value = counts[seg.key];
    const pct = total ? Math.round((value / total) * 100) : 0;
    const rawLen = total ? (value / total) * circumference : 0;
    const len = value > 0 ? Math.max(2, rawLen - gap) : 0;
    const priorTotal = billingSegments.slice(0, index).reduce((sum, prev) => sum + counts[prev.key], 0);
    const offset = total ? (priorTotal / total) * circumference : 0;
    return { ...seg, value, pct, len, offset };
  });

  const activeArc = active ? arcs.find((a) => a.key === active) ?? null : null;
  const formatBills = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'bill' : 'bills'}`;

  const pillTone = empty
    ? 'bg-slate-100 text-slate-500'
    : collectionRate >= 70
      ? 'bg-emerald-50 text-emerald-600'
      : collectionRate >= 40
        ? 'bg-amber-50 text-amber-600'
        : 'bg-red-50 text-red-500';

  return (
    <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-950">Billing Status</h2>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
          {!loading && (
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${pillTone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {empty ? 'No bills yet' : `${collectionRate}% collected`}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="pr-2">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-slate-950">{total.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-400">Total bills</p>
          </div>
          <MiniStat label="Settled" value={formatBills(counts.paid)} tone="text-emerald-600" />
          <MiniStat label="Needs attention" value={formatBills(attentionCount)} tone={attentionCount > 0 ? 'text-amber-600' : 'text-slate-800'} />
        </div>
      </div>

      {loading ? (
        <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-44 w-44 shrink-0 animate-pulse rounded-full border-[22px] border-slate-100" />
          <div className="w-full flex-1 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
          {/* Donut chart */}
          <div className="relative h-44 w-44 shrink-0" onMouseLeave={() => setActive(null)}>
            <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90 overflow-visible" aria-label="Billing status distribution">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="22" className="text-slate-100" />
              {!empty &&
                arcs.map((arc) => {
                  if (arc.value === 0) return null;
                  const isActive = active === arc.key;
                  const isDimmed = active !== null && !isActive;
                  return (
                    <circle
                      key={arc.key}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isActive ? 26 : 22}
                      strokeDasharray={`${mounted ? arc.len : 0} ${circumference}`}
                      strokeDashoffset={-arc.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer transition-all duration-500 ease-out"
                      style={{ opacity: isDimmed ? 0.3 : 1 }}
                      onMouseEnter={() => setActive(arc.key)}
                      onClick={() => setActive((cur) => (cur === arc.key ? null : arc.key))}
                    />
                  );
                })}
            </svg>

            {/* Center readout */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {empty ? (
                <>
                  <span className="text-2xl font-bold tabular-nums text-slate-400">0</span>
                  <span className="mt-0.5 text-[11px] font-medium text-slate-400">No bills</span>
                </>
              ) : activeArc ? (
                <>
                  <span className={`text-2xl font-bold tabular-nums ${activeArc.text}`}>{activeArc.pct}%</span>
                  <span className="text-xs font-semibold text-slate-700">{activeArc.label}</span>
                  <span className="text-[11px] tabular-nums text-slate-400">{formatBills(activeArc.value)}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums text-slate-950">{collectionRate}%</span>
                  <span className="text-[11px] font-semibold text-slate-400">Paid rate</span>
                </>
              )}
            </div>
          </div>

          {/* Interactive breakdown list */}
          <div className="w-full flex-1 space-y-2.5" onMouseLeave={() => setActive(null)}>
            {arcs.map((arc) => {
              const isActive = active === arc.key;
              const isDimmed = active !== null && !isActive;
              return (
                <button
                  key={arc.key}
                  type="button"
                  onMouseEnter={() => setActive(arc.key)}
                  onFocus={() => setActive(arc.key)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive((cur) => (cur === arc.key ? null : arc.key))}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 ${
                    isActive
                      ? `${arc.activeBorder} shadow-sm`
                      : 'border-slate-100 bg-slate-50/70 hover:border-slate-200 hover:bg-slate-50'
                  } ${isDimmed ? 'opacity-55' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${arc.dot}`} />
                      {arc.label}
                    </span>
                    <span className="flex items-center gap-2.5 text-sm tabular-nums">
                      <span className={`font-bold ${arc.text}`}>{formatBills(arc.value)}</span>
                      <span className="w-9 text-right text-xs font-semibold text-slate-400">{arc.pct}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${arc.bar}`}
                      style={{ width: mounted ? `${arc.pct}%` : '0%' }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
