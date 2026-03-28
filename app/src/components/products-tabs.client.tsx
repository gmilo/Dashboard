"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { DrinksReport } from "@/components/drinks-report.client";
import { ToppingsReport } from "@/components/toppings-report.client";
import { MerchandiseReport } from "@/components/merchandise-report.client";

type Tab = "drinks" | "toppings" | "merchandise";

export function ProductsTabs({ todayISO, initialTab }: { todayISO: string; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "drinks");
  const tabs = useMemo(
    () => [
      { key: "drinks" as const, label: "Drinks" },
      { key: "toppings" as const, label: "Toppings" },
      { key: "merchandise" as const, label: "Merchandise" }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx(
              "px-3 py-2 text-sm font-semibold",
              tab === t.key ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "drinks" ? <DrinksReport todayISO={todayISO} /> : null}
      {tab === "toppings" ? <ToppingsReport todayISO={todayISO} /> : null}
      {tab === "merchandise" ? <MerchandiseReport todayISO={todayISO} /> : null}
    </div>
  );
}
