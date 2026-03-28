"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Coffee, X } from "lucide-react";
import { formatAUD } from "@/lib/format";
import useSWR from "swr";

export type ShiftPerson = {
  employeeId: number;
  name: string;
  avatar?: string | null;
  isActiveNow: boolean;
  isOnBreak: boolean;
  timeLabel: string;
  breaks?: string[];
  startImage?: string | null;
  endImage?: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function StoreShiftsStrip({
  companyId,
  date,
  totalCost,
  activeNow,
  scheduled,
  worked,
  scheduledCount
}: {
  companyId: number;
  date: string;
  totalCost: number;
  activeNow: ShiftPerson[];
  scheduled: ShiftPerson[];
  worked: ShiftPerson[];
  scheduledCount: number;
}) {
  const [selected, setSelected] = useState<ShiftPerson | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const shown = activeNow.slice(0, 8);
  const more = activeNow.length - shown.length;
  const shownScheduled = scheduled.slice(0, 6);
  const moreScheduled = scheduled.length - shownScheduled.length;
  const shownWorked = worked.slice(0, 6);
  const moreWorked = worked.length - shownWorked.length;

  const hasAny = activeNow.length > 0 || scheduled.length > 0 || worked.length > 0;
  const modalTitle = useMemo(() => (selected ? selected.name : ""), [selected]);
  const employeeId = selected?.employeeId ?? null;

  useEffect(() => {
    if (!selected) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const invKey = employeeId ? (["invlogs-employee", companyId, employeeId, date] as const) : null;
  const { data: invData, error: invError, isLoading: invLoading } = useSWR<{ success: boolean; data?: any[]; error?: string }>(
    invKey,
    async () => {
      const url = new URL("/api/inventory/logs", window.location.origin);
      url.searchParams.set("company_id", String(companyId));
      url.searchParams.set("employee_id", String(employeeId));
      url.searchParams.set("date_from", date);
      url.searchParams.set("date_to", date);
      url.searchParams.set("limit", "50");
      const res = await fetch(url.toString());
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) throw new Error(json.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">Shifts</div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatAUD(totalCost)} cost</div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-600/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Active {activeNow.length}
          </span>
          <span className="rounded-full bg-sky-600/10 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            Scheduled {scheduledCount}
          </span>
          <span className="rounded-full bg-slate-600/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
            Completed {worked.length}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Active now</div>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            {shown.length ? (
              shown.map((p) => (
                <button
                  key={p.employeeId}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white px-2 py-1 text-left dark:bg-slate-900"
                >
                  <div
                    className={clsx(
                      "relative h-8 w-8 overflow-hidden rounded-full ring-2",
                      p.isOnBreak ? "ring-rose-500/60" : "ring-emerald-500/60"
                    )}
                    title={p.name}
                  >
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt={p.name} className="h-8 w-8 object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-white text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {initials(p.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[10rem] truncate text-xs font-semibold">{p.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.timeLabel}</div>
                    {p.breaks?.length ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Coffee className="h-3 w-3" />
                        <span className="max-w-[12rem] truncate">{p.breaks.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">No active shifts</div>
            )}

            {more > 0 ? (
              <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">+{more}</div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Scheduled</div>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            {shownScheduled.length ? (
              shownScheduled.map((p) => (
                <button
                  key={`sch-${p.employeeId}`}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white px-2 py-1 text-left dark:bg-slate-900"
                >
                  <div
                    className={clsx(
                      "relative h-8 w-8 overflow-hidden rounded-full ring-2",
                      "ring-sky-500/60"
                    )}
                    title={p.name}
                  >
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt={p.name} className="h-8 w-8 object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-white text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {initials(p.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[10rem] truncate text-xs font-semibold">{p.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.timeLabel}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">No scheduled shifts</div>
            )}

            {moreScheduled > 0 ? (
              <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">+{moreScheduled}</div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Completed</div>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            {shownWorked.length ? (
              shownWorked.map((p) => (
                <button
                  key={`wrk-${p.employeeId}`}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-2 py-1 text-left dark:bg-slate-900"
                >
                  <div className={clsx("relative h-8 w-8 overflow-hidden rounded-full ring-2", "ring-slate-300 dark:ring-slate-700")} title={p.name}>
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt={p.name} className="h-8 w-8 object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-white text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {initials(p.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[10rem] truncate text-xs font-semibold">{p.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.timeLabel}</div>
                    {p.breaks?.length ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Coffee className="h-3 w-3" />
                        <span className="max-w-[12rem] truncate">{p.breaks.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">No completed shifts</div>
            )}

            {moreWorked > 0 ? (
              <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">+{moreWorked}</div>
            ) : null}
          </div>
        </div>
      </div>

      {hasAny && selected ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl outline-none dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{modalTitle}</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{selected.timeLabel}</div>
                {selected.breaks?.length ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Coffee className="h-3.5 w-3.5" />
                    <span className="truncate">{selected.breaks.join(", ")}</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Start photo</div>
                <div className="mt-2 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
                  {selected.startImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.startImage} alt="Shift start" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-slate-500 dark:text-slate-400">None</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">End photo</div>
                <div className="mt-2 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
                  {selected.endImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.endImage} alt="Shift end" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                      Still working
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Inventory logs</div>
              {invLoading ? (
                <div className="mt-2 space-y-2">
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
                </div>
              ) : invError ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                  Failed to load inventory logs: {(invError as any)?.message ?? "Unknown error"}
                </div>
              ) : !(invData?.data ?? []).length ? (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No inventory logs for this employee on {date}.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {(invData?.data ?? []).slice(0, 8).map((log: any) => {
                    const inv = log.inventory ?? {};
                    const metaQty = parseMetaQty(log.meta_data);
                    const type = String(log.type ?? "");
                    const isAdd = type.toLowerCase().includes("add");
                    const qtyText = `${isAdd ? "+" : "-"}${metaQty}`;
                    return (
                      <div key={String(log.id ?? `${log.created_at}-${inv.name}-${type}`)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{inv.name ?? "Inventory"}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{String(log.description ?? "")}</div>
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{fmtLogTime(String(log.created_at ?? ""))}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={clsx("text-sm font-semibold tabular-nums", isAdd ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                              {qtyText}
                            </div>
                            <div className={clsx("mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold", isAdd ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-600/10 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200")}>
                              {type || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(invData?.data ?? []).length > 8 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">Showing 8 of {(invData?.data ?? []).length} logs</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function parseMetaQty(metaData: unknown): number {
  if (!metaData) return 0;
  try {
    const parsed = typeof metaData === "string" ? JSON.parse(metaData) : metaData;
    const q = (parsed as any)?.quantity;
    const n = typeof q === "number" ? q : Number(String(q ?? ""));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function fmtLogTime(s: string) {
  if (!s) return "";
  const cleaned = s.split(".")[0] ?? s;
  const dt = new Date(cleaned.replace(" ", "T") + "Z");
  if (!Number.isFinite(dt.getTime())) return s;
  return new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit" }).format(dt);
}
