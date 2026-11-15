'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PaletteItem = { href: string; label: string; group: string; Icon: LucideIcon; keywords?: string };

export function AdminCommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.label} ${item.group} ${item.keywords ?? ''}`.toLowerCase().includes(term));
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    close();
    router.push(item.href);
  };

  const safeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        className="admin-palette w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((safeIndex + 1) % Math.max(results.length, 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((safeIndex - 1 + results.length) % Math.max(results.length, 1));
          }
          if (event.key === 'Enter') go(results[safeIndex]);
        }}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to a page..."
            className="h-14 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            style={{ border: 'none' }}
          />
          <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-400">No pages match &ldquo;{query}&rdquo;.</p>}
          {results.map((item, index) => {
            const isActive = index === safeIndex;
            const showGroup = index === 0 || results[index - 1].group !== item.group;
            return (
              <div key={item.href}>
                {showGroup && <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.group}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                    isActive ? 'admin-palette-active bg-blue-50 text-[#2166f3]' : 'text-slate-600'
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-[#2166f3] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <item.Icon size={16} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <CornerDownLeft size={14} className="opacity-70" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-400">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">↵</kbd> open</span>
          <span><kbd className="font-semibold">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
