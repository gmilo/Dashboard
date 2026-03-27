"use client";

import useSWR from "swr";

type SalesMediaRow = {
  method: string;
  amount: string;
  count: string;
  amountValue: number;
  countValue: number;
};

type SalesMediaStore = {
  name: string;
  rows: SalesMediaRow[];
  totalAmount: number;
  totalCount: number;
};

type SalesMediaResponse = {
  success: boolean;
  date: string;
  assignedCompanyCount?: number;
  stores: SalesMediaStore[];
  error?: string;
};

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export function CashupSalesMedia({ dateTo }: { dateTo: string }) {
  const key = ["cashup-salesmedia", dateTo] as const;

  const { data, error, isLoading } = useSWR<SalesMediaResponse>(key, async () => {
    const url = new URL("/api/cashup/salesmedia", window.location.origin);
    url.searchParams.set("date_to", dateTo);
    const res = await fetch(url.toString());
    const json = (await res.json()) as SalesMediaResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
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

  if (!data?.stores?.length) {
    if ((data?.assignedCompanyCount ?? 0) > 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No cashup data found for {dateTo}.
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        You haven&apos;t been assigned to a company yet. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.stores.map((store) => (
        <section key={store.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{store.name}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dateTo}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{money(store.totalAmount)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{store.totalCount} txns</div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Method</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-right font-medium">Txns</th>
                </tr>
              </thead>
              <tbody>
                {store.rows.map((r) => {
                  const isTotal = r.method.trim().toLowerCase() === "total";
                  return (
                    <tr
                      key={`${store.name}-${r.method}`}
                      className={[
                        "border-t border-slate-200 dark:border-slate-800",
                        isTotal ? "bg-slate-50 font-semibold dark:bg-slate-950/50" : ""
                      ].join(" ")}
                    >
                      <td className="px-3 py-2">{r.method}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.amount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
