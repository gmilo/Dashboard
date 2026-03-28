"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDaysISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";

type TransactionItem = {
  item_name?: string;
  category_name?: string | null;
  quantity?: number | string;
  children?: TransactionItem[];
};

type TransactionSale = {
  id: number;
};

type Transaction = { sale: TransactionSale; items: TransactionItem[] };

type TransactionsResponse = {
  success: boolean;
  data?: Transaction[];
  error?: string;
};

type Preset = "week" | "month" | "custom";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function flattenItems(items: TransactionItem[]): TransactionItem[] {
  const out: TransactionItem[] = [];
  const stack = [...items];
  while (stack.length) {
    const item = stack.shift()!;
    out.push(item);
    if (Array.isArray(item.children) && item.children.length) stack.unshift(...item.children);
  }
  return out;
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function MemberFavourites({ memberId, todayISO }: { memberId: string; todayISO: string }) {
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState<string>(startOfWeekISO(todayISO));
  const [customTo, setCustomTo] = useState<string>(todayISO);

  const range = useMemo(() => {
    if (preset === "week") return { from: startOfWeekISO(todayISO), to: todayISO };
    if (preset === "month") return { from: startOfMonthISO(todayISO), to: todayISO };
    const from = isISODate(customFrom) ? customFrom : todayISO;
    const to = isISODate(customTo) ? customTo : todayISO;
    return { from, to };
  }, [preset, todayISO, customFrom, customTo]);

  const key = ["member-favourites", memberId, range.from, range.to] as const;
  const { data, error, isLoading } = useSWR<TransactionsResponse>(key, async () => {
    const url = new URL("/api/transactions", window.location.origin);
    url.searchParams.set("date_from", range.from);
    url.searchParams.set("date_to", range.to);
    url.searchParams.set("limit", "0");
    url.searchParams.set("member_id", memberId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as TransactionsResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const favourites = useMemo(() => {
    const rows = data?.data ?? [];
    const byCategory: Record<string, { total: number; products: Record<string, number> }> = {};

    for (const t of rows) {
      const flat = flattenItems(t.items ?? []);
      for (const item of flat) {
        const name = (item.item_name ?? "").trim();
        if (!name) continue;
        const category = (item.category_name ?? "").trim() || "Other";
        const qty = Math.max(1, toNumber(item.quantity));
        if (!byCategory[category]) byCategory[category] = { total: 0, products: {} };
        byCategory[category].total += qty;
        byCategory[category].products[name] = (byCategory[category].products[name] ?? 0) + qty;
      }
    }

    const categories = Object.entries(byCategory)
      .map(([category, v]) => {
        const topProducts = Object.entries(v.products)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }));
        return { category, total: v.total, topProducts };
      })
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

    return categories;
  }, [data?.data]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Favourite products</div>
        <select
          className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs dark:border-slate-800"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
        >
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {preset === "custom" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">From</div>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
            />
          </label>
          <label className="block text-xs">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">To</div>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Range: {range.from} → {range.to}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        </div>
      ) : error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          Failed to load favourites: {error.message}
        </div>
      ) : favourites.length ? (
        <div className="mt-3 space-y-3">
          {favourites.slice(0, 6).map((c) => (
            <div key={c.category} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-3">
                <div className="truncate text-sm font-semibold">{c.category}</div>
                <div className="whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">{c.total} sold</div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {c.topProducts.map((p) => (
                  <div key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="min-w-0 truncate">{p.name}</div>
                    <div className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">{p.count}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No favourites for this range yet.</div>
      )}
    </section>
  );
}

