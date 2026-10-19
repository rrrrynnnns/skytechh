"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type AdminDatePickerProps = {
  value: string;
  minDate: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
  unavailableDates?: Set<string>;
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateLabel(value: string) {
  if (!value) return "Choose date";
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitialMonth(value: string, minDate: string) {
  const date = value ? parseDate(value) : parseDate(minDate);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function AdminDatePicker({
  value,
  minDate,
  onChange,
  disabled = false,
  name,
  unavailableDates = new Set<string>(),
}: AdminDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(() => getInitialMonth(value, minDate));
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closePicker(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, [isOpen]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    return index - firstDay + 1;
  });
  const minimumMonth = getInitialMonth("", minDate);
  const canGoToPreviousMonth =
    month.getFullYear() > minimumMonth.getFullYear() ||
    (month.getFullYear() === minimumMonth.getFullYear() &&
      month.getMonth() > minimumMonth.getMonth());

  return (
    <div ref={pickerRef} className="admin-date-picker relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span>{formatDateLabel(value)}</span>
        <CalendarDays size={18} className="text-slate-400" />
      </button>
      {isOpen && !disabled && (
        <div className="admin-date-picker-calendar absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoToPreviousMonth}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const dateValue = formatDate(date);
              const unavailable =
                dateValue < minDate ||
                date.getDay() === 0 ||
                unavailableDates.has(dateValue);
              return (
                <button
                  type="button"
                  key={dateValue}
                  disabled={unavailable}
                  onClick={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  className={`rounded-lg py-1.5 text-sm ${
                    unavailable
                      ? "admin-date-picker-unavailable cursor-not-allowed text-slate-300"
                      : dateValue === value
                        ? "admin-date-picker-selected bg-[#3b4fd8] text-white"
                        : "admin-date-picker-available text-slate-700 hover:bg-blue-50 hover:text-[#2447b6]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Sundays are unavailable.</p>
        </div>
      )}
    </div>
  );
}
