"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { PortalShell } from "@/app/components/PortalShell";

type Subscriber = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  boolean,
];

type LocationOption = {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string | false;
};

const PSGC_API = "https://psgc.gitlab.io/api";

function formatPlanName(plan: string) {
  return plan.replace(/_/g, " ").replace(/\s+Mbps$/i, "Mbps");
}

function sortLocations(options: LocationOption[]) {
  return [...options].sort((first, second) =>
    first.name.localeCompare(second.name, "en", { sensitivity: "base" }),
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      {children}
    </label>
  );
}

function displayFirstAndLastName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [status, setStatus] = useState("Active");
  const [filter, setFilter] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/subscribers", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data))
          setSubscribers(
            result.data.map(
              (item: {
                id: string;
                name: string;
                email: string;
                plan: string;
                status: string;
                connectionDate: string;
                contact?: string;
                address?: string;
                province?: string;
                city?: string;
                barangay?: string;
                street?: string;
                zipCode?: string;
                archived?: boolean;
              }) => [
                item.id,
                item.name,
                item.email,
                formatPlanName(item.plan),
                item.status.replace("_", " "),
                item.connectionDate.slice(0, 10),
                "",
                item.contact || "",
                item.province || "",
                item.city || "",
                item.barangay || "",
                item.street || item.address || "",
                item.zipCode || "",
                Boolean(item.archived),
              ],
            ),
          );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data?.plans))
          setPlans(
            result.data.plans
              .map((plan: { name?: string } | string) =>
                formatPlanName(typeof plan === "string" ? plan : plan.name || ""),
              )
              .filter(Boolean),
          );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAdding || !plans.length) return;
    const select = document.querySelector<HTMLSelectElement>('form select[name="plan"]');
    if (!select) return;
    const selectedPlan = formatPlanName(editingSubscriber?.[3] || plans[0]);
    select.replaceChildren(...plans.map((plan) => new Option(plan, plan)));
    select.value = plans.includes(selectedPlan) ? selectedPlan : plans[0];
  }, [isAdding, plans, editingSubscriber]);

  const counts = useMemo(() => {
    const nonArchived = subscribers.filter((s) => !s[13]);
    const active = nonArchived.filter((s) => s[4] === "Active").length;
    const suspended = nonArchived.filter((s) => s[4] !== "Active").length;
    const archived = subscribers.length - nonArchived.length;
    return {
      total: nonArchived.length,
      active,
      suspended,
      archived,
    };
  }, [subscribers]);

  const rows = useMemo(
    () =>
      subscribers.filter(
        (subscriber) =>
          (showArchived
            ? subscriber[13]
            : !subscriber[13] && (filter === "All" || subscriber[4] === filter)) &&
          subscriber.join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [subscribers, showArchived, filter, query],
  );

  function openAddModal() {
    setEditingSubscriber(null);
    setStatus("Active");
    setProvince("");
    setCity("");
    setBarangay("");
    setIsAdding(true);
  }

  function openEditModal(subscriber: Subscriber) {
    setEditingSubscriber(subscriber);
    setStatus(subscriber[4]);
    setIsAdding(true);
  }

  async function toggleArchive(id: string, archived: boolean) {
    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (response.ok) {
        setSubscribers((current) =>
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
                  item[7],
                  item[8],
                  item[9],
                  item[10],
                  item[11],
                  item[12],
                  archived,
                ]
              : item,
          ),
        );
      }
    } catch {
      // ignore network error
    }
  }

  async function deleteSubscriber(id: string) {
    if (!window.confirm("Delete this subscriber? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/subscribers/${id}`, { method: "DELETE" });
      if (response.ok) {
        setSubscribers((current) => current.filter((item) => item[0] !== id));
      }
    } catch {
      // ignore network error
    }
  }

  function handleExportCsv() {
    if (!rows.length) return;
    const header = ["Subscriber ID", "Name", "Email", "Contact", "Plan", "Status", "Connected Date", "City", "Province"];
    const csvRows = [
      header,
      ...rows.map((r) => [r[0], r[1], r[2], r[7], r[3], r[4], r[5], r[9], r[8]]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sky-tech-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function addSubscriber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const firstName = String(form.get("firstName") || "Juan");
      const middleName = String(form.get("middleName") || "");
      const lastName = String(form.get("lastName") || "Santos");
      const email = String(form.get("email") || "email@skytech.net");
      const contact = String(form.get("contact") || "09XXXXXXXXX");
      const plan = String(form.get("plan") || "Fiber 100Mbps");
      const connectionDate = editingSubscriber?.[5] || new Date().toISOString().slice(0, 10);
      const formProvince = String(form.get("province") || "");
      const formCity = String(form.get("city") || "");
      const formBarangay = String(form.get("barangay") || "");
      const street = String(form.get("street") || "");
      const zipCode = String(form.get("zipCode") || "");
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

      if (editingSubscriber) {
        const address =
          [street, formBarangay, formCity, formProvince, zipCode].filter(Boolean).join(", ") ||
          editingSubscriber[11] ||
          editingSubscriber[8];
        const response = await fetch(`/api/subscribers/${editingSubscriber[0]}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            contact,
            address,
            province: formProvince,
            city: formCity,
            barangay: formBarangay,
            street,
            zipCode,
            plan: plan.replace(/\s+/g, "_"),
            status,
            connectionDate,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          window.alert(result?.error || "Unable to save subscriber changes.");
          return;
        }
        setSubscribers((current) =>
          current.map((item) =>
            item[0] === editingSubscriber[0]
              ? [
                  item[0],
                  fullName,
                  email,
                  plan,
                  status,
                  connectionDate,
                  "",
                  contact,
                  formProvince,
                  formCity,
                  formBarangay,
                  street,
                  zipCode,
                  item[13],
                ]
              : item,
          ),
        );
        setEditingSubscriber(null);
        setIsAdding(false);
        return;
      }

      const address =
        [street, formBarangay, formCity, formProvince, zipCode].filter(Boolean).join(", ") ||
        "Address not provided";
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          contact,
          address,
          province: formProvince,
          city: formCity,
          barangay: formBarangay,
          street,
          zipCode,
          plan: plan.replace(/\s+/g, "_"),
          status,
          connectionDate,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        window.alert(result?.error || "Unable to add subscriber.");
        return;
      }
      const result = await response.json();
      const created = result.data;
      setSubscribers((current) => [
        [
          created.id,
          created.name,
          created.email,
          created.plan.replace("_", " "),
          created.status.replace("_", " "),
          created.connectionDate.slice(0, 10),
          "",
          created.contact,
          created.province || "",
          created.city || "",
          created.barangay || "",
          created.street || "",
          created.zipCode || "",
          false,
        ],
        ...current,
      ]);
      setIsAdding(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isAdding) return;
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    ["province", "city", "barangay"].forEach((name) => {
      const field = form.elements.namedItem(name) as HTMLSelectElement | null;
      if (field) field.required = false;
    });
    if (!editingSubscriber) {
      form.reset();
      setProvince("");
      setCity("");
      setBarangay("");
      return;
    }
    const [firstName, ...middleAndLast] = editingSubscriber[1].split(" ");
    const lastName = middleAndLast.pop() || "";
    const middleName = middleAndLast.join(" ");
    (form.elements.namedItem("firstName") as HTMLInputElement).value = firstName;
    (form.elements.namedItem("middleName") as HTMLInputElement).value = middleName;
    (form.elements.namedItem("lastName") as HTMLInputElement).value = lastName;
    (form.elements.namedItem("email") as HTMLInputElement).value = editingSubscriber[2];
    (form.elements.namedItem("contact") as HTMLInputElement).value = editingSubscriber[7];
    (form.elements.namedItem("plan") as HTMLSelectElement).value = formatPlanName(editingSubscriber[3]);
    setProvince(editingSubscriber[8]);
    setCity(editingSubscriber[9]);
    setBarangay(editingSubscriber[10]);
    (form.elements.namedItem("street") as HTMLInputElement).value = editingSubscriber[11];
    (form.elements.namedItem("zipCode") as HTMLInputElement).value = editingSubscriber[12];
  }, [editingSubscriber, isAdding]);

  useEffect(() => {
    if (!isAdding || provinces.length) return;
    let cancelled = false;
    Promise.all([
      fetch(`${PSGC_API}/provinces/`).then((response) => response.json()),
      fetch(`${PSGC_API}/regions/130000000/cities-municipalities/`).then((response) => response.json()),
    ])
      .then(([provinceOptions, ncrCities]) => {
        if (cancelled) return;
        const allProvinces = sortLocations([
          {
            code: "130000000",
            name: "NCR (Metro Manila)",
            regionCode: "130000000",
            provinceCode: false,
          },
          ...provinceOptions,
        ]);
        const sortedNcrCities = sortLocations(ncrCities);
        setProvinces(allProvinces);
        setCityOptions(sortedNcrCities);
        setCities(sortedNcrCities.map((option) => option.name));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdding, provinces.length]);

  const loadBarangays = useCallback(async (cityOption: LocationOption, selectedBarangay = "") => {
    setBarangay(selectedBarangay);
    setBarangays([]);
    try {
      const response = await fetch(`${PSGC_API}/cities-municipalities/${cityOption.code}/barangays/`);
      if (!response.ok) throw new Error("Location request failed");
      const options: LocationOption[] = await response.json();
      const names = sortLocations(options).map((option) => option.name);
      setBarangays(names);
      if (selectedBarangay && names.includes(selectedBarangay)) setBarangay(selectedBarangay);
    } catch {}
  }, []);

  const loadCities = useCallback(async (
    provinceOption: LocationOption,
    selectedCity = "",
    selectedBarangay = "",
  ) => {
    setCity(selectedCity);
    setBarangay(selectedBarangay);
    setCities([]);
    setCityOptions([]);
    setBarangays([]);
    try {
      const endpoint =
        provinceOption.code === "130000000"
          ? `${PSGC_API}/regions/130000000/cities-municipalities/`
          : `${PSGC_API}/provinces/${provinceOption.code}/cities-municipalities/`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Location request failed");
      const options: LocationOption[] = await response.json();
      const sortedOptions = sortLocations(options);
      setCityOptions(sortedOptions);
      setCities(sortedOptions.map((option) => option.name));
    } catch {}
  }, []);

  useEffect(() => {
    if (!province || !provinces.length) return;
    const selected = provinces.find((option) => option.name === province);
    const isSavedProvince = editingSubscriber?.[8] === province;
    if (selected)
      void loadCities(
        selected,
        isSavedProvince ? editingSubscriber?.[9] || "" : "",
        isSavedProvince ? editingSubscriber?.[10] || "" : "",
      );
  }, [province, provinces, editingSubscriber, loadCities]);

  useEffect(() => {
    if (!city || !cityOptions.length) return;
    const selected = cityOptions.find((option) => option.name === city);
    if (selected)
      void loadBarangays(
        selected,
        editingSubscriber?.[9] === city ? editingSubscriber?.[10] || "" : "",
      );
  }, [city, cityOptions, editingSubscriber, loadBarangays]);

  const locations = Object.fromEntries(provinces.map((option) => [option.name, option.code]));
  const selectClass =
    "mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:bg-slate-50 disabled:text-slate-400";

  const summaryCards = [
    {
      label: "Total subscribers",
      value: counts.total,
      detail: "Registered accounts",
      Icon: Users,
      tile: "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      dot: "text-blue-600",
      activeRing: !showArchived && filter === "All",
      onClick: () => {
        setShowArchived(false);
        setFilter("All");
      },
    },
    {
      label: "Active",
      value: counts.active,
      detail: counts.total ? `${Math.round((counts.active / counts.total) * 100)}% of base` : "0% of base",
      Icon: UserCheck,
      tile: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
      dot: "text-emerald-600",
      activeRing: !showArchived && filter === "Active",
      onClick: () => {
        setShowArchived(false);
        setFilter("Active");
      },
    },
    {
      label: "Suspended",
      value: counts.suspended,
      detail: counts.suspended > 0 ? "Needs follow-up" : "All accounts clear",
      Icon: UserX,
      tile: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      dot: counts.suspended > 0 ? "text-amber-600" : "text-emerald-600",
      activeRing: !showArchived && filter === "Suspended",
      onClick: () => {
        setShowArchived(false);
        setFilter("Suspended");
      },
    },
    {
      label: "Archived",
      value: counts.archived,
      detail: showArchived ? "Viewing archived" : "Click to view",
      Icon: Archive,
      tile: "bg-violet-50 text-violet-600",
      bar: "bg-violet-500",
      dot: "text-slate-500",
      activeRing: showArchived,
      onClick: () => setShowArchived((current) => !current),
    },
  ];

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Subscribers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage subscriber accounts, fiber plans, and connection status
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!rows.length}
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
              Add Subscriber
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, detail, Icon, tile, bar, dot, activeRing, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`admin-stat-card group relative overflow-hidden rounded-xl border bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
                activeRing ? "border-[#2166f3] ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
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
              <span className={`absolute inset-x-0 bottom-0 h-0.5 ${bar} transition-opacity ${activeRing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
            </button>
          ))}
        </div>

        {/* Directory Table Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, ID, email, or plan..."
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
              {!showArchived && (
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(
                    [
                      ["All", counts.total],
                      ["Active", counts.active],
                      ["Suspended", counts.suspended],
                    ] as const
                  ).map(([tab, count]) => {
                    const active = filter === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFilter(tab)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          active
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab}{" "}
                        <span className={`ml-1 tabular-nums ${active ? "text-[#2166f3]" : "text-slate-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showArchived
                    ? "border-[#2166f3] bg-blue-50 text-[#2166f3]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Archive size={14} />
                {showArchived ? "Back to Active" : `Archived (${counts.archived})`}
              </button>

              <span className="ml-1 text-xs font-medium tabular-nums text-slate-400">
                {rows.length} {rows.length === 1 ? "record" : "records"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Subscriber</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Plan</th>
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
                            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                        <Users size={20} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        {showArchived ? "No archived subscribers" : "No subscribers found"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query || filter !== "All"
                          ? "Try adjusting your search or filter."
                          : "Add your first subscriber to get started."}
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
                  rows.map((subscriber) => {
                    const [id, name, email, plan, subscriberStatus, connectedDate, , contact, subProvince, subCity, , , , isArchived] = subscriber;
                    const locationText = [subCity, subProvince].filter(Boolean).join(", ");
                    const isActive = subscriberStatus === "Active";

                    return (
                      <tr key={id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2166f3]">
                              {getInitials(name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {displayFirstAndLastName(name)}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                #{id}{locationText ? ` · ${locationText}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-slate-700">{email}</p>
                          {contact && <p className="mt-0.5 text-xs tabular-nums text-slate-400">{contact}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2166f3]">
                            <Wifi size={12} />
                            {plan}
                          </span>
                          {connectedDate && (
                            <p className="mt-1 text-[11px] text-slate-400">Since {connectedDate}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`admin-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${
                              isActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {subscriberStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
                            {!isArchived ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(subscriber)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[#2166f3] transition-colors hover:bg-blue-50"
                                >
                                  <Pencil size={13} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void toggleArchive(id, true)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                                >
                                  <Archive size={13} />
                                  Archive
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void toggleArchive(id, false)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[#2166f3] transition-colors hover:bg-blue-50"
                                >
                                  <ArchiveRestore size={13} />
                                  Unarchive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteSubscriber(id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-red-500 transition-colors hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
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

      {isAdding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-xs"
          onMouseDown={() => setIsAdding(false)}
        >
          <form
            onSubmit={addSubscriber}
            onMouseDown={(event) => event.stopPropagation()}
            className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingSubscriber ? "Edit Subscriber" : "Add Subscriber"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {editingSubscriber ? `Updating account #${editingSubscriber[0]}` : "Create a new fiber subscriber account"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-form-modal-scroll-area min-h-0 flex-1 overflow-y-scroll">
              <div className="space-y-5 px-6 py-6">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Personal Information
                </h3>
                <Field label="First name *">
                  <input
                    name="firstName"
                    placeholder="Juan"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Middle name (optional)">
                  <input
                    name="middleName"
                    placeholder="Santos"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Last name *">
                  <input
                    name="lastName"
                    placeholder="dela Cruz"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Contact *">
                  <input
                    name="contact"
                    placeholder="09XXXXXXXXX"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <h3 className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Account Details
                </h3>
                <Field label="Plan">
                  <div className="relative mt-2">
                    <select
                      name="plan"
                      defaultValue="Fiber 100Mbps"
                      className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                    >
                      <option>Fiber 25Mbps</option>
                      <option>Fiber 50Mbps</option>
                      <option>Fiber 100Mbps</option>
                      <option>Fiber 200Mbps</option>
                      <option>Fiber 300Mbps</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </Field>
                <h3 className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Address
                </h3>
                <Field label="Province / State *">
                  <div className="relative mt-2">
                    <select
                      name="province"
                      value={province}
                      required
                      onChange={(event) => {
                        setProvince(event.target.value);
                        setCity("");
                        setBarangay("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Select province / state...</option>
                      {Object.keys(locations).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>
                <Field label="City / Municipality *">
                  <div className="relative mt-2">
                    <select
                      name="city"
                      value={city}
                      required
                      disabled={!province}
                      onChange={(event) => {
                        setCity(event.target.value);
                        setBarangay("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Select city / municipality...</option>
                      {cities.map((option) => (
                        <option key={option} value={option}>
                          {option === "SantaRosa" ? "Santa Rosa" : option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>
                <Field label="Barangay *">
                  <div className="relative mt-2">
                    <select
                      name="barangay"
                      value={barangay}
                      required
                      disabled={!city}
                      onChange={(event) => setBarangay(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select barangay...</option>
                      {barangays.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>
                <Field label="House No. / Street *">
                  <input
                    name="street"
                    placeholder="e.g. 12 Sampaguita St."
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Zip Code">
                  <input
                    name="zipCode"
                    placeholder="e.g. 1000"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#2166f3] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30 hover:bg-[#1d57d6]"
              >
                {saving ? "Saving..." : editingSubscriber ? "Save changes" : "Add Subscriber"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
