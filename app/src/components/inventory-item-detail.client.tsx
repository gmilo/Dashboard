"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { toNumber } from "@/lib/num";

type InventoryItem = any;

type ItemResponse = { success: boolean; item?: InventoryItem; error?: string };
type LogsResponse = { success: boolean; data?: any[]; error?: string };
type TxResponse = { success: boolean; data?: any[]; error?: string };

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

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

export function InventoryItemDetail({ id, initialFrom, initialTo }: { id: string; initialFrom: string; initialTo: string }) {
  const [from, setFrom] = useState<string>(initialFrom);
  const [to, setTo] = useState<string>(initialTo);

  const { data: itemData, error: itemError, isLoading: itemLoading } = useSWR<ItemResponse>(["inv-item", id], async () => {
    const res = await fetch(`/api/inventory/item/${encodeURIComponent(id)}`);
    const json = (await res.json()) as ItemResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const item = itemData?.item;
  const relatedProductIds = useMemo(() => {
    const rel = item?.related_products;
    if (!Array.isArray(rel)) return "";
    const ids = rel.map((p: any) => p?.id).filter((x: any) => x !== null && x !== undefined).map((x: any) => String(x));
    return Array.from(new Set(ids)).join(",");
  }, [item?.related_products]);

  const { data: logsData, error: logsError, isLoading: logsLoading } = useSWR<LogsResponse>(
    item ? (["inv-item-logs", id, from, to] as const) : null,
    async () => {
      const url = new URL(`/api/inventory/item/${encodeURIComponent(id)}/logs`, window.location.origin);
      url.searchParams.set("date_from", from);
      url.searchParams.set("date_to", to);
      url.searchParams.set("limit", "10");
      const res = await fetch(url.toString());
      const json = (await res.json()) as LogsResponse;
      if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  const { data: txData, error: txError, isLoading: txLoading } = useSWR<TxResponse>(
    item && relatedProductIds ? (["inv-item-tx", id, from, to, relatedProductIds] as const) : null,
    async () => {
      const url = new URL("/api/transactions", window.location.origin);
      url.searchParams.set("date_from", from);
      url.searchParams.set("date_to", to);
      url.searchParams.set("limit", "20");
      url.searchParams.set("product_id", relatedProductIds);
      const res = await fetch(url.toString());
      const json = (await res.json()) as TxResponse;
      if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  if (itemLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-52 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load inventory item: {itemError.message}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Inventory item not found.
      </div>
    );
  }

  const cost = item.cost_price_details ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-800" href="/inventory">
          ← Back
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-200/60 dark:bg-slate-800/60">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={item.name ?? "Inventory"} className="h-12 w-12 object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name ?? `Inventory #${id}`}</div>
            {item.name_sub ? <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.name_sub}</div> : null}
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm font-semibold">{toNumber(item.quantity)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Qty</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Company</div>
            <div className="font-semibold">{item.company_name ?? `Company ${item.company_id ?? ""}`}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">Validation days</div>
            <div className="font-semibold">{item.stock_meta_data?.validation_days ?? "—"}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">Cost price</div>
            <div className="font-semibold">
              {cost.cost_price ? `${money(Number(cost.cost_price))}` : "—"} {cost.cost_price_unit_label ? `${cost.cost_price_unit_label}` : ""}{" "}
              {cost.cost_price_size ? `(${cost.cost_price_size})` : ""}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">EA cost</div>
            <div className="font-semibold">{cost.ea_cost ? money(Number(cost.ea_cost)) : "—"}</div>
          </div>
        </div>

        {Array.isArray(item.tags) && item.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-amber-600/10 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Logs</div>
        {logsLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
          </div>
        ) : logsError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
            Failed to load logs: {logsError.message}
          </div>
        ) : !(logsData?.data ?? []).length ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No logs found for this range.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {(logsData?.data ?? []).map((log: any) => {
              const qty = parseQty(log.meta_data);
              const type = String(log.type ?? "");
              const isAdd = type.toLowerCase().includes("add");
              return (
                <div key={String(log.id ?? `${log.created_at}-${type}`)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{String(log.description ?? "") || "—"}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fmtDateTime(String(log.created_at ?? ""))}</div>
                    </div>
                    <div className={`shrink-0 text-right text-xs font-semibold tabular-nums ${isAdd ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                      {isAdd ? "+" : "-"}
                      {qty}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Transactions</div>
        {!relatedProductIds ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No related products found for this inventory item.</div>
        ) : txLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
          </div>
        ) : txError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
            Failed to load transactions: {txError.message}
          </div>
        ) : !(txData?.data ?? []).length ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No transactions found for this range.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {(txData?.data ?? []).map((t: any) => {
              const sale = t.sale ?? {};
              return (
                <div key={String(sale.id ?? Math.random())} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">
                        {sale.company_name ?? `Company ${sale.company_id ?? ""}`} • #{sale.id ?? "—"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fmtDateTime(String(sale.sale_date ?? ""))}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs font-semibold tabular-nums">{money(toNumber(sale.final_amount))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

