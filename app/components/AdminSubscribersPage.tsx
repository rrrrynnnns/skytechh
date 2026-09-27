"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
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

export function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(
    null,
  );
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
    fetch("/api/subscribers")
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
      .catch(() => undefined);
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
    const select = document.querySelector<HTMLSelectElement>(
      'form select[name="plan"]',
    );
    if (!select) return;
    const selectedPlan = formatPlanName(editingSubscriber?.[3] || plans[0]);
    select.replaceChildren(...plans.map((plan) => new Option(plan, plan)));
    select.value = plans.includes(selectedPlan) ? selectedPlan : plans[0];
  }, [isAdding, plans, editingSubscriber]);

  const rows = subscribers.filter(
    (subscriber) =>
      (showArchived ? subscriber[13] : !subscriber[13] && (filter === "All" || subscriber[4] === filter)) &&
      subscriber.join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const table = document.querySelector('table[class*="min-w-[1050px]"]');
    const toolbar = table
      ?.closest(".mt-7")
      ?.querySelector(":scope > div:first-child");
    if (!toolbar) return;
    const addBtn = toolbar.querySelector<HTMLButtonElement>("button:has(svg)");
    if (addBtn) {
      addBtn.onclick = () => {
        setEditingSubscriber(null);
        setProvince("");
        setCity("");
        setBarangay("");
        setIsAdding(true);
      };
    }
  }, []);

  useEffect(() => {
    const table = document.querySelector('table[class*="min-w-[1050px]"]');
    const toolbar = table
      ?.closest(".mt-7")
      ?.querySelector(":scope > div:first-child");
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
    counter.textContent = `${rows.length} records`;
  }, [rows.length]);

  async function addSubscriber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") || "Juan");
    const lastName = String(form.get("lastName") || "Santos");
    const email = String(form.get("email") || "email@skytech.net");
    const contact = String(form.get("contact") || "09XXXXXXXXX");
    const plan = String(form.get("plan") || "Fiber 100Mbps");
    const connectionDate = String(form.get("connectionDate") || "2026-09-04");
    const province = String(form.get("province") || "");
    const city = String(form.get("city") || "");
    const barangay = String(form.get("barangay") || "");
    const street = String(form.get("street") || "");
    const zipCode = String(form.get("zipCode") || "");
    const fullName = `${firstName} ${lastName}`;

    if (editingSubscriber) {
      const address =
        [street, barangay, city, province, zipCode]
          .filter(Boolean)
          .join(", ") ||
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
          province,
          city,
          barangay,
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
                province,
                city,
                barangay,
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
      [street, barangay, city, province, zipCode].filter(Boolean).join(", ") ||
      "Address not provided";
    const response = await fetch("/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        email,
        contact,
        address,
        province,
        city,
        barangay,
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
  }

  useEffect(() => {
    function handleTableAction(event: MouseEvent) {
      const button = (event.target as HTMLElement).closest("button");
      const row = button?.closest("tr");
      const id = row?.querySelector("td")?.textContent?.trim();
      if (!button) return;
      if (!row) {
        if (button.textContent?.trim() === "Add Subscriber") {
          setEditingSubscriber(null);
          setStatus("Active");
        }
        return;
      }
      if (!id) return;
      const subscriber = subscribers.find((item) => item[0] === id);
      if (!subscriber) return;
      if (button.textContent?.trim() === "Archive") {
        fetch(`/api/subscribers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) })
          .then((response) => {
            if (response.ok) setSubscribers((current) => current.map((item) => item[0] === id ? [item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9], item[10], item[11], item[12], true] : item));
          })
          .catch(() => undefined);
        return;
      }
      if (button.textContent?.trim() === "Unarchive") {
        fetch(`/api/subscribers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: false }) })
          .then((response) => {
            if (response.ok) setSubscribers((current) => current.map((item) => item[0] === id ? [item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9], item[10], item[11], item[12], false] : item));
          })
          .catch(() => undefined);
        return;
      }
      if (button.textContent?.trim() === "Delete") {
        if (window.confirm("Delete this subscriber?")) {
          fetch(`/api/subscribers/${id}`, { method: "DELETE" })
            .then((response) => {
              if (response.ok)
                setSubscribers((current) =>
                  current.filter((item) => item[0] !== id),
                );
            })
            .catch(() => undefined);
        }
      }
      if (button.textContent?.trim() === "Edit") {
        setEditingSubscriber(subscriber);
        setStatus(subscriber[4]);
        setIsAdding(true);
      }
    }
    document.addEventListener("click", handleTableAction);
    return () => document.removeEventListener("click", handleTableAction);
  }, [subscribers]);

  useEffect(() => {
    if (!isAdding) return;
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    const title = form.querySelector("h2");
    const submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    ["province", "city", "barangay"].forEach((name) => {
      const field = form.elements.namedItem(name) as HTMLSelectElement | null;
      if (field) field.required = false;
    });
    if (!editingSubscriber) {
      form.reset();
      if (title) title.textContent = "Add Subscriber";
      if (submitButton) submitButton.textContent = "Add Subscriber";
      setProvince("");
      setCity("");
      setBarangay("");
      return;
    }
    if (title) title.textContent = "Edit Subscriber";
    if (submitButton) submitButton.textContent = "Save changes";
    const [firstName, ...middleAndLast] = editingSubscriber[1].split(" ");
    const lastName = middleAndLast.pop() || "";
    (form.elements.namedItem("firstName") as HTMLInputElement).value =
      firstName;
    (form.elements.namedItem("lastName") as HTMLInputElement).value = lastName;
    (form.elements.namedItem("email") as HTMLInputElement).value =
      editingSubscriber[2];
    (form.elements.namedItem("contact") as HTMLInputElement).value =
      editingSubscriber[7];
    (form.elements.namedItem("plan") as HTMLSelectElement).value =
      formatPlanName(editingSubscriber[3]);
    (form.elements.namedItem("connectionDate") as HTMLInputElement).value =
      editingSubscriber[5];
    setProvince(editingSubscriber[8]);
    setCity(editingSubscriber[9]);
    setBarangay(editingSubscriber[10]);
    (form.elements.namedItem("street") as HTMLInputElement).value =
      editingSubscriber[11];
    (form.elements.namedItem("zipCode") as HTMLInputElement).value =
      editingSubscriber[12];
  }, [editingSubscriber, isAdding]);

  useEffect(() => {
    if (!isAdding || provinces.length) return;
    let cancelled = false;
    Promise.all([
      fetch(`${PSGC_API}/provinces/`).then((response) => response.json()),
      fetch(`${PSGC_API}/regions/130000000/cities-municipalities/`).then(
        (response) => response.json(),
      ),
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
  }, [province, provinces, editingSubscriber]);

  useEffect(() => {
    if (!city || !cityOptions.length) return;
    const selected = cityOptions.find((option) => option.name === city);
    if (selected)
      void loadBarangays(
        selected,
        editingSubscriber?.[9] === city ? editingSubscriber?.[10] || "" : "",
      );
  }, [city, cityOptions, editingSubscriber]);

  async function loadCities(
    provinceOption: LocationOption,
    selectedCity = "",
    selectedBarangay = "",
  ) {
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
  }

  async function loadBarangays(
    cityOption: LocationOption,
    selectedBarangay = "",
  ) {
    setBarangay(selectedBarangay);
    setBarangays([]);
    try {
      const response = await fetch(
        `${PSGC_API}/cities-municipalities/${cityOption.code}/barangays/`,
      );
      if (!response.ok) throw new Error("Location request failed");
      const options: LocationOption[] = await response.json();
      const names = sortLocations(options).map((option) => option.name);
      setBarangays(names);
      if (selectedBarangay && names.includes(selectedBarangay))
        setBarangay(selectedBarangay);
    } catch {}
  }

  const locations = Object.fromEntries(
    provinces.map((option) => [option.name, option.code]),
  );
  const selectClass =
    "mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage subscriber accounts
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSubscriber(null);
            setProvince("");
            setCity("");
            setBarangay("");
            setIsAdding(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#3b4fd8] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2d3fc7]"
        >
          <Plus size={17} />
          Add Subscriber
        </button>
      </div>
      <div className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subscribers..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]"
            />
          </div>
          <label className="status-filter-container relative">
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter subscribers" className="admin-filter-dropdown status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8]">
            <option>All</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
          </label>
          <button type="button" onClick={() => setShowArchived((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600">{showArchived ? "Active" : "Archived"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "SUBSCRIBER ID",
                  "Name",
                  "Email",
                  "Plan",
                  "Status",
                  "Connected",
                  "Actions",
                ].map((heading) => (
                  <th className="px-5 py-4" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(
                ([id, name, email, plan, subscriberStatus, connected]) => (
                  <tr className="border-t border-slate-100" key={id}>
                    <td className="px-5 py-4 text-slate-900">{id}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {name}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{email}</td>
                    <td className="px-5 py-4 text-slate-500">{plan}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${subscriberStatus === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}
                      >
                        {subscriberStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{connected}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3 text-xs font-semibold">
                        {!subscribers.find((item) => item[0] === id)?.[13] ? <>
                          <button className="text-[#2563eb]">Edit</button>
                          <button className="text-slate-500">Archive</button>
                        </> : <>
                          <button className="text-[#2563eb]">Unarchive</button>
                          <button className="text-red-500">Delete</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isAdding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"
          onMouseDown={() => setIsAdding(false)}
        >
          <form
            onSubmit={addSubscriber}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <h2 className="text-lg font-bold">Add Subscriber</h2>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>
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
              <Field label="Connection date">
                <input
                  name="connectionDate"
                  type="date"
                  defaultValue="2026-09-04"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
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
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add Subscriber
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
