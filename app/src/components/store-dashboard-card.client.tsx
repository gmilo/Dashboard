"use client";

import useSWR from "swr";
import { StoreHourlyCard } from "@/components/store-hourly-card";
import type { Store } from "@/lib/stores";
import { addDaysISO } from "@/lib/dates";

type SalesPerHourDay = {
  count: number;
  orders: number;
  total_amount: string;
  data: Array<[string, number, number, number, number]>;
};

type SalesPerHourResponse = {
  success: boolean;
  data: Record<string, SalesPerHourDay>;
  error?: string;
};

type SalesPerDayRow = {
  company?: string;
  company_id?: number;
  date?: string;
  sold?: number;
  sales_count?: number;
  last_sale_at?: string;
  avg_per_sale?: number;
  amounts?: {
    gross?: number;
    discount?: number;
    system?: number;
    amount?: number;
    final_amount?: number;
  };
};

type SalesPerDayResponse = {
  success: boolean;
  data: Record<string, SalesPerDayRow>;
  error?: string;
};

type CategoriesRow = {
  category?: string;
  item_name?: string | null;
  company_id?: number;
  company?: string;
  total_qty?: number;
  total_price?: string | number;
  avg_price?: string | number;
};

type CategoriesResponse = {
  success: boolean;
  date?: string;
  data?: CategoriesRow[];
  totals?: { total_qty?: number; total_price?: string | number };
  error?: string;
};

type ShiftsResponse = {
  success: boolean;
  total_cost: number;
  all_shifts: Array<{
    type: "active" | "scheduled";
    employee_id: number;
    name: string;
    avatar?: string | null;
    total_cost?: number | string | null;
    shifts: Array<{
      time_start?: string;
      time_end?: string;
      image_start?: string;
      image_end?: string;
      breaks?: Array<{ time_start?: string; time_end?: string }>;
    }>;
    scheduled?: Array<{
      time_start?: string;
      time_end?: string;
    }>;
  }>;
  error?: string;
};

