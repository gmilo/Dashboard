"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDaysISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import Link from "next/link";

type UsageRow = any;

type UsageResponse = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  data?: UsageRow[];
  error?: string;
};

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export function InventoryUsageReport({ todayISO }: { todayISO: string }) {
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

  const key = ["inv-usage", range.from, range.to, companyId] as const;
  const { data, error, isLoading } = useSWR<UsageResponse>(key, async () => {
    const url = new URL("/api/inventory/usage", window.location.origin);
    url.searchParams.set("date_from", range.from);
    url.searchParams.set("date_to", range.to);
    url.searchParams.set("limit", "100");
    if (companyId) url.searchParams.set("company_id", companyId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as UsageResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const assignedCompanyCount = data?.assignedCompanyCount ?? 0;
  const companies = useMemo(() => [...(data?.companies ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data?.companies]);
  const rows = data?.data ?? [];
  const showCompany = !companyId;

  const daysDiff = useMemo(() => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 1;
    return Math.max(1, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [range.from, range.to]);

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
        Failed to load inventory usage: {error.message}
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
          Range: {range.from} → {range.to} • Days: {daysDiff} • Limit 100
        </div>
      </section>

      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">No inventory usage found for this range.</div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                {showCompany ? <th className="px-3 py-2 text-left font-medium">Company</th> : null}
                <th className="px-3 py-2 text-center font-medium">+</th>
                <th className="px-3 py-2 text-center font-medium">-</th>
                <th className="px-3 py-2 text-center font-medium">AVG/day</th>
                <th className="px-3 py-2 text-right font-medium">Usage cost</th>
                <th className="px-3 py-2 text-center font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const invId = item.reference_id ?? item.inventory_id ?? item.id ?? null;
                const types = Array.isArray(item.types) ? item.types : [];
                const addStock = toNumber(types.find((t: any) => t?.type === "AddStock")?.total_quantity);
                const subStock = toNumber(types.find((t: any) => t?.type === "SubtractStock")?.total_quantity);
                const cp = item.cost_price ?? {};
                const eaCost = toNumber(cp.ea_cost);
                const usageCost = eaCost * (subStock + addStock);
                const avgPerDay = subStock / daysDiff;
                const stockQty = toNumber(item.inventory_quantity ?? item.quantity);
                const companyName = item.company_name ?? item.company ?? `Company ${item.company_id ?? ""}`;
                return (
                  <tr key={String(item.reference_id ?? item.id ?? item.inventory_name ?? item.name)} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(item.image)} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                        )}
                        <div className="min-w-0">
                          {invId ? (
                            <Link href={`/inventory/items/${invId}`} className="block truncate font-semibold text-sky-700 hover:underline dark:text-sky-300">
                              {item.inventory_name ?? item.name ?? "Item"}
                            </Link>
                          ) : (
                            <div className="truncate font-semibold">{item.inventory_name ?? item.name ?? "Item"}</div>
                          )}
                          {item.inventory_name_sub || item.name_sub ? <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.inventory_name_sub ?? item.name_sub}</div> : null}
                        </div>
                      </div>
                    </td>
                    {showCompany ? <td className="px-3 py-2">{companyName}</td> : null}
                    <td className="px-3 py-2 text-center font-semibold text-emerald-700 dark:text-emerald-300">{addStock}</td>
                    <td className="px-3 py-2 text-center font-semibold text-rose-700 dark:text-rose-300">{subStock}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{avgPerDay.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{money(usageCost)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{stockQty}</td>
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
