"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDaysISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import { useRouter } from "next/navigation";

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

function getOrderUnit(item: any): { label: string; size: number } | null {
  const candidates = [
    item?.units,
    item?.inventory_units,
    item?.stock_meta_data?.units,
    item?.inventory?.units,
    item?.inventory?.stock_meta_data?.units
  ];
  for (const c of candidates) {
    if (!Array.isArray(c) || !c.length) continue;
    const last = c[c.length - 1];
    const label = typeof last?.label === "string" ? last.label : "";
    const size = Number(last?.size ?? 0);
    if (!label || !Number.isFinite(size) || size <= 0) continue;
    return { label, size };
  }

  const fallbacks: any[] = [
    item?.cost_price,
    item?.inventory_cost_price,
    item,
    item?.inventory
  ];

  for (const f of fallbacks) {
    const label =
      typeof (f as any)?.unit_label === "string"
        ? ((f as any).unit_label as string)
        : typeof (f as any)?.cost_price_unit_label === "string"
          ? ((f as any).cost_price_unit_label as string)
          : "";
    const sizeRaw =
      (f as any)?.unit_size ??
      (f as any)?.cost_price_size ??
      (f as any)?.cost_price_unit_size ??
      (f as any)?.unit_quantity ??
      (f as any)?.cost_price_unit_quantity ??
      0;
    const sizeParsed = Number(sizeRaw);
    const size = Number.isFinite(sizeParsed) && sizeParsed > 0 ? sizeParsed : label ? 1 : 0;
    if (!label || !Number.isFinite(size) || size <= 0) continue;
    return { label, size };
  }

  return null;
}

export function InventoryUsageReport({ todayISO }: { todayISO: string }) {
  const router = useRouter();
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
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-center">+</th>
                <th className="text-center">-</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Avg</th>
                <th className="text-right">Cost</th>
                {showCompany ? <th className="hidden sm:table-cell">Company</th> : null}
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
                const href = invId ? `/inventory/items/${invId}` : "";
                const orderUnit = getOrderUnit(item);
                const used = Math.max(0, Math.abs(subStock));
                const usagePct = orderUnit && orderUnit.size > 0 ? Math.max(0, Math.min(100, (used / orderUnit.size) * 100)) : null;
                const orderUnitsNeeded = orderUnit && orderUnit.size > 0 ? Math.max(0, Math.ceil(used / orderUnit.size)) : null;
                return (
                  <tr
                    key={String(item.reference_id ?? item.id ?? item.inventory_name ?? item.name)}
                    className={`${href ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40" : ""}`}
                    onClick={() => (href ? router.push(href) : null)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(item.image)} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                        )}
                        <div className="min-w-0">
                          <div className="flex max-w-[220px] items-baseline gap-2">
                            <div className="min-w-0 truncate font-semibold text-slate-900 dark:text-white">{item.inventory_name ?? item.name ?? "Item"}</div>
                            {orderUnit ? (
                              <div className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {orderUnit.label}({orderUnit.size})
                              </div>
                            ) : null}
                          </div>
                          {orderUnit && used > 0 ? (
                            <div className="mt-1" title={`Used: ${used} • Order: ${orderUnitsNeeded ?? 0} ${orderUnit.label}`}>
                              <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-rose-600 dark:bg-rose-500" style={{ width: `${usagePct ?? 0}%` }} />
                              </div>
                              <div className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                                Used {used}
                                {orderUnitsNeeded && orderUnitsNeeded > 1 ? ` • Order ${orderUnitsNeeded} ${orderUnit.label}` : orderUnitsNeeded === 1 ? ` • Order 1 ${orderUnit.label}` : ""}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-center font-semibold text-emerald-700 dark:text-emerald-300">{addStock === 0 ? "" : addStock}</td>
                    <td className="text-center font-semibold text-rose-700 dark:text-rose-300">{subStock}</td>
                    <td className="text-center tabular-nums font-semibold">{stockQty}</td>
                    <td className="text-center tabular-nums">{avgPerDay.toFixed(2)}</td>
                    <td className="text-right tabular-nums font-semibold">{money(usageCost)}</td>
                    {showCompany ? <td className="hidden sm:table-cell">{companyName}</td> : null}
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
