"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import { PortalShell } from "@/app/components/PortalShell";
import { AdminDatePicker } from "@/app/components/AdminDatePicker";
import { formatPersonName } from "@/app/lib/name";

type Installation = readonly [
  string, // 0: id
  string, // 1: subscriber
  string, // 2: technician
  string, // 3: address
  string, // 4: date
  string, // 5: time
  string, // 6: type
  string, // 7: status
];
type Filter = "All" | "Scheduled" | "Completed" | "Installation_Rescheduled";
type Technician = { id: string; name: string; status: string };
type TicketSchedule = { technicianId: string | null; date: string | null; time: string | null };

const statusStyles: Record<string, string> = {
  Scheduled: "bg-emerald-50 text-emerald-600",
  "In Progress": "bg-emerald-50 text-emerald-600",
  "Installation Confirmed": "bg-emerald-50 text-emerald-600",
  Completed: "bg-slate-100 text-slate-600",
  "Installation Closed": "bg-slate-100 text-slate-600",
  Cancelled: "bg-amber-50 text-amber-600",
  "Installation Rescheduled": "bg-amber-50 text-amber-600",
  Installation_Rescheduled: "bg-amber-50 text-amber-600",
};

const statusLabels: Record<string, string> = {
  Scheduled: "Installation Confirmed",
  "In Progress": "Installation Confirmed",
  "Installation Confirmed": "Installation Confirmed",
  Completed: "Installation Closed",
  "Installation Closed": "Installation Closed",
  Cancelled: "Installation Rescheduled",
  "Installation Rescheduled": "Installation Rescheduled",
  Installation_Rescheduled: "Installation Rescheduled",
};

function getStatusLabel(status: string) {
  return statusLabels[status] || status;
}

function getMinimumVisitDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSunday(value: string) {
  return new Date(`${value}T00:00:00`).getDay() === 0;
}

function formatInstallationDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeTimeSlot(value: string | null | undefined) {
  if (!value) return "";
  if (value === "09:00") return "9:00 AM – 12:00 NN";
  if (value === "13:00") return "1:00 PM – 4:00 PM";
  return value;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminInstallationsPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [subscriberQuery, setSubscriberQuery] = useState("");
  const [isSubscriberDropdownOpen, setIsSubscriberDropdownOpen] = useState(false);
  const subscriberPickerRef = useRef<HTMLDivElement>(null);
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [installationStatus, setInstallationStatus] = useState("Scheduled");
  const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
  const [installationDate, setInstallationDate] = useState("");
  const [installationTime, setInstallationTime] = useState("");
  const [installationTechnician, setInstallationTechnician] = useState("");
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [ticketSchedules, setTicketSchedules] = useState<TicketSchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadInstallations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch("/api/installations", { cache: "no-store" });
      const result = await response.json();
      if (Array.isArray(result.data)) {
        setInstallations(
          result.data.map(
            (item: {
              id: string;
              subscriber?: {
                name: string;
                address: string;
                province?: string | null;
                city?: string | null;
                barangay?: string | null;
                street?: string | null;
                zipCode?: string | null;
              };
              technician?: { name: string };
              address: string;
              date: string;
              time: string;
              type: string;
              status: string;
            }) => [
              item.id,
              formatPersonName(item.subscriber?.name || ""),
              formatPersonName(item.technician?.name || ""),
              [
                item.subscriber?.street,
                item.subscriber?.barangay,
                item.subscriber?.city,
                item.subscriber?.province,
                item.subscriber?.zipCode,
              ]
                .filter(Boolean)
                .join(", ") ||
                item.subscriber?.address ||
                item.address,
              item.date.slice(0, 10),
              item.time,
              item.type,
              item.status.replace("_", " "),
            ],
          ),
        );
      }
    } catch {
      // ignore error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInstallations();
  }, [loadInstallations]);

  useEffect(() => {
    fetch("/api/tickets")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTicketSchedules(
            result.data.map((ticket: { technicianId?: string | null; visitDate?: string | null; visitTime?: string | null }) => ({
              technicianId: ticket.technicianId || null,
              date: ticket.visitDate || null,
              time: ticket.visitTime || null,
            })),
          );
        }
      })
      .catch(() => setTicketSchedules([]));
  }, []);

  useEffect(() => {
    fetch("/api/subscribers")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setSubscribers(result.data.map((item: { name: string }) => formatPersonName(item.name)));
        }
      })
      .catch(() => setSubscribers([]));
  }, []);

  useEffect(() => {
    fetch("/api/technicians")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) setTechnicians(result.data);
      })
      .catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    if (!isSubscriberDropdownOpen) return;
    function closeSubscriberDropdown(event: MouseEvent) {
      if (!subscriberPickerRef.current?.contains(event.target as Node)) {
        setIsSubscriberDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", closeSubscriberDropdown);
    return () => document.removeEventListener("mousedown", closeSubscriberDropdown);
  }, [isSubscriberDropdownOpen]);

  function handleInstallationDateChange(value: string) {
    if (value && isSunday(value)) {
      window.alert("Installations cannot be scheduled on Sundays.");
      setInstallationDate("");
      setScheduleChanged(true);
      return;
    }
    setInstallationDate(value);
    setScheduleChanged(true);
  }

  function openAddModal() {
    setEditingInstallation(null);
    setSubscriberQuery("");
    setIsSubscriberDropdownOpen(false);
    setInstallationStatus("Scheduled");
    setInstallationDate("");
    setInstallationTime("");
    setInstallationTechnician("");
    setScheduleChanged(false);
    setIsAdding(true);
  }

  function openManageModal(installation: Installation) {
    setEditingInstallation(installation);
    setInstallationStatus(
      installation[7] === "Completed" || installation[7] === "Installation Closed"
        ? "Completed"
        : installation[7] === "Cancelled" || installation[7] === "Installation Rescheduled"
          ? "Installation_Rescheduled"
          : "Scheduled",
    );
    setInstallationDate(installation[4]);
    setInstallationTime(normalizeTimeSlot(installation[5]));
    setInstallationTechnician(installation[2]);
    setScheduleChanged(false);
    setIsAdding(true);
  }

  function closeScheduleModal() {
    setIsAdding(false);
    setEditingInstallation(null);
    setSubscriberQuery("");
    setIsSubscriberDropdownOpen(false);
    setInstallationStatus("Scheduled");
    setInstallationDate("");
    setInstallationTime("");
    setInstallationTechnician("");
    setScheduleChanged(false);
  }

  const isTechnicianAvailable = (technician: Technician) =>
    !installations.some(
      (installation) =>
        installation[2] === formatPersonName(technician.name) &&
        installation[4] === installationDate &&
        normalizeTimeSlot(installation[5]) === normalizeTimeSlot(installationTime) &&
        installation[0] !== editingInstallation?.[0],
    ) &&
    !ticketSchedules.some(
      (ticket) =>
        ticket.technicianId === technician.id &&
        ticket.date?.slice(0, 10) === installationDate &&
        normalizeTimeSlot(ticket.time) === normalizeTimeSlot(installationTime),
    );

  const unavailableInstallationDates = useMemo(
    () =>
      new Set(
        technicians.length
          ? Array.from({ length: 366 }, (_, dayOffset) => {
              const date = new Date();
              date.setDate(date.getDate() + dayOffset + 1);
              return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0"),
              ].join("-");
            }).filter(
              (date) =>
                !technicians.some((technician) =>
                  ["9:00 AM – 12:00 NN", "1:00 PM – 4:00 PM"].some(
                    (time) =>
                      !installations.some(
                        (installation) =>
                          installation[2] === formatPersonName(technician.name) &&
                          installation[4] === date &&
                          normalizeTimeSlot(installation[5]) === time &&
                          installation[0] !== editingInstallation?.[0],
                      ) &&
                      !ticketSchedules.some(
                        (ticket) =>
                          ticket.technicianId === technician.id &&
                          ticket.date?.slice(0, 10) === date &&
                          normalizeTimeSlot(ticket.time) === time,
                      ),
                  ),
                ),
            )
          : [],
      ),
    [technicians, installations, ticketSchedules, editingInstallation],
  );

  const availableTechnicianCount = technicians.filter(isTechnicianAvailable).length;

  const filteredSubscribers = useMemo(() => {
    const availableSubscribers = subscribers.length
      ? subscribers
      : ["Maria Santos", "Omar Hassan", "David Kim", "Sofia Reyes"];
    const subscribersWithInstallations = new Set(
      installations.map((installation) => installation[1].trim().toLowerCase()),
    );
    return availableSubscribers.filter(
      (subscriber) =>
        !subscribersWithInstallations.has(subscriber.trim().toLowerCase()) &&
        subscriber.toLowerCase().includes(subscriberQuery.toLowerCase()),
    );
  }, [installations, subscriberQuery, subscribers]);

  const deduplicated = useMemo(
    () =>
      Array.from(
        new Map(
          installations.map((item) => [
            `${item[1]}-${item[2]}-${item[4]}-${normalizeTimeSlot(item[5])}-${item[6]}`,
            item,
          ]),
        ).values(),
      ),
    [installations],
  );

  const counts = useMemo(() => {
    let confirmed = 0;
    let closed = 0;
    let rescheduled = 0;
    for (const item of deduplicated) {
      const label = getStatusLabel(item[7]);
      if (label === "Installation Closed") closed += 1;
      else if (label === "Installation Rescheduled") rescheduled += 1;
      else confirmed += 1;
    }
    return { total: deduplicated.length, confirmed, closed, rescheduled };
  }, [deduplicated]);

  const visibleInstallations = useMemo(
    () =>
      deduplicated
        .filter((item) => {
          const label = getStatusLabel(item[7]);
          const matchesFilter =
            filter === "All" ||
            (filter === "Scheduled" && label === "Installation Confirmed") ||
            (filter === "Completed" && label === "Installation Closed") ||
            (filter === "Installation_Rescheduled" && label === "Installation Rescheduled");
          return matchesFilter && item.join(" ").toLowerCase().includes(query.toLowerCase());
        })
        .map(
          (item) =>
            item.map((value, index) =>
              index === 1 || index === 2 ? formatPersonName(value) : value,
            ) as unknown as Installation,
        ),
    [deduplicated, filter, query],
  );

  async function addSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    const subscriber = String(form.get("subscriber") || "").trim();
    const technician = installationTechnician || String(form.get("technician") || "").trim();
    const date = String(form.get("date") || "").trim();
    const time = String(form.get("time") || "").trim();
    const type = editingInstallation?.[6] || "Installation";
    const status = String(form.get("status") || "Scheduled");

    if ((!editingInstallation && !subscriber) || !technician || !date || !time) {
      window.alert(
        editingInstallation
          ? "Please select a visit date, time slot, and technician."
          : "Please select a subscriber, visit date, time slot, and technician.",
      );
      setIsSaving(false);
      return;
    }
    if (isSunday(date)) {
      window.alert("Installations cannot be scheduled on Sundays.");
      setIsSaving(false);
      return;
    }
    if (date < getMinimumVisitDate()) {
      window.alert("Please choose a future installation date.");
      setIsSaving(false);
      return;
    }

    if (editingInstallation) {
      const response = await fetch(`/api/installations/${editingInstallation[0]}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: String(form.get("address") || editingInstallation[3]),
          date,
          time,
          type,
          status,
          technicianName: technician,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        window.alert(result?.error || "Unable to save installation changes.");
        setIsSaving(false);
        return;
      }
      const result = await response.json();
      setInstallations((current) =>
        current.map((item) =>
          item[0] === editingInstallation[0]
            ? (() => {
                const savedInstallation = result.data;
                const savedStatus = String(savedInstallation?.status || status).replaceAll("_", " ");
                return [
                  item[0],
                  item[1],
                  technician,
                  savedInstallation?.address || String(form.get("address") || item[3]),
                  savedInstallation?.date?.slice(0, 10) || date,
                  savedInstallation?.time || time,
                  savedInstallation?.type || type,
                  savedStatus,
                ];
              })()
            : item,
        ),
      );
      closeScheduleModal();
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/installations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriberName: subscriber,
        technicianName: technician,
        date,
        time,
        type,
        status: "Scheduled",
      }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || "Unable to save installation.");
      setIsSaving(false);
      return;
    }
    const result = await response.json();
    const created = result.data;
    setInstallations((current) => [
      [
        created.id,
        subscriber,
        technician,
        created.address,
        created.date?.slice(0, 10) || date,
        created.time,
        created.type,
        created.status.replace("_", " "),
      ],
      ...current,
    ]);
    closeScheduleModal();
    setIsSaving(false);
  }

  function handleExportCsv() {
    if (!visibleInstallations.length) return;
    const header = ["Installation ID", "Subscriber", "Technician", "Date", "Time", "Status", "Address"];
    const csvRows = [
      header,
      ...visibleInstallations.map((i) => [
        i[0],
        i[1],
        i[2],
        formatInstallationDate(i[4]),
        normalizeTimeSlot(i[5]),
        getStatusLabel(i[7]),
        i[3],
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sky-tech-installations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: typeof CalendarDays;
    tile: string;
    bar: string;
    dot: string;
    target: Filter;
  }> = [
    {
      label: "Total schedules",
      value: counts.total,
      detail: "All installation visits",
      Icon: CalendarDays,
      tile: "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      dot: "text-blue-600",
      target: "All",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      detail: "Scheduled & active",
      Icon: CheckCircle2,
      tile: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
      dot: "text-emerald-600",
      target: "Scheduled",
    },
    {
      label: "Closed",
      value: counts.closed,
      detail: "Completed visits",
      Icon: Check,
      tile: "bg-violet-50 text-violet-600",
      bar: "bg-violet-500",
      dot: "text-slate-500",
      target: "Completed",
    },
    {
      label: "Rescheduled",
      value: counts.rescheduled,
      detail: counts.rescheduled > 0 ? "Needs new slot" : "All on schedule",
      Icon: CalendarClock,
      tile: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      dot: counts.rescheduled > 0 ? "text-amber-600" : "text-emerald-600",
      target: "Installation_Rescheduled",
    },
  ];

  const filterTabs: Array<[Filter, string, number]> = [
    ["All", "All", counts.total],
    ["Scheduled", "Confirmed", counts.confirmed],
    ["Completed", "Closed", counts.closed],
    ["Installation_Rescheduled", "Rescheduled", counts.rescheduled],
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Installations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule, assign technicians, and track fiber installation visits
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadInstallations(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!visibleInstallations.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Plus size={17} />
              Add Schedule
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, target }) => {
            const active = filter === target;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter((current) => (current === target ? "All" : target))}
                className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                  active ? "border-[#2166f3] ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
                      {loading ? (
                        <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-100 align-middle" />
                      ) : (
                        value.toLocaleString()
                      )}
                    </p>
                  </div>
                  <span className={`admin-stat-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tile}`}>
                    <Icon size={20} />
                  </span>
                </div>
                <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${dot}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {detail}
                </p>
                <span className={`absolute inset-x-0 bottom-0 h-0.5 ${bar} transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              </button>
            );
          })}
        </div>

        {/* Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subscriber, technician, or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[#2166f3] focus:bg-white"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
                {filterTabs.map(([key, label, count]) => {
                  const active = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {label}{" "}
                      <span className={`ml-1 tabular-nums ${active ? "text-[#2166f3]" : "text-slate-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {visibleInstallations.length} {visibleInstallations.length === 1 ? "record" : "records"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Subscriber</th>
                  <th className="px-5 py-3.5">Technician</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-7 w-20 animate-pulse rounded-xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleInstallations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <CalendarDays size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No installations found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || filter !== "All"
                          ? "Try adjusting your search or status filter."
                          : "Schedule your first installation to get started."}
                      </p>
                      {(query || filter !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setFilter("All");
                          }}
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleInstallations.map((item) => {
                    const [id, subscriberName, technicianName, address, date, time, , itemStatus] = item;
                    const label = getStatusLabel(itemStatus);
                    return (
                      <tr key={id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(subscriberName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{subscriberName}</p>
                              <p className="mt-0.5 max-w-xs truncate font-mono text-[11px] text-slate-400">
                                #{id}{address ? ` · ${address}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                            <Wrench size={14} className="shrink-0 text-slate-400" />
                            {technicianName || "Unassigned"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Calendar size={13} className="shrink-0 text-slate-400" />
                            {formatInstallationDate(date)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock size={12} className="shrink-0" />
                            {normalizeTimeSlot(time) || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${
                              statusStyles[itemStatus] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openManageModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2166f3] transition-colors hover:bg-blue-100"
                          >
                            <SlidersHorizontal size={13} />
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add / Manage Schedule Modal */}
      {isAdding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-3 backdrop-blur-xs sm:p-5"
          onMouseDown={closeScheduleModal}
        >
          <form
            onSubmit={addSchedule}
            onMouseDown={(event) => event.stopPropagation()}
            className={`admin-form-modal-scrollbar flex ${
              editingInstallation ? "h-[calc(100vh-2rem)] max-h-[90vh]" : "h-auto max-h-[calc(100vh-2rem)]"
            } w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-7">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingInstallation ? "Manage Installation" : "Add Schedule"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {editingInstallation
                    ? `Installation #${editingInstallation[0]}`
                    : "Assign a technician and visit slot"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-scroll">
              {editingInstallation ? (
                <>
                  <div className="px-6 pt-6 sm:px-7">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="font-bold text-slate-900">{editingInstallation[1]}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                        {editingInstallation[3] || "No address provided"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-200 pt-3 text-xs">
                        <span className="text-slate-500">
                          Service: <strong className="text-slate-800">{editingInstallation[6]}</strong>
                        </span>
                        <span className="text-slate-500">
                          ID: <strong className="font-mono text-slate-800">#{editingInstallation[0]}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-7 pt-6 sm:px-7">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Technician visit date and time
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <AdminDatePicker
                        name="date"
                        minDate={getMinimumVisitDate()}
                        value={installationDate}
                        onChange={handleInstallationDateChange}
                        unavailableDates={unavailableInstallationDates}
                        disabled={installationStatus === "Completed" || installationStatus === "Scheduled"}
                      />
                      <select
                        name="time"
                        value={normalizeTimeSlot(installationTime)}
                        onChange={(event) => {
                          setInstallationTime(event.target.value);
                          setScheduleChanged(true);
                        }}
                        disabled={installationStatus === "Completed" || installationStatus === "Scheduled"}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">— Time slot —</option>
                        <option value="9:00 AM – 12:00 NN">9:00 AM – 12:00 NN</option>
                        <option value="1:00 PM – 4:00 PM">1:00 PM – 4:00 PM</option>
                      </select>
                    </div>
                    <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Technician{" "}
                      {scheduleChanged && installationDate && installationTime && (
                        <span className="font-normal normal-case text-[#2447b6]">
                          ({availableTechnicianCount} available on this date and time)
                        </span>
                      )}
                      <select
                        name="technician"
                        disabled={!scheduleChanged && Boolean(editingInstallation?.[2] && editingInstallation?.[4] && editingInstallation?.[5])}
                        value={installationDate && installationTime ? installationTechnician : ""}
                        onChange={(event) => setInstallationTechnician(event.target.value)}
                        required
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">— Choose available technician —</option>
                        {(installationDate && installationTime
                          ? scheduleChanged
                            ? technicians.filter(
                                (technician) =>
                                  isTechnicianAvailable(technician) &&
                                  (technician.status === "Active" ||
                                    formatPersonName(technician.name) === installationTechnician),
                              )
                            : technicians.filter(
                                (technician) =>
                                  technician.status === "Active" ||
                                  formatPersonName(technician.name) === installationTechnician,
                              )
                          : []
                        ).map((technician) => (
                          <option value={formatPersonName(technician.name)} key={technician.id}>
                            {formatPersonName(technician.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                      <select
                        name="status"
                        value={installationStatus}
                        onChange={(event) => setInstallationStatus(event.target.value)}
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#3b4fd8]"
                      >
                        {![
                          "Completed",
                          "Cancelled",
                          "Installation_Rescheduled",
                          "Installation Closed",
                          "Installation Rescheduled",
                        ].includes(installationStatus) && (
                          <option value="Scheduled">Installation Confirmed</option>
                        )}
                        <option value="Completed">Installation Closed</option>
                        <option value="Installation_Rescheduled">Installation Rescheduled</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : (
                <div className="px-6 py-6 sm:px-7">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Subscriber
                    <div ref={subscriberPickerRef} className="relative">
                      <input
                        name="subscriber"
                        value={subscriberQuery}
                        onChange={(event) => {
                          setSubscriberQuery(event.target.value);
                          setIsSubscriberDropdownOpen(true);
                        }}
                        onFocus={() => setIsSubscriberDropdownOpen(true)}
                        required
                        placeholder="Search subscriber"
                        autoComplete="off"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                      />
                      {isSubscriberDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          {filteredSubscribers.length ? (
                            filteredSubscribers.map((subscriber) => (
                              <button
                                type="button"
                                key={subscriber}
                                onClick={() => {
                                  setSubscriberQuery(subscriber);
                                  setIsSubscriberDropdownOpen(false);
                                }}
                                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {subscriber}
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-2.5 text-sm text-slate-400">No subscribers found</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Technician visit date and time
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <AdminDatePicker
                        name="date"
                        minDate={getMinimumVisitDate()}
                        value={installationDate}
                        onChange={handleInstallationDateChange}
                        unavailableDates={unavailableInstallationDates}
                      />
                      <select
                        name="time"
                        value={installationTime}
                        onChange={(event) => {
                          setInstallationTime(event.target.value);
                          setScheduleChanged(true);
                        }}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                      >
                        <option value="">— Time slot —</option>
                        <option value="9:00 AM – 12:00 NN">9:00 AM – 12:00 NN</option>
                        <option value="1:00 PM – 4:00 PM">1:00 PM – 4:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Technician{" "}
                    {scheduleChanged && installationDate && installationTime && (
                      <span className="font-normal normal-case text-[#2447b6]">
                        ({availableTechnicianCount} available on this date and time)
                      </span>
                    )}
                    <select
                      name="technician"
                      value={installationDate && installationTime ? installationTechnician : ""}
                      onChange={(event) => setInstallationTechnician(event.target.value)}
                      required
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                    >
                      <option value="">— Choose available technician —</option>
                      {(installationDate && installationTime
                        ? technicians.filter(
                            (technician) => isTechnicianAvailable(technician) && technician.status === "Active",
                          )
                        : []
                      ).map((technician) => (
                        <option value={formatPersonName(technician.name)} key={technician.id}>
                          {formatPersonName(technician.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 hover:bg-[#1d57d6]"
              >
                {isSaving ? "Saving..." : editingInstallation ? "Save Changes" : "Add Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
