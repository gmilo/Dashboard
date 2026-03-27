"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import { X } from "lucide-react";

type TransactionItem = {
  id?: number;
  product_id?: number | string;
  sku?: string;
  parent_id?: string | number | null;
  variation?: string | null;
  item_name?: string;
  tag?: string | null;
  quantity?: number | string;
  unit_price?: number | string;
  category_name?: string | null;
  status?: string | null;
  children?: TransactionItem[];
};

type TransactionSale = {
  id: number;
  company_id: number;
  company_name?: string | null;
  sale_date?: string;
  source?: string | null;
  external_reference?: string | null;
  status?: string | null;
  total_amount?: string | number | null;
  discount?: string | number | null;
  final_amount?: string | number | null;
  payment_type?: string | null;
  type?: string | null;
  refunded_amount?: string | number | null;
  refunded_method?: string | null;
  member?: {
    id?: string | number;
    member_no?: string | number;
    given_names?: string;
    surname?: string;
    email?: string;
    mobile?: string;
    source?: string;
  } | null;
};

type Transaction = { sale: TransactionSale; items: TransactionItem[] };

type TransactionsResponse = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  meta?: { payment_types?: Record<string, number>; status?: Record<string, number> };
  data?: Transaction[];
  error?: string;
};

type Preset = "today" | "week" | "month" | "custom";
type StatusFilter = "" | "completed" | "not_completed";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function fmtDateTime(s?: string | null) {
  if (!s) return "";
  const dt = new Date(s);
  if (!Number.isFinite(dt.getTime())) return String(s);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(dt);
}

function fmtWhen(s?: string | null, todayISO?: string) {
  if (!s) return { primary: "", secondary: "" };
  const isoDay = typeof s === "string" ? s.slice(0, 10) : "";
  const dt = new Date(s);
  if (!Number.isFinite(dt.getTime())) return { primary: String(s), secondary: "" };

  const time = new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit" }).format(dt);
  if (todayISO && isoDay === todayISO) {
    return { primary: time, secondary: "" };
  }
  const date = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(dt);
  return { primary: date, secondary: time };
}

