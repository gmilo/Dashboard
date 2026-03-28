"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDaysISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import Link from "next/link";

type InventoryLog = any;

type LogsResponse = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  data?: InventoryLog[];
  error?: string;
};

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

function fmtDateTime(s?: string) {
  if (!s) return "";
  const cleaned = s.split(".")[0] ?? s;
  const dt = new Date(cleaned.replace(" ", "T") + "Z");
  if (!Number.isFinite(dt.getTime())) return s;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(dt);
}

function parseQty(metaData: unknown): number {
  if (!metaData) return 0;
  try {
    const parsed = typeof metaData === "string" ? JSON.parse(metaData) : metaData;
    const q = (parsed as any)?.quantity;
    const n = typeof q === "number" ? q : Number(String(q ?? ""));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function badge(type: string) {
  const isAdd = type.toLowerCase().includes("add");
  return isAdd ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-600/10 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200";
}

export function InventoryLogsReport({ todayISO }: { todayISO: string }) {
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayISO);
  const [customTo, setCustomTo] = useState<string>(todayISO);
  const [companyId, setCompanyId] = useState<string>("");

  const range = useMemo(() => {
    if (preset === "today") return { from: todayISO, to: todayISO };
    if (preset === "yesterday") {
      const y = addDaysISO(todayISO, -1);
      return { from: y, to: y };
    }
    if (preset === "week") return { from: startOfWeekISO(todayISO), to: todayISO };
    if (preset === "month") return { from: startOfMonthISO(todayISO), to: todayISO };
    return { from: customFrom || todayISO, to: customTo || todayISO };
  }, [preset, todayISO, customFrom, customTo]);

  const key = ["inv-logs", range.from, range.to, companyId] as const;
  const { data, error, isLoading } = useSWR<LogsResponse>(key, async () => {
    const url = new URL("/api/inventory/logs", window.location.origin);
    url.searchParams.set("date_from", range.from);
    url.searchParams.set("date_to", range.to);
    url.searchParams.set("limit", "100");
    if (companyId) url.searchParams.set("company_id", companyId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as LogsResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const assignedCompanyCount = data?.assignedCompanyCount ?? 0;
  const companies = useMemo(() => [...(data?.companies ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data?.companies]);
  const rows = data?.data ?? [];
  const showCompany = !companyId;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-52 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load inventory logs: {error.message}
      </div>
    );
  }

  if (!assignedCompanyCount) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        You haven&apos;t been assigned to a company yet. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Filters</div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <select className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>
            <select className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {preset === "custom" ? (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input type="date" className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          ) : null}
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Range: {range.from} → {range.to} • Limit 100
        </div>
      </section>

      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">No inventory logs found for this range.</div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Inventory</th>
                <th className="text-center">Qty</th>
                <th>Employee</th>
                <th>Description</th>
                <th>Type</th>
                <th>Date</th>
                {showCompany ? <th>Company</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => {
                const inv = log.inventory ?? {};
                const employee = log.employee ?? {};
                const qty = parseQty(log.meta_data);
                const type = String(log.type ?? "—");
                const isAdd = type.toLowerCase().includes("add");
                const qtyText = `${isAdd ? "+" : "-"}${qty || 0}`;
                const empName = employee.name_preferred || `${employee.name_first ?? ""} ${employee.name_last ?? ""}`.trim() || "—";
                const company = log.company ?? log.company_name ?? `Company ${log.company_id ?? ""}`;
                const invId = inv.id ?? log.inventory_id ?? log.inventoryId ?? null;
                return (
                  <tr key={String(log.id ?? `${type}-${log.created_at}-${inv.name}`)}>
                    <td>
                      {invId ? (
                        <Link href={`/inventory/items/${invId}`} className="font-semibold text-sky-700 hover:underline dark:text-sky-300">
                          {inv.name ?? "Unknown"}
                        </Link>
                      ) : (
                        <div className="font-semibold">{inv.name ?? "Unknown"}</div>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400">Stock: {inv.quantity ?? "—"}</div>
                    </td>
                    <td className={`text-center font-semibold ${isAdd ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{qtyText}</td>
                    <td>{empName}</td>
                    <td>
                      <span className="max-w-[260px] truncate inline-block align-top">{String(log.description ?? "")}</span>
                    </td>
                    <td>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${badge(type)}`}>{type}</span>
                    </td>
                    <td>{fmtDateTime(String(log.created_at ?? ""))}</td>
                    {showCompany ? <td>{company}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
