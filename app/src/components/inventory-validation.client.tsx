"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

type ValidationRow = {
  id: number | null;
  name: string;
  name_sub?: string;
  image?: string;
  stock_qty: number;
  validation_days: number;
  last_validated_at: string | null;
  validated_by: string | null;
  required: boolean;
};

type ValidationResponse = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  company_id?: number | null;
  date?: string | null;
  data?: ValidationRow[];
  error?: string;
};

function fmtWhen(iso: string | null) {
  if (!iso) return "N/A";
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return String(iso);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(dt);
}

export function InventoryValidation({ todayISO }: { todayISO: string }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO);

  const key = ["inv-validation", companyId || "auto", date] as const;
  const { data, error, isLoading } = useSWR<ValidationResponse>(key, async () => {
    const url = new URL("/api/inventory/validation", window.location.origin);
    if (companyId) url.searchParams.set("company_id", companyId);
    url.searchParams.set("date", date);
    url.searchParams.set("limit", "0");
    const res = await fetch(url.toString());
    const json = (await res.json()) as ValidationResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  useEffect(() => {
    if (!companyId && data?.company_id) setCompanyId(String(data.company_id));
  }, [companyId, data?.company_id]);

  const assignedCompanyCount = data?.assignedCompanyCount ?? 0;
  const companies = useMemo(() => [...(data?.companies ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data?.companies]);
  const rows = data?.data ?? [];

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
        Failed to load validation: {error.message}
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="date" className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Shows items that require validation.</div>
      </section>

      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No inventory items require validation at this time.
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Days</th>
                <th className="hidden whitespace-nowrap px-3 py-2 text-left font-medium sm:table-cell">Last</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = r.id ? `/inventory/items/${r.id}` : "";
                return (
                  <tr
                    key={String(r.id ?? r.name)}
                    className={`${href ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40" : ""}`}
                    onClick={() => (href ? router.push(href) : null)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        {r.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                        )}
                        <div className="min-w-0">
                          <div className="max-w-[220px] truncate font-semibold text-slate-900 dark:text-white">{r.name}</div>
                          {r.name_sub ? <div className="truncate text-xs text-slate-500 dark:text-slate-400">{r.name_sub}</div> : null}
                          <div className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300 sm:hidden">
                            <div className="truncate">Last: {fmtWhen(r.last_validated_at)}</div>
                            <div className="truncate">By: {r.validated_by ?? "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                    {r.required ? (
                      <span className="inline-flex rounded-full bg-rose-600/10 px-2 py-1 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                        Required
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-600/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Validated
                      </span>
                    )}
                  </td>
                    <td className="text-center tabular-nums">{r.stock_qty}</td>
                    <td className="text-center tabular-nums">{r.validation_days}</td>
                    <td className="hidden sm:table-cell">{fmtWhen(r.last_validated_at)}</td>
                    <td className="hidden sm:table-cell">{r.validated_by ?? "N/A"}</td>
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
