"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
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
  Rejected: "bg-red-50 text-red-600",
};

function splitBookingName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function getApplicantDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts.slice(0, 2).join(" ")} ${parts[parts.length - 1]}`;
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

function getBookingDisplayId(booking: Booking, index: number) {
  return /^\d+$/.test(booking.id) ? booking.id : String(BOOKING_ID_START + index);
}

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | BookingStatus>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("Pending");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadBookings() {
    setError("");
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error(result.error || "Unable to load bookings.");
      setBookings(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) =>
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
      setBookings((current) => current.map((booking) =>
        booking.id === selectedBooking.id ? { ...booking, status } : booking,
      ));
      setSelectedBooking((current) => current ? { ...current, status } : current);
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

  return (
    <PortalShell role="admin">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Review and manage new connection requests</p>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]" />
        </div>
        <label className="relative">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | BookingStatus)} aria-label="Filter booking requests" className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]">
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
        </label>
        <span className="ml-auto text-sm text-slate-400">{visibleBookings.length} requests</span>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left">
            <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {["Booking ID", "Applicant", "Email", "Contact", "Plan", "Status", "Action"].map((heading) => <th className="px-5 py-4" key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody className="text-sm">
              {visibleBookings.map((booking) => (
                <tr className="border-t border-slate-100" key={booking.id}>
                  <td className="px-5 py-4 text-slate-900">{getBookingDisplayId(booking, bookings.indexOf(booking))}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{getApplicantDisplayName(booking.name)}</td>
                  <td className="px-5 py-4 text-slate-500">{booking.email}</td>
                  <td className="px-5 py-4 text-slate-500">{booking.contact}</td>
                  <td className="px-5 py-4 text-slate-500">{booking.plan}</td>
                  <td className="px-5 py-4"><span className={`admin-status-pill rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${statusStyles[booking.status]}`}>{booking.status}</span></td>
                  <td className="px-5 py-4"><button type="button" onClick={() => openBooking(booking)} className="text-xs font-semibold text-[#2563eb]">View details</button></td>
                </tr>
              ))}
              {!visibleBookings.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No booking requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 sm:p-5" onMouseDown={() => setSelectedBooking(null)}>
          <div className="admin-form-modal-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
              <div><h2 className="text-xl font-bold">Review Booking Request</h2></div>
              <button type="button" onClick={() => setSelectedBooking(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="grid gap-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Booking ID
                <input value={getBookingDisplayId(selectedBooking, bookings.indexOf(selectedBooking))} readOnly disabled className="mt-2 w-full cursor-default rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700" />
              </label>
              {Object.entries(splitBookingName(selectedBooking.name)).map(([name, value]) => (
                <label key={name} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {name === "firstName" ? "First Name" : name === "middleName" ? "Middle Name (Optional)" : "Last Name"}
                  <input value={value} readOnly disabled className="mt-2 w-full cursor-default rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700" />
                </label>
              ))}
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email
                <input value={selectedBooking.email} readOnly disabled className="mt-2 w-full cursor-default rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700" />
              </label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Contact
                <input value={selectedBooking.contact} readOnly disabled className="mt-2 w-full cursor-default rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700" />
              </label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Plan
                <select value={selectedBooking.plan} disabled className="mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700">
                  <option value="">{selectedBooking.plan ? selectedBooking.plan.replace(/_/g, " ") : "Select plan..."}</option>
                </select>
              </label>
              {Object.entries(splitBookingAddress(selectedBooking.address)).map(([name, value]) => (
                <label key={name} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {name === "street" ? "House No. / Street" : name === "zipCode" ? "ZIP Code" : `${name.charAt(0).toUpperCase()}${name.slice(1)}`}
                  <input value={value} readOnly disabled className="mt-2 w-full cursor-default rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none disabled:bg-white disabled:text-slate-700" />
                </label>
              ))}
            </div>
            <label className="mt-7 block text-xs font-bold uppercase tracking-wide text-slate-400">Status
              <select value={bookingStatus} disabled={isSaving} onChange={(event) => setBookingStatus(event.target.value as BookingStatus)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-[#3b4fd8]">
                <option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
              </select>
            </label>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
              <button type="button" onClick={() => setSelectedBooking(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="button" disabled={isSaving} onClick={() => void updateStatus(bookingStatus)} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
