"use client";

import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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
  company_name?: string;
  type: "cashin" | "cashup";
  by?: string | null;
  avatar?: string | null;
  photos: string[];
  cash?: { coins?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }>; bills?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }> } | null;
  cash_drop?: { coins?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }>; bills?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }> } | null;
  total?: number | null;
  actual?: number | null;
  system?: number | null;
  variance?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  id?: number | null;
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

export function CashupSalesMedia({ todayISO }: { todayISO: string }) {
  const [date, setDate] = useState<string>(todayISO);
  const [selected, setSelected] = useState<{ storeName: string; entry: CashupEntry; label: string } | null>(null);
  const key = ["cashup-salesmedia", date] as const;

  const { data, error, isLoading } = useSWR<SalesMediaResponse>(key, async () => {
    const url = new URL("/api/cashup/salesmedia", window.location.origin);
    url.searchParams.set("date_from", date);
    url.searchParams.set("date_to", date);
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
    ["cashup-entries", date],
    async () => {
      const url = new URL("/api/cashup/entries", window.location.origin);
      url.searchParams.set("date", date);
      const res = await fetch(url.toString());
      const json = (await res.json()) as CashupEntriesResponse;
      if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  if (isLoading && entriesLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>
    );
  }

  if (error && entriesError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load cashup: {(error as any)?.message ?? "Unknown error"}
      </div>
    );
  }

  const salesStores = data?.stores ?? [];
  const entriesByCompany = entries?.entriesByCompany ?? {};
  const mergedIds = Array.from(
    new Set<number>([
      ...salesStores.map((s) => s.company_id),
      ...Object.keys(entriesByCompany)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
    ])
  );

  const assignedCompanyCount = Math.max(data?.assignedCompanyCount ?? 0, entries?.assignedCompanyCount ?? 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          type="date"
          className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 text-sm dark:border-slate-800"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </section>

      {error && !salesStores.length ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          Payment totals failed to load: {(error as any)?.message ?? "Unknown error"}
        </div>
      ) : null}

      {entriesError && !Object.keys(entriesByCompany).length ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          CashIn/CashUp failed to load: {(entriesError as any)?.message ?? "Unknown error"}
        </div>
      ) : null}

      {!assignedCompanyCount ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          You haven&apos;t been assigned to a company yet. Please contact an administrator.
        </div>
      ) : !mergedIds.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No cashup data found for {date}.
        </div>
      ) : (
        <>
          {data?.stores?.length ? (
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
          ) : null}

          {mergedIds.map((companyId) => {
            const store = salesStores.find((s) => s.company_id === companyId);
            const entryBlock = entriesByCompany[String(companyId)];
            const name =
              store?.name ||
              entryBlock?.cashin?.company_name ||
              entryBlock?.cashup?.company_name ||
              `Company ${companyId}`;

            return (
              <section key={companyId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{date}</div>
                  </div>
                  {store ? (
                    <div className="text-right">
                      <div className="text-sm font-semibold">{money(store.totalAmount)}</div>
                      {(store.refunds ?? 0) ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Refunds {money(-Math.abs(store.refunds ?? 0))}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <CashupEntryWidget
                  entry={entryBlock}
                  loading={entriesLoading}
                  errorMessage={entriesError instanceof Error ? entriesError.message : undefined}
                  onSelect={(label, e) => setSelected({ storeName: name, entry: e, label })}
                />

                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  {store?.rows?.length ? (
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
                          const labelOut =
                            r.countValue && r.countValue > 0 && !isTotal && !isDiscount && !isRefund
                              ? `${r.method} (${r.countValue} txns)`
                              : r.method;
                          return (
                            <tr
                              key={`${companyId}-${r.method}`}
                              className={[
                                "border-t border-slate-200 dark:border-slate-800",
                                isTotal ? "bg-slate-50 font-semibold dark:bg-slate-950/50" : "",
                                isDiscount ? "text-rose-700 dark:text-rose-300" : ""
                              ].join(" ")}
                            >
                              <td className="px-3 py-2">{labelOut}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{money(r.amountValue)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 dark:text-slate-400">No payment totals found for this date.</div>
                  )}
                </div>
              </section>
            );
          })}
        </>
      )}

      {selected ? <CashupEntryModal storeName={selected.storeName} label={selected.label} entry={selected.entry} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function CashupEntryWidget({
  entry,
  loading,
  errorMessage,
  onSelect
}: {
  entry?: { cashin?: CashupEntry; cashup?: CashupEntry };
  loading?: boolean;
  errorMessage?: string;
  onSelect?: (label: "CashIn" | "CashUp", entry: CashupEntry) => void;
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

  const rows: Array<{ label: "CashIn" | "CashUp"; e: CashupEntry }> = [];
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
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="scroll-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th className="text-right">Total</th>
            <th className="text-right">Actual</th>
            <th className="text-right">System</th>
            <th className="text-right">+/-</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, e }) => {
            const variance = formatVariance(e.variance);
            const cashDropPhoto = e.photos?.[0];
            return (
              <tr
                key={label}
                className={[
                  "align-middle",
                  onSelect ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40" : ""
                ].join(" ")}
                onClick={() => (onSelect ? onSelect(label, e) : undefined)}
              >
                <td>
                  <div className="h-11 w-11 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
                    {cashDropPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cashDropPhoto} alt={`${label} photo`} className="h-11 w-11 object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        —
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-right tabular-nums">{format(e.total)}</td>
                <td className="text-right tabular-nums">{format(e.actual)}</td>
                <td className="text-right tabular-nums">{format(e.system)}</td>
                <td className={`text-right tabular-nums font-semibold ${variance.cls}`}>{variance.text}</td>
                <td>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                      {e.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.avatar} alt={e.by ?? "Staff"} className="h-9 w-9 object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{e.by ?? "—"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CashupEntryModal({
  storeName,
  label,
  entry,
  onClose
}: {
  storeName: string;
  label: string;
  entry: CashupEntry;
  onClose: () => void;
}) {
  const photo = entry.photos?.[0];
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  const format = (n?: number | null) => (n === null || n === undefined ? "—" : money(n));
  const varianceCls =
    entry.variance === null || entry.variance === undefined
      ? "text-slate-600 dark:text-slate-300"
      : entry.variance > 0
        ? "text-emerald-700 dark:text-emerald-300"
        : entry.variance < 0
          ? "text-rose-700 dark:text-rose-300"
          : "text-slate-600 dark:text-slate-300";

  const title = `${storeName} • ${label}`;
  const hasCashDrop = hasAnyBreakdownRows(entry.cash_drop);

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
              {entry.by ?? "—"}
              {entry.created_at ? ` • ${entry.created_at}` : ""}
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

        {photo ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${label} photo`} className="h-56 w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Metric label="Total" value={format(entry.total)} />
          <Metric label="Actual" value={format(entry.actual)} />
          <Metric label="System" value={format(entry.system)} />
          <Metric label="+/-" valueClass={varianceCls} value={format(entry.variance)} />
        </div>

        <div className="mt-4 space-y-3">
          <Breakdown title="Bills" rows={entry.cash?.bills} showRolls={false} />
          <Breakdown title="Coins" rows={entry.cash?.coins} showRolls />

          {hasCashDrop ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cash Drop</div>
              <div className="mt-3 space-y-3">
                <Breakdown title="Bills" rows={entry.cash_drop?.bills} showRolls={false} compact />
                <Breakdown title="Coins" rows={entry.cash_drop?.coins} showRolls compact />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${valueClass ?? ""}`.trim()}>{value}</div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  showRolls,
  compact
}: {
  title: string;
  rows?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }> | null;
  showRolls: boolean;
  compact?: boolean;
}) {
  const entries = Object.entries(rows ?? {}).filter(([, v]) => (v?.quantity ?? 0) || (v?.total ?? 0) || (v?.rolls ?? 0));
  if (!entries.length) return null;
  entries.sort((a, b) => Number(a[0]) - Number(b[0]));

  const pad = compact ? "px-2 py-1.5" : "px-3 py-2";
  const text = compact ? "text-xs" : "text-sm";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">{title}</div>
      <table className={`w-full ${text}`}>
        <thead className="bg-white text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr className="border-t border-slate-200 dark:border-slate-800">
            <th className={`${pad} text-left font-medium`}>Denom</th>
            <th className={`${pad} text-right font-medium`}>Qty</th>
            {showRolls ? <th className={`${pad} text-right font-medium`}>Rolls</th> : null}
            <th className={`${pad} text-right font-medium`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([denom, v]) => (
            <tr key={denom} className="border-t border-slate-200 dark:border-slate-800">
              <td className={`${pad} font-semibold`}>{denom}</td>
              <td className={`${pad} text-right tabular-nums`}>{v.quantity ?? 0}</td>
              {showRolls ? <td className={`${pad} text-right tabular-nums`}>{v.rolls ?? 0}</td> : null}
              <td className={`${pad} text-right tabular-nums`}>{money(v.total ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasAnyBreakdownRows(breakdown?: { coins?: Record<string, any>; bills?: Record<string, any> } | null) {
  if (!breakdown) return false;
  const has = (rows?: Record<string, { quantity?: number | null; total?: number | null; rolls?: number | null }>) =>
    Object.values(rows ?? {}).some((v) => (v?.quantity ?? 0) || (v?.total ?? 0) || (v?.rolls ?? 0));
  return has(breakdown.bills as any) || has(breakdown.coins as any);
}