async function readJsonOrThrow<T>(res: Response, label: string): Promise<T> {
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`${label} request failed (${res.status})${text ? ` — ${text.slice(0, 180)}` : ""}`);
  }

  if (!text.trim()) {
    throw new Error(`${label} returned an empty response`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label} returned invalid JSON${text ? ` — ${text.slice(0, 180)}` : ""}`);
  }
}

function buildSalesUrl(companyId: number, date: string) {
  const url = new URL("/api/data/sales-perhour.php", window.location.origin);
  url.searchParams.set("company_id", String(companyId));
  url.searchParams.set("date", date);
  return url.toString();
}

function buildSalesPerDayUrl(companyId: number) {
  const url = new URL("/api/data/sales-perday.php", window.location.origin);
  url.searchParams.set("company_id", String(companyId));
  return url.toString();
}

function buildCategoriesUrl(companyId: number, date: string) {
  const url = new URL("/api/data/categories.php", window.location.origin);
  url.searchParams.set("company_id", String(companyId));
  url.searchParams.set("date", date);
  return url.toString();
}

function buildShiftsUrl(companyId: number, date: string) {
  const url = new URL("/api/ajax/shifts.php", window.location.origin);
  url.searchParams.set("action", "get_shifts");
  url.searchParams.set("company_id", String(companyId));
  url.searchParams.set("date_from", date);
  url.searchParams.set("date_to", date);
  return url.toString();
}

export function StoreDashboardCard({ store, date }: { store: Store; date: string }) {
  const salesKey = ["sales-perhour", store.id, date] as const;
  const perDayKey = ["sales-perday", store.id] as const;
  const categoriesKey = ["categories", store.id, date] as const;
  const shiftsKey = ["shifts", store.id, date] as const;

  const { data: sales, error: salesError, isLoading: salesLoading } = useSWR<SalesPerHourResponse>(
    salesKey,
    async () => {
      const res = await fetch(buildSalesUrl(store.id, date));
      const json = await readJsonOrThrow<SalesPerHourResponse>(res, "Sales");
      if (!res.ok || !json.success) throw new Error(json.error ?? "Sales load failed");
      return json;
    }
  );

  const { data: perDay, error: perDayError, isLoading: perDayLoading } = useSWR<SalesPerDayResponse>(
    perDayKey,
    async () => {
      const res = await fetch(buildSalesPerDayUrl(store.id));
      const json = await readJsonOrThrow<SalesPerDayResponse>(res, "Sales per day");
      if (!res.ok || !json.success) throw new Error(json.error ?? "Sales-per-day load failed");
      return json;
    },
    {
      // This endpoint is a rolling history; keep it stable and avoid re-fetching on focus.
      revalidateOnFocus: false
    }
  );

  const { data: categories, error: categoriesError, isLoading: categoriesLoading } = useSWR<CategoriesResponse>(
    categoriesKey,
    async () => {
      const res = await fetch(buildCategoriesUrl(store.id, date));
      const json = await readJsonOrThrow<CategoriesResponse>(res, "Categories");
      if (!res.ok || !json.success) throw new Error(json.error ?? "Categories load failed");
      return json;
    },
    {
      revalidateOnFocus: false
    }
  );

  const { data: shifts, error: shiftsError, isLoading: shiftsLoading } = useSWR<ShiftsResponse>(
    shiftsKey,
    async () => {
      const res = await fetch(buildShiftsUrl(store.id, date));
      const json = await readJsonOrThrow<ShiftsResponse>(res, "Shifts");
      if (!res.ok || !json.success) throw new Error(json.error ?? "Shifts load failed");
      return json;
    }
  );

  const formatErr = (err: unknown) => {
    const msg = (err as any)?.message ? String((err as any).message) : "Unknown error";
    if (msg.toLowerCase().includes("unauthorized")) return "Unauthorized (please sign in again)";
    if (msg.toLowerCase().includes("forbidden")) return "Forbidden (no access)";
    if (msg.toLowerCase().includes("empty response")) return "Server returned an empty response";
    if (msg.toLowerCase().includes("invalid json")) return "Server returned an invalid response";
    return msg;
  };

  if (salesError || shiftsError || perDayError || categoriesError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        <div className="font-semibold">{store.name}</div>
        <div className="mt-1 text-xs opacity-80">
          Failed to load: {formatErr(salesError ?? shiftsError ?? perDayError ?? categoriesError)}
        </div>
      </section>
    );
  }

  if (salesLoading || shiftsLoading || perDayLoading || categoriesLoading || !sales || !shifts || !perDay || !categories) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
            <div className="flex-1">
              <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-20 rounded bg-slate-200/70 dark:bg-slate-800" />
            </div>
            <div className="h-6 w-20 rounded bg-slate-200/70 dark:bg-slate-800" />
          </div>
          <div className="mt-4 h-24 rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
          <div className="mt-4 h-24 rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
        </div>
      </section>
    );
  }

  const todayKey = date;
  const yesterdayKey = addDaysISO(date, -1);
  const today = sales.data[todayKey] ?? sales.data[Object.keys(sales.data)[0] ?? ""];
  const yesterday = sales.data[yesterdayKey] ?? { ...today, data: [] };

  const dayToday = perDay.data[todayKey] ?? perDay.data[Object.keys(perDay.data)[0] ?? ""];
  const dayYesterday = perDay.data[yesterdayKey] ?? null;

  const catRows = Array.isArray(categories.data) ? categories.data : [];
  const byCat = new Map<string, CategoriesRow>();
  for (const r of catRows) {
    const raw = typeof r.category === "string" ? r.category : "";
    const key = raw.trim();
    if (!key) continue;
    // Use aggregated category rows (item_name null) when present.
    if (r.item_name) continue;
    byCat.set(key, r);
  }

  const qty = (name: string) => Number(byCat.get(name)?.total_qty ?? 0);
  const amt = (name: string) => Number(byCat.get(name)?.total_price ?? 0);

  const regular = qty("Regular Drinks");
  const large = qty("Large Drinks");
  const jumbo = qty("Jumbo Drinks");
  const cupsTotal = regular + large + jumbo;

  // Upstream sometimes has trailing spaces in "Merchandise ".
  const merchQty = qty("Merchandise") || qty("Merchandise ");
  const merchAmt = amt("Merchandise") || amt("Merchandise ");

  const softQty = qty("Soft Serve");
  const softAmt = amt("Soft Serve");

  const regularAmt = amt("Regular Drinks");
  const largeAmt = amt("Large Drinks");
  const jumboAmt = amt("Jumbo Drinks");

  const perDayHistory = Object.entries(perDay.data ?? {})
    .map(([dateKey, v]) => ({ date: v?.date ?? dateKey, ...(v ?? {}) }))
    .filter((v) => typeof v.date === "string" && v.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const pointsToday = (today?.data ?? []).map((row) => ({
    hour: row[0],
    cups: row[1],
    txns: row[2],
    amount: row[4]
  }));

  const pointsYesterday = (yesterday?.data ?? []).map((row) => ({
    hour: row[0],
    cups: row[1],
    txns: row[2],
    amount: row[4]
  }));

  const formatTimeLabel = (timeStart?: string, timeEnd?: string) => {
    if (!timeStart) return "";
    if (!timeEnd || timeEnd === "ACTIVE") return `Started ${timeStart}`;
    return `${timeStart}–${timeEnd}`;
  };

  const formatRange = (timeStart?: string, timeEnd?: string) => {
    if (!timeStart) return "";
    if (!timeEnd) return timeStart;
    return `${timeStart}–${timeEnd}`;
  };

  const summarizeClocks = (
    clocks:
      | Array<{ time_start?: string; time_end?: string; image_start?: string; image_end?: string; breaks?: Array<{ time_start?: string; time_end?: string }> }>
      | undefined
  ) => {
    const safeClocks = clocks ?? [];
    const first = safeClocks[0];
    const last = safeClocks[safeClocks.length - 1];
    const start = first?.time_start;
    const end = last?.time_end;

    const breaks = safeClocks.flatMap((c) => c.breaks ?? []);
    const completedBreaks = breaks
      .filter((b) => b.time_start && b.time_end && b.time_end !== "On Break")
      .map((b) => `${b.time_start}–${b.time_end}`);

    const ongoingBreaks = breaks
      .filter((b) => b.time_start && b.time_end === "On Break")
      .map((b) => `${b.time_start}–On break`);

    return { first, start, end, completedBreaks, ongoingBreaks };
  };

  const activeNow = shifts.all_shifts
    .filter((s) => s.type === "active" && (s.shifts?.[0]?.time_end ?? "") === "ACTIVE")
    .map((s) => {
      const breaks = s.shifts?.[0]?.breaks ?? [];
      const isOnBreak = breaks.some((b) => b.time_end === "On Break");
      const { first, completedBreaks, ongoingBreaks } = summarizeClocks(s.shifts);
      const shiftCost = Number((s as any).total_cost ?? (s as any).shift_cost ?? 0);
      const scheduledFirst = s.scheduled?.[0];
      const scheduledLabel = scheduledFirst ? `Scheduled ${formatRange(scheduledFirst.time_start, scheduledFirst.time_end)}` : "";
      return {
        employeeId: s.employee_id,
        name: s.name,
        avatar: s.avatar ?? null,
        isActiveNow: true,
        isOnBreak,
        timeLabel: formatTimeLabel(first?.time_start, first?.time_end),
        scheduledLabel: scheduledLabel || undefined,
        shiftCost: Number.isFinite(shiftCost) && shiftCost ? shiftCost : undefined,
        breaks: [...ongoingBreaks, ...completedBreaks],
        startImage: first?.image_start ?? null,
        endImage: first?.image_end ?? null
      };
    });

  const worked = shifts.all_shifts
    .filter((s) => s.type === "active" && (s.shifts?.[0]?.time_end ?? "") !== "ACTIVE" && !!s.shifts?.[0]?.time_end)
    .map((s) => {
      const { first, start, end, completedBreaks, ongoingBreaks } = summarizeClocks(s.shifts);
      const shiftCost = Number((s as any).total_cost ?? (s as any).shift_cost ?? 0);
      const scheduledFirst = s.scheduled?.[0];
      const scheduledLabel = scheduledFirst ? `Scheduled ${formatRange(scheduledFirst.time_start, scheduledFirst.time_end)}` : "";
      return {
        employeeId: s.employee_id,
        name: s.name,
        avatar: s.avatar ?? null,
        isActiveNow: false,
        isOnBreak: false,
        timeLabel: start && end ? `${start}–${end}` : "",
        scheduledLabel: scheduledLabel || undefined,
        shiftCost: Number.isFinite(shiftCost) && shiftCost ? shiftCost : undefined,
        breaks: [...ongoingBreaks, ...completedBreaks],
        startImage: first?.image_start ?? null,
        endImage: first?.image_end ?? null
      };
    });

  const scheduled = shifts.all_shifts
    .filter((s) => s.type === "scheduled")
    .map((s) => {
      const first = s.shifts?.[0];
      const shiftCost = Number((s as any).total_cost ?? (s as any).shift_cost ?? 0);
      return {
        employeeId: s.employee_id,
        name: s.name,
        avatar: s.avatar ?? null,
        isActiveNow: false,
        isOnBreak: false,
        timeLabel: first ? `${first.time_start}–${first.time_end}` : "",
        shiftCost: Number.isFinite(shiftCost) && shiftCost ? shiftCost : undefined,
        breaks: [],
        startImage: null,
        endImage: null
      };
    });

  const scheduledCount = shifts.all_shifts.filter((s) => s.type === "scheduled").length;

  return (
    <StoreHourlyCard
      store={store}
      date={date}
      summary={{
        txns: today?.orders ?? 0,
        drinks: today?.count ?? 0,
        totalAmount: Number(today?.total_amount ?? 0)
      }}
      perDay={
        dayToday
          ? {
              today: dayToday,
              yesterday: dayYesterday
            }
          : undefined
      }
      perDayHistory={perDayHistory}
      categoriesSummary={{
        cups: { total: cupsTotal, regular: { qty: regular, amount: regularAmt }, large: { qty: large, amount: largeAmt }, jumbo: { qty: jumbo, amount: jumboAmt } },
        merchandise: { qty: merchQty, amount: merchAmt },
        softServe: { qty: softQty, amount: softAmt }
      }}
      categoriesDetails={{
        date,
        totals: categories.totals ?? null,
        rows: catRows
      }}
      chart={{ today: pointsToday, yesterday: pointsYesterday }}
      shifts={{
        totalCost: Number(shifts.total_cost ?? 0),
        activeNow,
        scheduled,
        worked,
        scheduledCount
      }}
    />
  );
}
