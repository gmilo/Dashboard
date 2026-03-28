"use client";

import Link from "next/link";
import useSWR from "swr";
import { TransactionsReport } from "@/components/transactions-report.client";
import { getGravatarUrl } from "@/lib/gravatar";
import { MemberFavourites } from "@/components/member-favourites.client";

type MemberRow = Record<string, unknown> & {
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

type MemberResponse = {
  success: boolean;
  data?: MemberRow | null;
  error?: string;
};

function fullName(m: MemberRow) {
  return [typeof m.given_names === "string" ? m.given_names : "", typeof m.surname === "string" ? m.surname : ""].join(" ").trim();
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

export function MemberDetail({ memberId, todayISO }: { memberId: string; todayISO: string }) {
  const key = ["member", memberId] as const;
  const { data, error, isLoading } = useSWR<MemberResponse>(key, async () => {
    const url = new URL("/api/members", window.location.origin);
    url.searchParams.set("id", memberId);
    const res = await fetch(url.toString());
    const json = (await res.json()) as MemberResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
    return json;
  });

  const m = data?.data ?? null;
  const name = m ? fullName(m) : "";
  const memberNo = m && (typeof m.member_no === "string" || typeof m.member_no === "number") ? String(m.member_no) : "";
  const email = m?.email ?? "";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/members" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          ← Back
        </Link>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          Failed to load member: {error.message}
        </div>
      ) : m ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getGravatarUrl(email, 96)} alt={name || email || "Member"} className="h-12 w-12 object-cover" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name || m.email || "Member"}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {m.company_name ? m.company_name : m.company_id ? `Company ${String(m.company_id)}` : null}
                {memberNo ? <span className="ml-2">#{memberNo}</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Last txn</div>
              <div className="mt-0.5 text-sm font-semibold">{fmtDate(m.last_txn_datetime)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Orders</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">{toNumber(m.sales_count) || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total spend</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">{moneyAUD(m.total_spend)}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Email</div>
              <div className="truncate">{(m.email as string) || "—"}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mobile</div>
              <div className="whitespace-nowrap">{(m.mobile as string) || "—"}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Last sale</div>
              <div className="whitespace-nowrap tabular-nums">{moneyAUD(m.last_gross_sales)}</div>
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">Member not found.</div>
      )}

      <section className="space-y-2">
        <MemberFavourites memberId={memberId} todayISO={todayISO} />
      </section>

      <section className="space-y-2">
        <div className="text-sm font-semibold">Transactions</div>
        <TransactionsReport todayISO={todayISO} memberId={memberId} />
      </section>
    </div>
  );
}
