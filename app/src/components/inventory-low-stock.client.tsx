"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

type LowStockItem = any;

type LowStockResponse = {
  success: boolean;
  assignedCompanyCount?: number;
  companies?: Array<{ id: number; name: string }>;
  company_id?: number | null;
  data?: LowStockItem[];
  error?: string;
};

function fmtDateLabel(dateISO?: string) {
  if (!dateISO) return "—";
  const dt = new Date(dateISO);
  if (!Number.isFinite(dt.getTime())) return String(dateISO);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(dt);
}

export function InventoryLowStock({ todayISO }: { todayISO: string }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>("");

  const key = ["inv-low-stock", companyId || "auto"] as const;
  const { data, error, isLoading } = useSWR<LowStockResponse>(key, async () => {
    const url = new URL("/api/inventory/low-stock", window.location.origin);
    if (companyId) url.searchParams.set("company_id", companyId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as LowStockResponse;
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
        Failed to load low stock: {error.message}
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
        <div className="text-sm font-semibold">Company</div>
        <select className="mt-3 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {companies.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Date: {todayISO}</div>
      </section>

      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">No low stock items found.</div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-center">Store</th>
                <th className="text-center">Total</th>
                <th className="text-center">Pending</th>
                <th className="hidden whitespace-nowrap px-3 py-2 text-left font-medium sm:table-cell">Expiry</th>
                <th className="hidden whitespace-nowrap px-3 py-2 text-left font-medium sm:table-cell">Validated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const storeStock = Number(item.store_stock ?? 0);
                const qty = Number(item.qty ?? 0);
                const pending = Number(item.pending ?? 0);
                const validatedBy = item.validated_by;
                const validatedAt = item.validated_at;
                const invId = item.reference_id ?? item.inventory_id ?? item.id ?? null;
                const href = invId ? `/inventory/items/${invId}` : "";
                return (
                  <tr
                    key={String(item.id ?? `${item.name}-${item.expiry}`)}
                    className={`${href ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40" : ""}`}
                    onClick={() => (href ? router.push(href) : null)}
                  >
                    <td>
                      <div className="min-w-0">
                        <div className="max-w-[220px] truncate font-semibold text-slate-900 dark:text-white">{item.name ?? "Item"}</div>
                        {item.category ? <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.category}</div> : null}
                        <div className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300 sm:hidden">
                          {item.expiry ? <div className="truncate">Expiry: {fmtDateLabel(item.expiry)}</div> : null}
                          {validatedBy ? (
                            <div className="truncate">
                              Validated: {String(validatedBy)}
                              {validatedAt ? ` • ${String(validatedAt).slice(0, 16).replace("T", " ")}` : ""}
                            </div>
                          ) : (
                            <div className="truncate text-rose-700 dark:text-rose-300">Not validated</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`text-center font-semibold ${storeStock ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>{storeStock || 0}</td>
                    <td className="text-center font-semibold text-emerald-700 dark:text-emerald-300">{qty || 0}</td>
                    <td className="text-center font-semibold text-amber-700 dark:text-amber-300">{pending || 0}</td>
                    <td className="hidden sm:table-cell">{item.expiry ? fmtDateLabel(item.expiry) : "—"}</td>
                    <td className="hidden sm:table-cell">
                      {validatedBy ? (
                        <div>
                          <div className="font-semibold">{String(validatedBy)}</div>
                          {validatedAt ? <div className="text-xs text-slate-500 dark:text-slate-400">{String(validatedAt).slice(0, 16).replace("T", " ")}</div> : null}
                        </div>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-300">Not validated</span>
                      )}
                    </td>
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
