"use client";

import Image from "next/image";
import { HourlySalesChart, type HourlyPoint } from "@/components/hourly-sales-chart";
import { StoreShiftsStrip, type ShiftPerson } from "@/components/store-shifts-strip";
import { formatAUD, formatNumber } from "@/lib/format";
import type { Store } from "@/lib/stores";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

type SalesPerDayRow = {
  date?: string;
  sold?: number;
  sales_count?: number;
  avg_per_sale?: number;
  amounts?: {
    gross?: number;
    discount?: number;
    system?: number;
    amount?: number;
    final_amount?: number;
  };
};

export function StoreHourlyCard({
  store,
  date,
  summary,
  perDay,
  perDayHistory,
  categoriesSummary,
  categoriesDetails,
  chart,
  shifts
}: {
  store: Store;
  date: string;
  summary: { txns: number; drinks: number; totalAmount: number };
  perDay?: { today: SalesPerDayRow; yesterday?: SalesPerDayRow | null };
  perDayHistory?: SalesPerDayRow[];
  categoriesSummary?: {
    cups: {
      total: number;
      regular: { qty: number; amount: number };
      large: { qty: number; amount: number };
      jumbo: { qty: number; amount: number };
    };
    merchandise: { qty: number; amount: number };
    softServe: { qty: number; amount: number };
  };
  categoriesDetails?: {
    date: string;
    totals: { total_qty?: number; total_price?: string | number } | null;
    rows: Array<{ category?: string; item_name?: string | null; total_qty?: number; total_price?: string | number; avg_price?: string | number }>;
  };
  chart: { today: HourlyPoint[]; yesterday: HourlyPoint[] };
  shifts?: {
    totalCost: number;
    activeNow: ShiftPerson[];
    scheduled: ShiftPerson[];
    worked: ShiftPerson[];
    scheduledCount: number;
  };
}) {
  const todaySold = perDay?.today?.sold ?? null;
  const ySold = perDay?.yesterday?.sold ?? null;
  const soldDelta = todaySold !== null && ySold !== null ? todaySold - ySold : null;

  const todayFinal = perDay?.today?.amounts?.final_amount ?? null;
  const yFinal = perDay?.yesterday?.amounts?.final_amount ?? null;
  const finalDelta = todayFinal !== null && yFinal !== null ? todayFinal - yFinal : null;

  const deltaClass = (d: number | null) => {
    if (d === null) return "text-slate-500 dark:text-slate-400";
    if (d > 0) return "text-emerald-700 dark:text-emerald-300";
    if (d < 0) return "text-rose-700 dark:text-rose-300";
    return "text-slate-500 dark:text-slate-400";
  };

  const fmtSigned = (d: number) => `${d > 0 ? "+" : ""}${formatNumber(d)}`;
  const fmtSignedMoney = (d: number) => `${d > 0 ? "+" : ""}${formatAUD(d)}`;

  const breakdown = categoriesSummary
    ? {
        L: categoriesSummary.cups.large.qty,
        R: categoriesSummary.cups.regular.qty,
        J: categoriesSummary.cups.jumbo.qty,
        S: categoriesSummary.softServe.qty,
        M: categoriesSummary.merchandise.qty
      }
    : null;

  const breakdownParts = breakdown
    ? ([
        ["L", breakdown.L],
        ["R", breakdown.R],
        ["J", breakdown.J],
        ["S", breakdown.S],
        ["M", breakdown.M]
      ] as const).filter(([, v]) => v !== 0)
    : [];

  const [open, setOpen] = useState<null | "products" | "sales">(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {store.logo ? (
            <Image src={store.logo} alt={store.name} width={40} height={40} />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{store.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{date}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-lg font-semibold">{formatAUD(summary.totalAmount)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Total sales</div>
        </div>
      </div>

      {perDay?.today ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOpen("products")}
            className="rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/60"
            aria-label="View products summary"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">Products</div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <div className="text-base font-semibold tabular-nums">{todaySold !== null ? formatNumber(todaySold) : "—"}</div>
              {soldDelta !== null ? (
                <div className={`text-xs font-semibold tabular-nums ${deltaClass(soldDelta)}`}>{fmtSigned(soldDelta)}</div>
              ) : null}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">vs yesterday</div>
            {breakdownParts.length ? (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {breakdownParts.map(([k, v]) => (
                  <span key={k} className="whitespace-nowrap">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{k}</span> {formatNumber(v)}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setOpen("sales")}
            className="rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/60"
            aria-label="View final sales summary"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">Final sales</div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <div className="text-base font-semibold tabular-nums">{todayFinal !== null ? formatAUD(todayFinal) : "—"}</div>
              {finalDelta !== null ? (
                <div className={`text-xs font-semibold tabular-nums ${deltaClass(finalDelta)}`}>{fmtSignedMoney(finalDelta)}</div>
              ) : null}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {typeof perDay.today.sales_count === "number" ? `${formatNumber(perDay.today.sales_count)} orders` : "Orders"}
              {typeof perDay.today.avg_per_sale === "number" ? ` • Avg ${formatAUD(perDay.today.avg_per_sale)}` : ""}
            </div>
            {typeof perDay.today.amounts?.discount === "number" ? (
              <div className="mt-0.5 text-[11px] tabular-nums text-rose-700 dark:text-rose-300">
                Discount {formatAUD(-Math.abs(perDay.today.amounts.discount))}
              </div>
            ) : null}
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        <HourlySalesChart today={chart.today} yesterday={chart.yesterday} />
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Hourly cups (today vs yesterday) + sales line
        </div>
      </div>

      {shifts ? (
        <StoreShiftsStrip
          companyId={store.id}
          date={date}
          totalCost={shifts.totalCost}
          activeNow={shifts.activeNow}
          scheduled={shifts.scheduled ?? []}
          worked={shifts.worked ?? []}
          scheduledCount={shifts.scheduledCount}
        />
      ) : null}

      {open ? (
        <SummaryModal
          open={open}
          onClose={() => setOpen(null)}
          storeName={store.name}
          date={date}
          perDay={perDay}
          perDayHistory={perDayHistory}
          categoriesDetails={categoriesDetails}
        />
      ) : null}
    </section>
  );
}

function SummaryModal({
  open,
  onClose,
  storeName,
  date,
  perDay,
  perDayHistory,
  categoriesDetails
}: {
  open: "products" | "sales";
  onClose: () => void;
  storeName: string;
  date: string;
  perDay?: { today: SalesPerDayRow; yesterday?: SalesPerDayRow | null };
  perDayHistory?: SalesPerDayRow[];
  categoriesDetails?: {
    date: string;
    totals: { total_qty?: number; total_price?: string | number } | null;
    rows: Array<{ category?: string; item_name?: string | null; total_qty?: number; total_price?: string | number; avg_price?: string | number }>;
  };
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(14);

  const toNum = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const allCategories = useMemo(() => {
    const rows = categoriesDetails?.rows ?? [];
    return [...rows]
      .filter((r) => (r.category ?? "").toString().trim())
      .sort((a, b) => Number(b.total_qty ?? 0) - Number(a.total_qty ?? 0) || String(a.category ?? "").localeCompare(String(b.category ?? "")));
  }, [categoriesDetails?.rows]);

  const categoryTotals = useMemo(() => {
    const rows = categoriesDetails?.rows ?? [];
    const map = new Map<string, { qty: number; amount: number }>();
    for (const r of rows) {
      const raw = typeof r.category === "string" ? r.category : "";
      const key = raw.trim();
      if (!key) continue;
      if (r.item_name) continue; // prefer aggregated rows
      map.set(key, { qty: Number(r.total_qty ?? 0), amount: toNum(r.total_price) });
    }
    return map;
  }, [categoriesDetails?.rows]);

  const cat = (name: string) => categoryTotals.get(name) ?? categoryTotals.get(`${name} `) ?? { qty: 0, amount: 0 };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title = open === "products" ? "Products summary" : "Final sales summary";

  const today = perDay?.today;
  const y = perDay?.yesterday ?? null;

  const row = (label: string, todayVal: React.ReactNode, yVal: React.ReactNode, deltaVal?: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-2 border-t border-slate-200 py-2 text-[11px] first:border-t-0 dark:border-slate-800 sm:gap-3 sm:text-sm">
      <div className="min-w-0 truncate text-slate-600 dark:text-slate-300">{label}</div>
      <div className="flex items-baseline gap-2 tabular-nums sm:gap-3">
        <div className="w-[70px] text-right font-semibold sm:w-[92px]">{todayVal}</div>
        <div className="w-[70px] text-right text-slate-500 dark:text-slate-400 sm:w-[92px]">{yVal}</div>
        {deltaVal !== undefined ? <div className="w-[70px] text-right font-semibold sm:w-[92px]">{deltaVal}</div> : null}
      </div>
    </div>
  );

  const signedMoney = (n: number) => `${n > 0 ? "+" : ""}${formatAUD(n)}`;
  const signedNum = (n: number) => `${n > 0 ? "+" : ""}${formatNumber(n)}`;
  const deltaTone = (n: number) => (n > 0 ? "text-emerald-700 dark:text-emerald-300" : n < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400");

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl outline-none dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {storeName} • {date}
            </div>
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

        {open === "products" ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold">All categories</div>
              {categoriesDetails?.totals ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatNumber(Number(categoriesDetails.totals.total_qty ?? 0))} • {formatAUD(toNum(categoriesDetails.totals.total_price))}
                </div>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {[
                { label: "Regular Cups", key: "Regular Drinks" },
                { label: "Large Cups", key: "Large Drinks" },
                { label: "Jumbo Cups", key: "Jumbo Drinks" },
                { label: "Toppings", key: "Toppings" },
                { label: "Soft Serve", key: "Soft Serve" },
                { label: "Merchandise", key: "Merchandise" }
              ].map((b) => {
                const v = cat(b.key);
                return (
                  <div key={b.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{b.label}</div>
                    <div className="mt-0.5 flex items-baseline justify-between gap-2">
                      <div className="text-sm font-semibold tabular-nums">{formatNumber(v.qty)}</div>
                      <div className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">{formatAUD(v.amount)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2">
              <table className="w-full table-fixed text-[11px] text-slate-700 dark:text-slate-200">
                <thead className="text-[10px] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="w-[46%] py-2 text-left font-medium">Category</th>
                    <th className="w-[14%] py-2 text-right font-medium">Qty</th>
                    <th className="w-[20%] py-2 text-right font-medium">Sales</th>
                    <th className="w-[20%] py-2 text-right font-medium">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategories.length ? (
                    allCategories.map((r, idx) => {
                      const cat = String(r.category ?? "").trim();
                      const item = r.item_name ? String(r.item_name) : "";
                      const qty = Number(r.total_qty ?? 0);
                      const price = toNum(r.total_price);
                      const avg = toNum(r.avg_price);
                      return (
                        <tr key={`${cat}:${item}:${idx}`} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="py-2 pr-2 align-top">
                            <div className="min-w-0 leading-snug">
                              <div className="break-words font-semibold">{cat || "—"}</div>
                              {item ? <div className="break-words text-[10px] text-slate-500 dark:text-slate-400">{item}</div> : null}
                            </div>
                          </td>
                          <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap align-top">{formatNumber(qty)}</td>
                          <td className="py-2 text-right tabular-nums whitespace-nowrap align-top">{formatAUD(price)}</td>
                          <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                            {formatAUD(avg)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-300" colSpan={4}>
                        No category data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="grid grid-cols-[1fr_70px_70px_70px] gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:grid-cols-[1fr_92px_92px_92px] sm:gap-3 sm:text-[11px]">
                <div>Metric</div>
                <div className="text-right">Today</div>
                <div className="text-right">Yesterday</div>
                <div className="text-right">Δ</div>
              </div>
              <div className="mt-2">
                {today ? (
                  <>
                    {(() => {
                      const tFinal = Number(today.amounts?.final_amount ?? 0);
                      const yFinal = y ? Number(y.amounts?.final_amount ?? 0) : 0;
                      const d = y ? tFinal - yFinal : 0;
                      return row(
                        "Final amount",
                        formatAUD(tFinal),
                        y ? formatAUD(yFinal) : "—",
                        y ? <span className={deltaTone(d)}>{signedMoney(d)}</span> : <span className="text-slate-500 dark:text-slate-400">—</span>
                      );
                    })()}
                    {(() => {
                      const tGross = Number(today.amounts?.gross ?? 0);
                      const yGross = y ? Number(y.amounts?.gross ?? 0) : 0;
                      const d = y ? tGross - yGross : 0;
                      return row(
                        "Gross",
                        formatAUD(tGross),
                        y ? formatAUD(yGross) : "—",
                        y ? <span className={deltaTone(d)}>{signedMoney(d)}</span> : <span className="text-slate-500 dark:text-slate-400">—</span>
                      );
                    })()}
                    {(() => {
                      const tDisc = Number(today.amounts?.discount ?? 0);
                      const yDisc = y ? Number(y.amounts?.discount ?? 0) : 0;
                      const d = y ? tDisc - yDisc : 0;
                      return row(
                        "Discount",
                        formatAUD(tDisc),
                        y ? formatAUD(yDisc) : "—",
                        y ? <span className={deltaTone(-d)}>{signedMoney(d)}</span> : <span className="text-slate-500 dark:text-slate-400">—</span>
                      );
                    })()}
                    {(() => {
                      const tOrders = typeof today.sales_count === "number" ? today.sales_count : 0;
                      const yOrders = y && typeof y.sales_count === "number" ? y.sales_count : 0;
                      const d = y ? tOrders - yOrders : 0;
                      return row(
                        "Orders",
                        formatNumber(tOrders),
                        y ? formatNumber(yOrders) : "—",
                        y ? <span className={deltaTone(d)}>{signedNum(d)}</span> : <span className="text-slate-500 dark:text-slate-400">—</span>
                      );
                    })()}
                    {(() => {
                      const tSold = typeof today.sold === "number" ? today.sold : 0;
                      const ySold = y && typeof y.sold === "number" ? y.sold : 0;
                      const d = y ? tSold - ySold : 0;
                      return row(
                        "Sold (cups)",
                        formatNumber(tSold),
                        y ? formatNumber(ySold) : "—",
                        y ? <span className={deltaTone(d)}>{signedNum(d)}</span> : <span className="text-slate-500 dark:text-slate-400">—</span>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-300">No daily sales data available.</div>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-semibold">Daily history</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{perDayHistory?.length ? `${perDayHistory.length} days` : ""}</div>
              </div>
              {(() => {
                const visible = (perDayHistory ?? []).slice(0, historyCount);
                const totals = visible.reduce<{ sold: number; orders: number; gross: number; disc: number; final: number }>(
                  (acc, d) => {
                    const sold = typeof d.sold === "number" ? d.sold : Number(d.sold ?? 0);
                    const orders = typeof d.sales_count === "number" ? d.sales_count : Number(d.sales_count ?? 0);
                    const gross = Number(d.amounts?.gross ?? 0);
                    const disc = Number(d.amounts?.discount ?? 0);
                    const final = Number(d.amounts?.final_amount ?? 0);
                    acc.sold += Number.isFinite(sold) ? sold : 0;
                    acc.orders += Number.isFinite(orders) ? orders : 0;
                    acc.gross += Number.isFinite(gross) ? gross : 0;
                    acc.disc += Number.isFinite(disc) ? disc : 0;
                    acc.final += Number.isFinite(final) ? final : 0;
                    return acc;
                  },
                  { sold: 0, orders: 0, gross: 0, disc: 0, final: 0 }
                );

                return (
                  <>
                    <div className="mt-2 space-y-2 sm:hidden">
                      {visible.map((d, idx) => {
                        const day = String(d.date ?? "").slice(0, 10) || "—";
                        const sold = typeof d.sold === "number" ? d.sold : Number(d.sold ?? 0);
                        const orders = typeof d.sales_count === "number" ? d.sales_count : Number(d.sales_count ?? 0);
                        const gross = Number(d.amounts?.gross ?? 0);
                        const disc = Number(d.amounts?.discount ?? 0);
                        const final = Number(d.amounts?.final_amount ?? 0);
                        return (
                          <div key={`${day}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="text-[11px] font-semibold">{day}</div>
                              <div className="text-[11px] font-semibold tabular-nums">{formatAUD(final)}</div>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                              <div className="flex items-baseline justify-between gap-2">
                                <span>Sold</span>
                                <span className="tabular-nums">{formatNumber(sold)}</span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <span>Orders</span>
                                <span className="tabular-nums">{formatNumber(orders)}</span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <span>Gross</span>
                                <span className="tabular-nums">{formatAUD(gross)}</span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <span>Disc</span>
                                <span className="tabular-nums">{formatAUD(disc)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Total</div>
                          <div className="text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatAUD(totals.final)}</div>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                          <div className="flex items-baseline justify-between gap-2">
                            <span>Sold</span>
                            <span className="tabular-nums">{formatNumber(totals.sold)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span>Orders</span>
                            <span className="tabular-nums">{formatNumber(totals.orders)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span>Gross</span>
                            <span className="tabular-nums">{formatAUD(totals.gross)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span>Disc</span>
                            <span className="tabular-nums">{formatAUD(totals.disc)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 hidden sm:block">
                      <table className="w-full table-fixed text-[11px] text-slate-700 dark:text-slate-200">
                        <thead className="text-[10px] text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="w-[16%] py-2 text-left font-medium">Date</th>
                            <th className="w-[10%] py-2 text-right font-medium">Sold</th>
                            <th className="w-[12%] py-2 text-right font-medium">Orders</th>
                            <th className="w-[22%] py-2 text-right font-medium">Gross</th>
                            <th className="w-[20%] py-2 text-right font-medium">Discount</th>
                            <th className="w-[20%] py-2 text-right font-medium">Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((d, idx) => {
                            const day = String(d.date ?? "").slice(0, 10) || "—";
                            const sold = typeof d.sold === "number" ? d.sold : Number(d.sold ?? 0);
                            const orders = typeof d.sales_count === "number" ? d.sales_count : Number(d.sales_count ?? 0);
                            const gross = Number(d.amounts?.gross ?? 0);
                            const disc = Number(d.amounts?.discount ?? 0);
                            const final = Number(d.amounts?.final_amount ?? 0);
                            return (
                              <tr key={`${day}-${idx}`} className="border-t border-slate-200 dark:border-slate-800">
                                <td className="py-2 pr-2 whitespace-nowrap font-medium">{day}</td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(sold)}</td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(orders)}</td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">{formatAUD(gross)}</td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">{formatAUD(disc)}</td>
                                <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatAUD(final)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 dark:border-slate-800">
                            <td className="py-2 pr-2 whitespace-nowrap font-semibold">Total</td>
                            <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatNumber(totals.sold)}</td>
                            <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatNumber(totals.orders)}</td>
                            <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatAUD(totals.gross)}</td>
                            <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatAUD(totals.disc)}</td>
                            <td className="py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatAUD(totals.final)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                );
              })()}
              {(perDayHistory?.length ?? 0) > historyCount ? (
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  onClick={() => setHistoryCount((c) => c + 14)}
                >
                  Show more
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
