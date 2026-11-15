"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  MapPin,
  RefreshCw,
  Search,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { PortalShell } from "@/app/components/PortalShell";

type BookingStatus = "Pending" | "Reviewed" | "Approved" | "Rejected";
type Booking = {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  plan: string;
  preferredDate: string;
  submittedAt: string;
  status: BookingStatus;
  notes: string | null;
};

const BOOKING_ID_START = 1000000001;

const statusStyles: Record<BookingStatus, string> = {
  Pending: "bg-amber-50 text-amber-600",
  Reviewed: "bg-blue-50 text-blue-600",
  Approved: "bg-emerald-50 text-emerald-600",
  Rejected: "bg-red-50 text-red-500",
};

function splitBookingName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstNameParts = parts.length > 2 ? parts.slice(0, 2) : parts.slice(0, 1);
  return {
    firstName: firstNameParts.join(" "),
    middleName: parts.length > 3 ? parts.slice(2, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function getApplicantDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts.slice(0, 2).join(" ")} ${parts[parts.length - 1]}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function splitBookingAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim());
  return {
    street: parts[0] || "",
    barangay: parts[1] || "",
    city: parts[2] || "",
    province: parts[3] || "",
    zipCode: parts[4] || "",
  };
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getBookingDisplayId(booking: Booking, index: number) {
  return /^\d+$/.test(booking.id) ? booking.id : String(BOOKING_ID_START + index);
}

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | BookingStatus>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("Pending");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error(result.error || "Unable to load bookings.");
      setBookings(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const counts = useMemo(() => {
    let pending = 0;
    let reviewed = 0;
    let approved = 0;
    let rejected = 0;
    for (const b of bookings) {
      if (b.status === "Pending") pending += 1;
      else if (b.status === "Reviewed") reviewed += 1;
      else if (b.status === "Approved") approved += 1;
      else if (b.status === "Rejected") rejected += 1;
    }
    return { total: bookings.length, pending, reviewed, approved, rejected };
  }, [bookings]);

  const visibleBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          (statusFilter === "All" || booking.status === statusFilter) &&
          [booking.id, booking.name, booking.email, booking.contact, booking.address, booking.plan]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [bookings, query, statusFilter],
  );

  async function updateStatus(status: BookingStatus) {
    if (!selectedBooking || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update booking status.");
      setBookings((current) =>
        current.map((booking) =>
          booking.id === selectedBooking.id ? { ...booking, status } : booking,
        ),
      );
      setSelectedBooking(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update booking status.");
    } finally {
      setIsSaving(false);
    }
  }

  function openBooking(booking: Booking) {
    setSelectedBooking(booking);
    setBookingStatus(booking.status);
  }

  function handleExportCsv() {
    if (!visibleBookings.length) return;
    const header = ["Booking ID", "Applicant", "Email", "Contact", "Plan", "Preferred Date", "Status", "Address"];
    const csvRows = [
      header,
      ...visibleBookings.map((b, i) => [
        getBookingDisplayId(b, i),
        b.name,
        b.email,
        b.contact,
        b.plan.replace(/_/g, " "),
        formatShortDate(b.preferredDate),
        b.status,
        b.address,
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sky-tech-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: typeof ClipboardList;
    tile: string;
    bar: string;
    dot: string;
    target: "All" | BookingStatus;
  }> = [
    {
      label: "Total requests",
      value: counts.total,
      detail: "All applications",
      Icon: ClipboardList,
      tile: "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      dot: "text-blue-600",
      target: "All",
    },
    {
      label: "Pending",
      value: counts.pending,
      detail: counts.pending > 0 ? "Awaiting review" : "All caught up",
      Icon: Clock,
      tile: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      dot: counts.pending > 0 ? "text-amber-600" : "text-emerald-600",
      target: "Pending",
    },
    {
      label: "Approved",
      value: counts.approved,
      detail: "Ready for installation",
      Icon: CheckCircle2,
      tile: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
      dot: "text-emerald-600",
      target: "Approved",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      detail: "Declined requests",
      Icon: XCircle,
      tile: "bg-red-50 text-red-500",
      bar: "bg-red-500",
      dot: counts.rejected > 0 ? "text-red-500" : "text-slate-400",
      target: "Rejected",
    },
  ];

  const filterTabs: Array<["All" | BookingStatus, string, number]> = [
    ["All", "All", counts.total],
    ["Pending", "Pending", counts.pending],
    ["Approved", "Approved", counts.approved],
    ["Rejected", "Rejected", counts.rejected],
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Booking Requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage new fiber connection applications
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadBookings(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!visibleBookings.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-[#1d57d6]"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, target }) => {
            const active = statusFilter === target;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStatusFilter((current) => (current === target ? "All" : target))}
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applicant, ID, or plan..."
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
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
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
                {visibleBookings.length} {visibleBookings.length === 1 ? "request" : "requests"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Applicant</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Plan &amp; Preferred Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
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
                      <td className="px-5 py-4"><div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-28 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-7 w-24 animate-pulse rounded-xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <ClipboardList size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No booking requests found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || statusFilter !== "All"
                          ? "Try adjusting your search or status filter."
                          : "New connection requests will appear here."}
                      </p>
                      {(query || statusFilter !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setStatusFilter("All");
                          }}
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleBookings.map((booking) => {
                    const displayId = getBookingDisplayId(booking, bookings.indexOf(booking));
                    const addr = splitBookingAddress(booking.address);
                    const locationSnippet = [addr.city, addr.province].filter(Boolean).join(", ");
                    return (
                      <tr key={booking.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(booking.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {getApplicantDisplayName(booking.name)}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                                #{displayId}{locationSnippet ? ` · ${locationSnippet}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-slate-700">{booking.email}</p>
                          <p className="mt-0.5 text-xs tabular-nums text-slate-400">{booking.contact}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2166f3]">
                            <Wifi size={12} />
                            {booking.plan.replace(/_/g, " ")}
                          </span>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Calendar size={11} />
                            {formatShortDate(booking.preferredDate)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${statusStyles[booking.status]}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openBooking(booking)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2166f3] transition-colors hover:bg-blue-100"
                          >
                            <Eye size={13} />
                            Review
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

      {/* Review Booking Modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-3 backdrop-blur-xs sm:p-5"
          onMouseDown={() => setSelectedBooking(null)}
        >
          <div
            className="admin-form-modal-scrollbar flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-[#2166f3]">
                  {getInitials(selectedBooking.name)}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Review Booking Request</h2>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    #{getBookingDisplayId(selectedBooking, bookings.indexOf(selectedBooking))} · Submitted {formatShortDate(selectedBooking.submittedAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
              {/* Applicant & Service Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Applicant &amp; Plan
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {(() => {
                    const { firstName, middleName, lastName } = splitBookingName(selectedBooking.name);
                    return (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Full name</dt>
                        <dd className="text-right font-semibold text-slate-900">
                          {[firstName, middleName, lastName].filter(Boolean).join(" ")}
                        </dd>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="text-right font-medium text-slate-700">{selectedBooking.email}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Contact</dt>
                    <dd className="text-right font-medium tabular-nums text-slate-700">{selectedBooking.contact}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                    <dt className="text-slate-500">Selected plan</dt>
                    <dd className="font-bold text-[#2166f3]">{selectedBooking.plan.replace(/_/g, " ")}</dd>
                  </div>
                </dl>
              </div>

              {/* Address */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <MapPin size={12} />
                  Installation Address
                </p>
                {(() => {
                  const addr = splitBookingAddress(selectedBooking.address);
                  return (
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">House No. / Street</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">{addr.street || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Barangay</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">{addr.barangay || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">City / Municipality</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">{addr.city || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Province / ZIP</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">
                          {[addr.province, addr.zipCode].filter(Boolean).join(" ") || "—"}
                        </dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>

              {/* Decision */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Application Status</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                  {(["Pending", "Approved", "Rejected"] as const).map((option) => {
                    const active = bookingStatus === option;
                    const activeStyle =
                      option === "Approved"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : option === "Rejected"
                          ? "border-red-400 bg-red-50 text-red-600"
                          : "border-amber-400 bg-amber-50 text-amber-700";
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={isSaving}
                        onClick={() => setBookingStatus(option)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                          active ? activeStyle : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void updateStatus(bookingStatus)}
                className="rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30 hover:bg-[#1d57d6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