function statusBadge(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  return "bg-amber-600/10 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200";
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

export function TransactionsReport({ todayISO }: { todayISO: string }) {
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayISO);
  const [customTo, setCustomTo] = useState<string>(todayISO);
  const [companyId, setCompanyId] = useState<string>("");
  const [discountOnly, setDiscountOnly] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusFilter>("");
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const range = useMemo(() => {
    if (preset === "today") return { from: todayISO, to: todayISO };
    if (preset === "week") return { from: startOfWeekISO(todayISO), to: todayISO };
    if (preset === "month") return { from: startOfMonthISO(todayISO), to: todayISO };
    return { from: customFrom || todayISO, to: customTo || todayISO };
  }, [preset, todayISO, customFrom, customTo]);

  const key = ["transactions", range.from, range.to, companyId, discountOnly ? "1" : "0", status] as const;

  const { data, error, isLoading } = useSWR<TransactionsResponse>(key, async () => {
    const url = new URL("/api/transactions", window.location.origin);
    url.searchParams.set("date_from", range.from);
    url.searchParams.set("date_to", range.to);
    url.searchParams.set("limit", "0");
    if (companyId) url.searchParams.set("company_id", companyId);
    if (discountOnly) url.searchParams.set("discount", "1");
    if (status) url.searchParams.set("status", status);
    const res = await fetch(url.toString());
    const json = (await res.json()) as TransactionsResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const assignedCompanyCount = data?.assignedCompanyCount ?? 0;
  const companies = useMemo(() => [...(data?.companies ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data?.companies]);
  const rows = data?.data ?? [];
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.sale.id ?? 0) - (a.sale.id ?? 0)), [rows]);
  const visible = sorted.slice(0, visibleCount);
  const showCompanyColumn = !companyId;

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
        Failed to load transactions: {error.message}
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
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setVisibleCount(50);
              }}
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="not_completed">Not completed</option>
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
          Range: {range.from} → {range.to} • Showing {Math.min(visible.length, sorted.length)} of {sorted.length}
        </div>
      </section>

      {!assignedCompanyCount ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          You haven&apos;t been assigned to a company yet. Please contact an administrator.
        </div>
      ) : sorted.length ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                {showCompanyColumn ? <th className="px-3 py-2 text-left font-medium">Company</th> : null}
                <th className="px-3 py-2 text-left font-medium">Items</th>
                <th className="px-3 py-2 text-right font-medium">Final</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const itemsFlat = flattenItems(t.items ?? []);
                const itemNames = itemsFlat.map((i) => i.item_name).filter(Boolean) as string[];
                const itemSummary = itemNames.slice(0, 2).join(", ");
                const remaining = Math.max(0, itemNames.length - 2);
                const when = fmtWhen(t.sale.sale_date, todayISO);
                return (
                  <tr
                    key={t.sale.id}
                    className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950/40"
                    onClick={() => setSelected(t)}
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">
                        {when.primary}
                        {when.secondary ? <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">{when.secondary}</span> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${statusBadge(t.sale.status)}`}>
                          {t.sale.status ?? "Unknown"}
                        </span>
                        {t.sale.payment_type ? (
                          <span className="inline-flex rounded-full bg-slate-600/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
                            {t.sale.payment_type}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {showCompanyColumn ? (
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{t.sale.company_name ?? `Company ${t.sale.company_id}`}</div>
                      </td>
                    ) : null}
                    <td className="px-3 py-2 align-top">
                      <div className="text-sm">{itemSummary || "—"}</div>
                      {remaining ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">+{remaining} more</div> : null}
                      {t.sale.external_reference ? (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Ref {t.sale.external_reference}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right align-top tabular-nums">{money(toNumber(t.sale.final_amount))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sorted.length > visible.length ? (
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
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No transactions found for this range.
        </div>
      )}

      {selected ? <TransactionModal tx={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const sale = tx.sale;
  const items = tx.items ?? [];

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {sale.company_name ?? `Company ${sale.company_id}`} • #{sale.id}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(sale.sale_date)}</div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadge(sale.status)}`}>{sale.status ?? "Unknown"}</span>
          {sale.payment_type ? (
            <span className="rounded-full bg-slate-600/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
              {sale.payment_type}
            </span>
          ) : null}
          {sale.external_reference ? (
            <span className="rounded-full bg-slate-600/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
              Ref {sale.external_reference}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Total" value={money(toNumber(sale.total_amount))} />
          <Metric label="Discount" value={money(toNumber(sale.discount))} />
          <Metric label="Final" value={money(toNumber(sale.final_amount))} />
        </div>

        {sale.refunded_amount ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
            Refunded {money(toNumber(sale.refunded_amount))} {sale.refunded_method ? `(${sale.refunded_method})` : ""}
          </div>
        ) : null}

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Items</div>
          <div className="mt-2 space-y-2">
            {items.length ? (
              items.map((item) => <ItemRow key={String(item.id ?? `${item.product_id}-${item.sku}-${item.item_name}`)} item={item} level={0} />)
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">No items</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ItemRow({ item, level }: { item: TransactionItem; level: number }) {
  const qty = toNumber(item.quantity);
  const unit = toNumber(item.unit_price);
  const productId = String(item.product_id ?? "").trim();
  const name = item.item_name ?? "Item";

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">
          {qty ? `${qty}× ` : ""}
          {name}
        </div>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {item.tag ? item.tag : item.category_name ? item.category_name : ""}
          {productId ? ` • #${productId}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
        {unit ? money(unit * (qty || 1)) : ""}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900" style={{ marginLeft: level ? level * 12 : 0 }}>
      {productId ? (
        <Link href={`/drinks/${productId}`} className="block hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
      {Array.isArray(item.children) && item.children.length ? (
        <div className="mt-2 space-y-2">
          {item.children.map((c) => (
            <ItemRow key={String(c.id ?? `${c.product_id}-${c.sku}-${c.item_name}`)} item={c} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
