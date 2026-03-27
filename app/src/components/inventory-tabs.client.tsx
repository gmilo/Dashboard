"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { InventoryLogsReport } from "@/components/inventory-logs-report.client";
import { InventoryUsageReport } from "@/components/inventory-usage-report.client";
import { InventoryLowStock } from "@/components/inventory-low-stock.client";
import { InventoryValidation } from "@/components/inventory-validation.client";

type TabKey = "logs" | "usage" | "lowstock" | "validation";

function normalizeTab(input?: string): TabKey {
  const s = (input ?? "").toLowerCase();
  if (s === "usage") return "usage";
  if (s === "lowstock" || s === "low-stock" || s === "low_stock") return "lowstock";
  if (s === "validation" || s === "validate") return "validation";
  return "logs";
}

export function InventoryTabs({ todayISO, initialTab }: { todayISO: string; initialTab?: string }) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));
  const tabs = useMemo(
    () =>
      [
        { key: "logs" as const, label: "Logs" },
        { key: "usage" as const, label: "Usage" },
        { key: "lowstock" as const, label: "Low stock" },
        { key: "validation" as const, label: "Validation" }
      ] as const,
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx(
              "px-2 py-2 text-xs font-semibold sm:text-sm",
              tab === t.key ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "logs" ? <InventoryLogsReport todayISO={todayISO} /> : null}
      {tab === "usage" ? <InventoryUsageReport todayISO={todayISO} /> : null}
      {tab === "lowstock" ? <InventoryLowStock todayISO={todayISO} /> : null}
      {tab === "validation" ? <InventoryValidation todayISO={todayISO} /> : null}
    </div>
  );
}

