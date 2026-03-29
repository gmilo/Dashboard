"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDaysISO } from "@/lib/dates";

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function DashboardDateFab({ date, todayISO }: { date: string; todayISO: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const canGoNext = useMemo(() => (isISODate(date) && isISODate(todayISO) ? date < todayISO : false), [date, todayISO]);

  const setDate = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next && isISODate(next)) params.set("date", next);
    else params.delete("date");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-slate-50 dark:text-slate-900 dark:shadow-black/30"
        aria-label="Select date"
        title="Select date"
      >
        <Calendar className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-0 right-0 mx-auto max-w-md px-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Select date</div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  onClick={() => setDate(addDaysISO(date, -1))}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <input
                  type="date"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-800"
                  value={date}
                  max={todayISO}
                  onChange={(e) => setDate(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!canGoNext}
                  className={[
                    "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
                    !canGoNext ? "opacity-40" : ""
                  ].join(" ")}
                  onClick={() => (canGoNext ? setDate(addDaysISO(date, 1)) : null)}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Today: {todayISO}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
