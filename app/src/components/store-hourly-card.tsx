import Image from "next/image";
import { HourlySalesChart, type HourlyPoint } from "@/components/hourly-sales-chart";
import { StoreShiftsStrip, type ShiftPerson } from "@/components/store-shifts-strip";
import { formatAUD, formatNumber } from "@/lib/format";
import type { Store } from "@/lib/stores";

export function StoreHourlyCard({
  store,
  date,
  summary,
  chart,
  shifts
}: {
  store: Store;
  date: string;
  summary: { txns: number; drinks: number; totalAmount: number };
  chart: { today: HourlyPoint[]; yesterday: HourlyPoint[] };
  shifts?: {
    totalCost: number;
    activeNow: ShiftPerson[];
    scheduled: ShiftPerson[];
    worked: ShiftPerson[];
    scheduledCount: number;
  };
}) {
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">Txns</div>
          <div className="mt-1 text-base font-semibold">{formatNumber(summary.txns)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">Drinks</div>
          <div className="mt-1 text-base font-semibold">{formatNumber(summary.drinks)}</div>
        </div>
      </div>

      <div className="mt-3">
        <HourlySalesChart today={chart.today} yesterday={chart.yesterday} />
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Hourly cups (today vs yesterday) + sales line
        </div>
      </div>

      {shifts ? (
        <StoreShiftsStrip
          totalCost={shifts.totalCost}
          activeNow={shifts.activeNow}
          scheduled={shifts.scheduled ?? []}
          worked={shifts.worked ?? []}
          scheduledCount={shifts.scheduledCount}
        />
      ) : null}
    </section>
  );
}
