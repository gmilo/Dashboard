"use client";

import useSWR from "swr";
import { useState } from "react";

type SalesMediaRow = {
  method: string;
  amountValue: number;
  countValue?: number;
};

type SalesMediaStore = {
  company_id: number;
  name: string;
  rows: SalesMediaRow[];
  gross: number;
  refunds?: number;
  discount: number;
  totalAmount: number;
  totalCount: number;
};

type SalesMediaResponse = {
  success: boolean;
  date_from: string;
  date_to: string;
  assignedCompanyCount?: number;
  totals?: { gross: number; refunds: number; discount: number; final: number };
  stores: SalesMediaStore[];
  error?: string;
};

type CashupEntry = {
  company_id: number;
  type: "cashin" | "cashup";
  by?: string | null;
  avatar?: string | null;
  photos: string[];
  total?: number | null;
  actual?: number | null;
  system?: number | null;
  variance?: number | null;
};

type CashupEntriesResponse = {
  success: boolean;
  date: string;
  assignedCompanyCount?: number;
  entriesByCompany: Record<string, { cashin?: CashupEntry; cashup?: CashupEntry }>;
  error?: string;
};

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export function CashupSalesMedia({ initialDateTo }: { initialDateTo: string }) {
  const [dateTo, setDateTo] = useState<string>(initialDateTo);
  const key = ["cashup-salesmedia", dateTo] as const;

  const { data, error, isLoading } = useSWR<SalesMediaResponse>(key, async () => {
    const url = new URL("/api/cashup/salesmedia", window.location.origin);
    url.searchParams.set("date_to", dateTo);
    const res = await fetch(url.toString());
    const json = (await res.json()) as SalesMediaResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const {
    data: entries,
    error: entriesError,
    isLoading: entriesLoading
  } = useSWR<CashupEntriesResponse>(
    ["cashup-entries", dateTo],
    async () => {
      const url = new URL("/api/cashup/entries", window.location.origin);
      url.searchParams.set("date", dateTo);
      const res = await fetch(url.toString());
      const json = (await res.json()) as CashupEntriesResponse;
      if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load cashup: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-end justify-between gap-3">
          <div className="text-sm font-semibold">Date</div>
          <input
            type="date"
            className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </section>

      {!data?.stores?.length ? (
        (data?.assignedCompanyCount ?? 0) > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
            No cashup data found for {dateTo}.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
            You haven&apos;t been assigned to a company yet. Please contact an administrator.
          </div>
        )
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">All stores</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-sm font-semibold">Total</div>
              <div className="text-right">
                <div className="text-sm font-semibold">{money(data?.totals?.final ?? 0)}</div>
                {(data?.totals?.refunds ?? 0) ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">Refunds {money(-Math.abs(data?.totals?.refunds ?? 0))}</div>
                ) : null}
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Discount {money(-Math.abs(data?.totals?.discount ?? 0))}
                </div>
              </div>
            </div>
          </section>

          {data.stores.map((store) => (
            <section key={store.company_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{store.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dateTo}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{money(store.totalAmount)}</div>
                  {(store.refunds ?? 0) ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">Refunds {money(-Math.abs(store.refunds ?? 0))}</div>
                  ) : null}
                  <div className="text-xs text-slate-500 dark:text-slate-400">Discount {money(-Math.abs(store.discount ?? 0))}</div>
                </div>
              </div>

              <CashupEntryWidget
                entry={entries?.entriesByCompany?.[String(store.company_id)]}
                loading={entriesLoading}
                errorMessage={entriesError instanceof Error ? entriesError.message : undefined}
              />

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Method</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.rows.map((r) => {
                      const isTotal = r.method.trim().toLowerCase() === "total";
                      const isDiscount = r.method.trim().toLowerCase() === "discount";
                      const isRefund = r.method.trim().toLowerCase() === "refunds";
                      const label =
                        r.countValue && r.countValue > 0 && !isTotal && !isDiscount && !isRefund
                          ? `${r.method} (${r.countValue} txns)`
                          : r.method;
                      return (
                        <tr
                          key={`${store.company_id}-${r.method}`}
                          className={[
                            "border-t border-slate-200 dark:border-slate-800",
                            isTotal ? "bg-slate-50 font-semibold dark:bg-slate-950/50" : "",
                            isDiscount ? "text-rose-700 dark:text-rose-300" : ""
                          ].join(" ")}
                        >
                          <td className="px-3 py-2">{label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{money(r.amountValue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function CashupEntryWidget({
  entry,
  loading,
  errorMessage
}: {
  entry?: { cashin?: CashupEntry; cashup?: CashupEntry };
  loading?: boolean;
  errorMessage?: string;
}) {
  const cashin = entry?.cashin;
  const cashup = entry?.cashup;

  if (loading) {
    return <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">Loading CashIn/CashUp…</div>;
  }

  if (errorMessage) {
    return (
      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        CashIn/CashUp failed to load: {errorMessage}
      </div>
    );
  }

  if (!cashin && !cashup) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        No CashIn/CashUp recorded for this date.
      </div>
    );
  }

  const rows: Array<{ label: string; e: CashupEntry }> = [];
  if (cashin) rows.push({ label: "CashIn", e: cashin });
  if (cashup) rows.push({ label: "CashUp", e: cashup });

  const format = (n?: number | null) => (n === null || n === undefined ? "—" : money(n));
  const formatVariance = (n?: number | null) => {
    if (n === null || n === undefined) return { text: "—", cls: "text-slate-600 dark:text-slate-300" };
    const isPos = n > 0;
    const isNeg = n < 0;
    return {
      text: money(n),
      cls: isPos ? "text-emerald-700 dark:text-emerald-300" : isNeg ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"
    };
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-[1fr_92px_92px_92px_92px] gap-0 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
        <div>Name</div>
        <div className="text-right">Total</div>
        <div className="text-right">Actual</div>
        <div className="text-right">System</div>
        <div className="text-right">+/-</div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map(({ label, e }) => {
          const variance = formatVariance(e.variance);
          const photo = e.photos?.[0];
          return (
            <div key={label} className="grid grid-cols-[1fr_92px_92px_92px_92px] items-center gap-0 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={label} className="h-10 w-10 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {label}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{e.by ?? "—"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                </div>
              </div>
              <div className="text-right tabular-nums">{format(e.total)}</div>
              <div className="text-right tabular-nums">{format(e.actual)}</div>
              <div className="text-right tabular-nums">{format(e.system)}</div>
              <div className={`text-right tabular-nums font-semibold ${variance.cls}`}>{variance.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
