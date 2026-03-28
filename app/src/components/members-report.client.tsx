"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getGravatarUrl } from "@/lib/gravatar";

type Company = { id: number; name: string };

type MemberRow = {
  id?: number | string;
  company_id?: number | string;
  company_name?: string;
  member_no?: string | number;
  given_names?: string;
  surname?: string;
  email?: string;
  mobile?: string;
  last_txn_datetime?: string;
  last_gross_sales?: string | number;
  sales_count?: number | string;
  total_spend?: string | number;
};

type MembersResponse = {
  success: boolean;
  data?: MemberRow[] | Record<string, unknown> | null;
  error?: string;
};

function fullName(m: MemberRow) {
  return [m.given_names ?? "", m.surname ?? ""].join(" ").trim();
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function moneyAUD(value: unknown) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(toNumber(value));
}

function fmtDate(value?: string) {
  if (!value) return "—";
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(dt);
}

export function MembersReport({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const sortedCompanies = useMemo(() => [...companies].sort((a, b) => a.name.localeCompare(b.name)), [companies]);
  const [companyId, setCompanyId] = useState<string>(sortedCompanies[0] ? String(sortedCompanies[0].id) : "");

  const key = ["members", companyId] as const;
  const { data, error, isLoading } = useSWR<MembersResponse>(key, async () => {
    const url = new URL("/api/members", window.location.origin);
    if (companyId) url.searchParams.set("company_id", companyId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as MembersResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const rows = Array.isArray(data?.data) ? (data?.data as MemberRow[]) : [];
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
        Failed to load members: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Filters</div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Company</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">All companies</option>
            {sortedCompanies.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {rows.length ? (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="scroll-table">
            <thead>
              <tr>
                <th>Member</th>
                {showCompanyColumn ? <th>Company</th> : null}
                <th>Last txn</th>
                <th className="text-right">Last sale</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Total spend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const id = m.id ?? "";
                const href = id ? `/members/${String(id)}` : "";
                const name = fullName(m) || (m.email ?? "") || "Member";
                const memberNo =
                  typeof m.member_no === "string" || typeof m.member_no === "number" ? String(m.member_no) : "";
                const email = m.email ?? "";
                const lastTxn = fmtDate(m.last_txn_datetime);
                const lastSale = moneyAUD(m.last_gross_sales);
                const orders = toNumber(m.sales_count);
                const totalSpend = moneyAUD(m.total_spend);
                return (
                  <tr
                    key={`${m.company_id ?? ""}:${String(id)}`}
                    className={href ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40" : ""}
                    onClick={() => (href ? router.push(href) : null)}
                  >
                    <td>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getGravatarUrl(email, 40)} alt={name} className="h-8 w-8 object-cover" />
                        </div>
                        <div className="min-w-0 max-w-[180px]">
                          <div className="truncate font-medium">{name}</div>
                          {memberNo ? <div className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">#{memberNo}</div> : null}
                        </div>
                      </div>
                    </td>
                    {showCompanyColumn ? (
                      <td>
                        <div className="truncate">{m.company_name ?? `Company ${String(m.company_id ?? "")}`}</div>
                      </td>
                    ) : null}
                    <td>
                      <div className="whitespace-nowrap">{lastTxn}</div>
                    </td>
                    <td className="text-right tabular-nums">{lastSale}</td>
                    <td className="text-right tabular-nums">{orders || "—"}</td>
                    <td className="text-right tabular-nums">{totalSpend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">No members found.</div>
      )}
    </div>
  );
}
