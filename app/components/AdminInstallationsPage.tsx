"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { PortalShell } from "@/app/components/PortalShell";
import { formatPersonName } from "@/app/lib/name";

type Installation = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
type Filter = "All" | "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "Installation_Rescheduled";
type Technician = { id: string; name: string; status: string };
type TicketSchedule = { technicianId: string | null; date: string | null; time: string | null };

const statusStyles: Record<string, string> = {
  Scheduled: "border-emerald-200 bg-emerald-50 text-emerald-600",
  "In Progress": "border-emerald-200 bg-emerald-50 text-emerald-600",
  "Installation Confirmed": "border-emerald-200 bg-emerald-50 text-emerald-600",
  Completed: "border-slate-200 bg-slate-50 text-slate-600",
  "Installation Closed": "border-slate-200 bg-slate-50 text-slate-600",
  Cancelled: "border-amber-200 bg-amber-50 text-amber-600",
  "Installation Rescheduled": "border-amber-200 bg-amber-50 text-amber-600",
  Installation_Rescheduled: "border-amber-200 bg-amber-50 text-amber-600",
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
  return date.toISOString().slice(0, 10);
}

function normalizeTimeSlot(value: string | null | undefined) {
  if (!value) return '';
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value;
}

export function AdminInstallationsPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [subscriberQuery, setSubscriberQuery] = useState("");
  const [isSubscriberDropdownOpen, setIsSubscriberDropdownOpen] = useState(false);
  const subscriberPickerRef = useRef<HTMLDivElement>(null);
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [installationStatus, setInstallationStatus] = useState("Scheduled");
  const [editingInstallation, setEditingInstallation] =
    useState<Installation | null>(null);
  const [installationDate, setInstallationDate] = useState('');
  const [installationTime, setInstallationTime] = useState('');
  const [installationTechnician, setInstallationTechnician] = useState('');
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [ticketSchedules, setTicketSchedules] = useState<TicketSchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
  const isTechnicianAvailable = (technician: Technician) => !installations.some((installation) =>
    installation[2] === formatPersonName(technician.name) &&
    installation[4] === installationDate &&
    normalizeTimeSlot(installation[5]) === normalizeTimeSlot(installationTime) &&
    installation[0] !== editingInstallation?.[0],
  ) && !ticketSchedules.some((ticket) =>
    ticket.technicianId === technician.id &&
    ticket.date?.slice(0, 10) === installationDate &&
    normalizeTimeSlot(ticket.time) === normalizeTimeSlot(installationTime),
  );
  const availableTechnicianCount = technicians.filter(isTechnicianAvailable).length;

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

  useEffect(() => {
    fetch("/api/installations")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data))
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
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/tickets")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTicketSchedules(result.data.map((ticket: { technicianId?: string | null; visitDate?: string | null; visitTime?: string | null }) => ({
            technicianId: ticket.technicianId || null,
            date: ticket.visitDate || null,
            time: ticket.visitTime || null,
          })));
        }
      })
      .catch(() => setTicketSchedules([]));
  }, []);

  useEffect(() => {
    fetch("/api/subscribers")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setSubscribers(
            result.data.map((item: { name: string }) => formatPersonName(item.name)),
          );
        }
      })
      .catch(() => setSubscribers([]));
  }, []);

  const filteredSubscribers = useMemo(() => {
    const availableSubscribers = subscribers.length
      ? subscribers
      : ["Maria Santos", "Omar Hassan", "David Kim", "Sofia Reyes"];
    const subscribersWithInstallations = new Set(
      installations.map((installation) => installation[1].trim().toLowerCase()),
    );
    return availableSubscribers.filter((subscriber) =>
      !subscribersWithInstallations.has(subscriber.trim().toLowerCase()) &&
      subscriber.toLowerCase().includes(subscriberQuery.toLowerCase()),
    );
  }, [installations, subscriberQuery, subscribers]);

  useEffect(() => {
    fetch("/api/technicians")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTechnicians(
            result.data,
          );
        }
      })
      .catch(() => setTechnicians([]));
  }, []);

  const visibleInstallations = Array.from(
    new Map(
      installations
        .filter(
          (item) =>
            (filter === "All" || item[7] === filter || (filter === "Installation_Rescheduled" && item[7] === "Installation Rescheduled")) &&
            item.join(" ").toLowerCase().includes(query.toLowerCase()),
        )
        .map((item) => [
          `${item[1]}-${item[2]}-${item[4]}-${normalizeTimeSlot(item[5])}-${item[6]}`,
          item,
        ]),
    ).values(),
  ).map(
    (item) =>
      item.map((value, index) =>
        index === 1 || index === 2 ? formatPersonName(value) : value,
      ) as unknown as Installation,
  );

  useEffect(() => {
    const table = document.querySelector("table.table-fixed");
    table?.querySelectorAll("thead th span").forEach((arrow) => arrow.remove());
    const toolbar = table?.closest(".mt-4")?.previousElementSibling;
    if (!toolbar) return;
    toolbar
      .querySelectorAll(".installation-record-counter")
      .forEach((node) => node.remove());
    toolbar.querySelectorAll(".live-record-counter").forEach((node, index) => {
      if (index > 0) node.remove();
    });
    let counter = toolbar.querySelector<HTMLSpanElement>(
      ".live-record-counter",
    );
    if (!counter) {
      counter = document.createElement("span");
      counter.className = "live-record-counter ml-auto text-sm text-slate-400";
      toolbar.appendChild(counter);
    }
    counter.textContent = `${visibleInstallations.length} records`;
  }, [visibleInstallations.length]);

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
      window.alert(editingInstallation
        ? "Please select a visit date, time slot, and technician."
        : "Please select a subscriber, visit date, time slot, and technician.");
      setIsSaving(false);
      return;
    }
    if (editingInstallation) {
      const response = await fetch(
        `/api/installations/${editingInstallation[0]}`,
        {
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
        },
      );
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
      setEditingInstallation(null);
      setIsAdding(false);
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
    setIsAdding(false);
    setIsSaving(false);
  }

  useEffect(() => {
    function handleTableAction(event: MouseEvent) {
      const button = (event.target as HTMLElement).closest("button");
      const row = button?.closest("tr");
      const id = row?.querySelector("td")?.textContent?.trim();
      if (!button) return;
      if (!row) {
        if (button.textContent?.trim() === "Add Schedule")
          setEditingInstallation(null);
        return;
      }
      if (!id) return;
      const installation = installations.find((item) => item[0] === id);
      if (!installation) return;
      if (
        button.textContent?.trim() === "Cancel" &&
        window.confirm("Cancel this installation?")
      ) {
        setInstallations((current) =>
          current.map((item) =>
            item[0] === id
              ? [
                  item[0],
                  item[1],
                  item[2],
                  item[3],
                  item[4],
                  item[5],
                  item[6],
                  "Cancelled",
                ]
              : item,
          ),
        );
      }
      if (button.textContent?.trim() === "Manage") {
        setEditingInstallation(installation);
        setInstallationStatus(
          installation[7] === "Completed" || installation[7] === "Installation Closed"
            ? "Completed"
            : installation[7] === "Cancelled" || installation[7] === "Installation Rescheduled"
              ? "Installation_Rescheduled"
              : "Scheduled",
        );
        setIsAdding(true);
        setInstallationDate(installation[4]);
        setInstallationTime(normalizeTimeSlot(installation[5]));
        setInstallationTechnician(installation[2]);
        setScheduleChanged(false);
      }
    }
    document.addEventListener("click", handleTableAction);
    return () => document.removeEventListener("click", handleTableAction);
  }, [installations]);

  useEffect(() => {
    function clearEditOnModalClose(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.classList.contains("fixed") &&
        target.classList.contains("inset-0")
      )
        setEditingInstallation(null);
    }
    document.addEventListener("mousedown", clearEditOnModalClose);
    return () =>
      document.removeEventListener("mousedown", clearEditOnModalClose);
  }, []);

  useEffect(() => {
    if (!isAdding) return;
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    const title = form.querySelector("h2");
    const submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (!editingInstallation) {
      form.reset();
      if (title) title.textContent = "Add Schedule";
      if (submitButton) submitButton.textContent = "Add Schedule";
      return;
    }
    if (title) title.textContent = "Manage Installation";
    if (submitButton) submitButton.textContent = "Save Changes";
    if (editingInstallation) {
      (form.elements.namedItem("technician") as HTMLSelectElement).value = editingInstallation[2];
      (form.elements.namedItem("date") as HTMLInputElement).value = editingInstallation[4];
      (form.elements.namedItem("time") as HTMLSelectElement).value =
        editingInstallation[5] === "09:00"
          ? "9:00 AM – 12:00 NN"
          : editingInstallation[5] === "13:00"
            ? "1:00 PM – 4:00 PM"
            : editingInstallation[5];
      return;
    }
    (form.elements.namedItem("subscriber") as HTMLSelectElement).value =
      editingInstallation[1];
    (form.elements.namedItem("technician") as HTMLSelectElement).value =
      editingInstallation[2];
    (form.elements.namedItem("address") as HTMLInputElement).value =
      editingInstallation[3];
    (form.elements.namedItem("date") as HTMLInputElement).value =
      editingInstallation[4];
    (form.elements.namedItem("time") as HTMLInputElement).value =
      editingInstallation[5];
    (form.elements.namedItem("type") as HTMLSelectElement).value =
      editingInstallation[6];
  }, [editingInstallation, isAdding]);

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Installations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage installation schedules
          </p>
        </div>
        <button
          onClick={() => {
            setEditingInstallation(null);
            setSubscriberQuery("");
            setIsSubscriberDropdownOpen(false);
            setInstallationStatus("Scheduled");
            setIsAdding(true);
            setInstallationDate("");
            setInstallationTime("");
            setInstallationTechnician("");
            setScheduleChanged(false);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#3b4fd8] px-5 py-3 text-sm font-bold text-white hover:bg-[#2d3fc7]"
        >
          <Plus size={17} />
          Add Schedule
        </button>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]"
          />
        </div>
        <label className="status-filter-container relative">
        <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter installations" className="admin-filter-dropdown status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]">
          <option value="All">All</option>
          <option value="Scheduled">Installation Confirmed</option>
          <option value="Completed">Installation Closed</option>
          <option value="Installation_Rescheduled">Installation Rescheduled</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
        </label>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-275 table-fixed text-left">
            <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "Installation ID",
                  "Subscriber",
                  "Technician",
                  "Date",
                  "Time",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th className={`whitespace-nowrap px-4 py-4 lg:px-5 ${heading === "Installation ID" ? "w-[14%]" : heading === "Subscriber" ? "w-[17%]" : heading === "Technician" ? "w-[17%]" : heading === "Date" ? "w-[12%]" : heading === "Time" ? "w-[13%]" : heading === "Status" ? "w-[17%]" : "w-[10%]"}`} key={heading}>
                    {heading}
                    {heading !== "Actions" && (
                      <span className="ml-1 text-[10px]">▴</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {visibleInstallations.map((item) => (
                <tr className="border-t border-slate-100" key={item[0]}>
                  <td className="whitespace-nowrap px-4 py-5 text-slate-900 lg:px-5">
                    {item[0]}
                  </td>
                  <td className="truncate px-4 py-5 font-semibold text-slate-900 lg:px-5">
                    {item[1]}
                  </td>
                  <td className="truncate px-4 py-5 text-slate-500 lg:px-5">{item[2]}</td>
                  <td className="whitespace-nowrap px-4 py-5 text-slate-500 lg:px-5">{item[4]}</td>
                  <td className="whitespace-nowrap px-4 py-5 text-slate-500 lg:px-5">{item[5]}</td>
                  <td className="whitespace-nowrap px-4 py-5 lg:px-5">
                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[item[7]]}`}
                    >
                      {getStatusLabel(item[7])}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-5 lg:px-5">
                    <button type="button" className="text-xs font-semibold text-[#2563eb]">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isAdding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 sm:p-5"
          onMouseDown={closeScheduleModal}
        >
          <form
            onSubmit={addSchedule}
            onMouseDown={(event) => event.stopPropagation()}
            className={`admin-form-modal-scrollbar flex ${editingInstallation ? "h-[calc(100vh-2rem)] max-h-[90vh]" : "h-auto max-h-[calc(100vh-2rem)]"} w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
              <h2 className="text-lg font-bold">Add Schedule</h2>
              <button
                type="button"
                onClick={closeScheduleModal}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-scroll">
              {editingInstallation ? (
                <>
                <div className="space-y-5 px-6 py-7 sm:px-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</p>
                    <p className="mt-2 text-sm text-slate-900">{editingInstallation[1]}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Address</p>
                    <p className="mt-2 text-sm text-slate-900">{editingInstallation[3] || "No address provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Installation ID</p>
                    <p className="mt-2 text-sm text-slate-900">{editingInstallation[0]}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Concern (SERVICE TYPE)</p>
                    <p className="mt-2 text-sm text-slate-900">{editingInstallation[6]}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 px-6 pb-7 pt-6 sm:px-8">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Technician visit date and time</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input name="date" type="date" min={getMinimumVisitDate()} value={installationDate} onChange={(event) => { setInstallationDate(event.target.value); setScheduleChanged(true); }} disabled={installationStatus === "Completed" || installationStatus === "Scheduled"} required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
                    <select name="time" value={normalizeTimeSlot(installationTime)} onChange={(event) => { setInstallationTime(event.target.value); setScheduleChanged(true); }} disabled={installationStatus === "Completed" || installationStatus === "Scheduled"} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                      <option value="">— Time slot —</option>
                      <option value="9:00 AM – 12:00 NN">9:00 AM – 12:00 NN</option>
                      <option value="1:00 PM – 4:00 PM">1:00 PM – 4:00 PM</option>
                    </select>
                  </div>
                  <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Technician {scheduleChanged && installationDate && installationTime && <span className="font-normal normal-case text-[#2447b6]">({availableTechnicianCount} available on this date and time)</span>}
                    <select name="technician" disabled={!scheduleChanged && Boolean(editingInstallation?.[2] && editingInstallation?.[4] && editingInstallation?.[5])} value={installationDate && installationTime ? installationTechnician : ""} onChange={(event) => setInstallationTechnician(event.target.value)} required className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                      <option value="">— Choose available technician —</option>
                      {(installationDate && installationTime
                        ? (scheduleChanged
                          ? technicians.filter((technician) =>
                              isTechnicianAvailable(technician) &&
                              (technician.status === "Active" ||
                                formatPersonName(technician.name) === installationTechnician),
                            )
                          : technicians.filter((technician) =>
                              technician.status === "Active" ||
                              formatPersonName(technician.name) === installationTechnician,
                            ))
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
                      onChange={(event) => {
                        const value = event.target.value;
                        setInstallationStatus(value);
                      }}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#3b4fd8]"
                    >
                      {!['Completed', 'Cancelled', 'Installation_Rescheduled', 'Installation Closed', 'Installation Rescheduled'].includes(installationStatus) && (
                        <option value="Scheduled">Installation Confirmed</option>
                      )}
                      <option value="Completed">Installation Closed</option>
                      <option value="Installation_Rescheduled">Installation Rescheduled</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
            <div className="px-6 py-6 sm:px-8">
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
                    {filteredSubscribers.length ? filteredSubscribers.map((subscriber) => (
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
                    )) : (
                      <p className="px-4 py-2.5 text-sm text-slate-400">No subscribers found</p>
                    )}
                    </div>
                )}
                </div>
              </label>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Technician visit date and time</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input name="date" type="date" min={getMinimumVisitDate()} value={installationDate} onChange={(event) => { setInstallationDate(event.target.value); setScheduleChanged(true); }} required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#3b4fd8]" />
                  <select name="time" value={installationTime} onChange={(event) => { setInstallationTime(event.target.value); setScheduleChanged(true); }} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3b4fd8]">
                    <option value="">— Time slot —</option>
                    <option value="9:00 AM – 12:00 NN">9:00 AM – 12:00 NN</option>
                    <option value="1:00 PM – 4:00 PM">1:00 PM – 4:00 PM</option>
                  </select>
                </div>
              </div>
              <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Technician {scheduleChanged && installationDate && installationTime && <span className="font-normal normal-case text-[#2447b6]">({availableTechnicianCount} available on this date and time)</span>}
                <select name="technician" disabled={!scheduleChanged && Boolean(editingInstallation?.[2] && editingInstallation?.[4] && editingInstallation?.[5])} value={installationDate && installationTime ? installationTechnician : ""} onChange={(event) => setInstallationTechnician(event.target.value)} required className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                  <option value="">— Choose available technician —</option>
                  {(installationDate && installationTime
                    ? technicians.filter((technician) => isTechnicianAvailable(technician) && technician.status === "Active")
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
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
