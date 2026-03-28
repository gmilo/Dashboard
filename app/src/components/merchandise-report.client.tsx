"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDaysISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import { useRouter } from "next/navigation";

type Row = {
  company: string;
  company_id: number;
  product_id: number | string;
  item_name: string;
  category: string;
  tag: string;
  avg: number;
  qty: number;
  amount: number;
};

type Response = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  meta?: { tags?: Record<string, number>; categories?: Record<string, number> };
  data?: Row[];
  error?: string;
};

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export function MerchandiseReport({ todayISO }: { todayISO: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayISO);
  const [customTo, setCustomTo] = useState<string>(todayISO);
  const [tag, setTag] = useState<string>("");
  const [discountOnly, setDiscountOnly] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(50);

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

  const key = ["merchandise", range.from, range.to, tag, discountOnly ? "1" : "0", companyId] as const;

  const { data, error, isLoading } = useSWR<Response>(key, async () => {
    const url = new URL("/api/merchandise", window.location.origin);
    url.searchParams.set("date_from", range.from);
    url.searchParams.set("date_to", range.to);
    url.searchParams.set("limit", "0");
    if (tag) url.searchParams.set("tag", tag);
    if (discountOnly) url.searchParams.set("discount", "1");
    if (companyId) url.searchParams.set("company_id", companyId);

    const res = await fetch(url.toString());
    const json = (await res.json()) as Response;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const rows = data?.data ?? [];
  const assignedCompanyCount = data?.assignedCompanyCount ?? 0;

  const tags = useMemo(() => {
    const m = data?.meta?.tags ?? {};
    const entries = Object.entries(m);
    entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0) || a[0].localeCompare(b[0]));
    const values = entries.map(([t]) => t);
    if (tag && !values.includes(tag)) values.unshift(tag);
    return values;
  }, [data?.meta?.tags, tag]);

  const companies = useMemo(() => {
    const list = data?.companies ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.companies]);

  const sorted = useMemo(() => [...rows].sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0)), [rows]);
  const visibleRows = sorted.slice(0, visibleCount);

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
        Failed to load merchandise: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Filters</div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value as Preset);
                setVisibleCount(50);
              }}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>
            <select
              className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setVisibleCount(50);
              }}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setVisibleCount(50);
              }}
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <span>Discount only</span>
              <input
                type="checkbox"
                checked={discountOnly}
                onChange={(e) => {
                  setDiscountOnly(e.target.checked);
                  setVisibleCount(50);
                }}
              />
            </label>
          </div>

          {preset === "custom" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                From
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                To
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Range: {range.from} → {range.to} • Showing {Math.min(visibleRows.length, sorted.length)} of {sorted.length}
        </div>
      </section>

      {!assignedCompanyCount ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          You haven&apos;t been assigned to a company yet. Please contact an administrator.
        </div>
      ) : !sorted.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No merchandise found for this range.
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={`${r.company_id}-${r.product_id}`}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40"
                  onClick={() => router.push(`/drinks/${r.product_id}`)}
                >
                  <td>
                    <div className="max-w-[240px] truncate font-semibold text-slate-900 dark:text-white">{r.item_name}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{r.company}</div>
                  </td>
                  <td className="text-right tabular-nums font-semibold">{r.qty}</td>
                  <td className="text-right tabular-nums font-semibold">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sorted.length > visibleRows.length ? (
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <button
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                onClick={() => setVisibleCount((c) => c + 50)}
              >
                Show 50 more
              </button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
