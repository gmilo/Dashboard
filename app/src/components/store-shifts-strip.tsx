"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Coffee, X } from "lucide-react";
import { formatAUD } from "@/lib/format";
import useSWR from "swr";

export type ShiftPerson = {
  employeeId: number;
  name: string;
  avatar?: string | null;
  isActiveNow: boolean;
  isOnBreak: boolean;
  timeLabel: string;
  shiftCost?: number;
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
  const [showAll, setShowAll] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const shown = activeNow.slice(0, 8);
  const more = activeNow.length - shown.length;
  const shownScheduled = scheduled.slice(0, 6);
  const moreScheduled = scheduled.length - shownScheduled.length;
  const shownWorked = worked.slice(0, 6);
  const moreWorked = worked.length - shownWorked.length;

  const hasAny = activeNow.length > 0 || scheduled.length > 0 || worked.length > 0;
  const hasMoreThanActive = scheduledCount > 0 || worked.length > 0;
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

  const tasksKey = employeeId ? (["tasks-employee", companyId, employeeId, date] as const) : null;
  const { data: tasksData, error: tasksError, isLoading: tasksLoading } = useSWR<any>(
    tasksKey,
    async () => {
      const url = new URL("/api/data/dashify-tasks.php", window.location.origin);
      url.searchParams.set("company_id", String(companyId));
      url.searchParams.set("employee_id", String(employeeId));
      url.searchParams.set("date_from", date);
      url.searchParams.set("date_to", date);
      const res = await fetch(url.toString());
      const json = (await res.json()) as any;
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Load failed");
      return json;
    },
    { revalidateOnFocus: false }
  );

  const taskGroups = useMemo(() => normalizeTaskGroups(tasksData), [tasksData]);
  const taskTotals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const g of taskGroups) {
      for (const t of g.tasks) {
        total += 1;
        if (t.done) done += 1;
      }
    }
    return { total, done };
  }, [taskGroups]);

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
        {hasMoreThanActive ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-900/60"
            onClick={() => setShowAll((v) => !v)}
            aria-label={showAll ? "Hide scheduled and completed shifts" : "Show scheduled and completed shifts"}
          >
            {showAll ? (
              <>
                Hide <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                All <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        ) : null}
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

        {showAll ? (
          <>
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
                      <div className={clsx("relative h-8 w-8 overflow-hidden rounded-full ring-2", "ring-sky-500/60")} title={p.name}>
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
          </>
        ) : null}
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
                {typeof selected.shiftCost === "number" && Number.isFinite(selected.shiftCost) ? (
                  <div className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatAUD(selected.shiftCost)} shift cost
                  </div>
                ) : null}
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
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tasks</div>
                {taskTotals.total ? (
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {taskTotals.done}/{taskTotals.total} done
                  </div>
                ) : null}
              </div>

              {tasksLoading ? (
                <div className="mt-2 space-y-2">
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
                </div>
              ) : tasksError ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                  Failed to load tasks: {(tasksError as any)?.message ?? "Unknown error"}
                </div>
              ) : !taskGroups.length ? (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No tasks found for this employee on {date}.</div>
              ) : (
                <div className="mt-2 space-y-3">
                  {taskGroups.map((g) => (
                    <div key={g.title} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{g.title}</div>
                      <div className="mt-2 space-y-2">
                        {g.tasks.map((t) => (
                          <div key={t.key} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950/40">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2">
                                {t.done ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">{t.name}</div>
                                  {t.subtitle ? <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{t.subtitle}</div> : null}
                                  {t.metaSub ? <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{t.metaSub}</div> : null}
                                </div>
                              </div>
                              {t.metaRight ? (
                                <div className="shrink-0 text-right">
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{t.metaRight}</div>
                                  {t.isMulti && t.items.length ? (
                                    <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                                      <div
                                        className="h-full rounded-full bg-emerald-600/70 dark:bg-emerald-400/70"
                                        style={{
                                          width: `${Math.round((t.items.filter((i) => i.done).length / Math.max(1, t.items.length)) * 100)}%`
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            {t.isMulti && t.items.length ? (
                              <div className="mt-2 grid grid-cols-1 gap-1">
                                {t.items.map((it) => (
                                  <div key={it.key} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                                    {it.done ? (
                                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                    )}
                                    <div className="min-w-0 flex-1 truncate">{it.name}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-2">
                    {(invData?.data ?? []).slice(0, 8).map((log: any) => {
                      const inv = log.inventory ?? {};
                      const metaQty = parseMetaQty(log.meta_data);
                      const type = String(log.type ?? "");
                      const isAdd = type.toLowerCase().includes("add");
                      const qtyText = `${isAdd ? "+" : "-"}${metaQty}`;
                      return (
                        <div key={String(log.id ?? `${log.created_at}-${inv.name}-${type}`)} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">{inv.name ?? "Inventory"}</div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{fmtLogTime(String(log.created_at ?? ""))}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className={clsx("text-sm font-semibold tabular-nums", isAdd ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                                {qtyText}
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

type NormalizedTaskItem = { key: string; name: string; done: boolean; value?: string };
type NormalizedTask = {
  key: string;
  name: string;
  done: boolean;
  isMulti: boolean;
  subtitle?: string;
  metaRight?: string;
  metaSub?: string;
  items: NormalizedTaskItem[];
};
type NormalizedTaskGroup = { title: string; tasks: NormalizedTask[] };

function truthyDone(v: unknown): boolean {
  if (v === true) return true;
  if (v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "done" || s === "completed" || s === "complete";
  }
  return false;
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

function pickStr(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeTask(raw: any, fallbackKey: string): NormalizedTask {
  const name = pickStr(raw, ["title", "name", "task_name", "label", "task"]) || `Task ${fallbackKey}`;

  const taskStatus = pickStr(raw, ["task_status", "status", "state"]);
  const taskType = pickStr(raw, ["task_type", "type"]);

  const categoryName =
    (typeof raw?.category === "object" && raw.category ? pickStr(raw.category, ["name", "title"]) : "") ||
    pickStr(raw, ["category", "group", "task_group"]);

  const taskNumber = pickStr(raw, ["task_number", "number", "code"]);
  const createdAt = pickStr(raw, ["created_at", "createdAt", "date"]);

  const isMulti = taskType.toLowerCase().includes("multi");
  const timeLabel = createdAt ? fmtTaskTime(createdAt) : "";
  const metaSub = [taskNumber, taskStatus, timeLabel].filter(Boolean).join(" • ");

  // API shape: task_items[].value is "1" when completed by the employee.
  const childCandidates =
    raw?.task_items ??
    raw?.items ??
    raw?.children ??
    raw?.sub_tasks ??
    raw?.subtasks ??
    raw?.multi_task_items ??
    raw?.multi_tasks ??
    raw?.tasks;
  const children = asArray(childCandidates)
    .filter((c) => c && typeof c === "object")
    .map((c: any, idx: number) => {
      const childName = pickStr(c, ["title", "name", "task_name", "label", "item"]) || `Item ${idx + 1}`;
      const childValue = typeof c?.value === "string" || typeof c?.value === "number" ? String(c.value) : "";
      const childDone = truthyDone(childValue || (c?.done ?? c?.completed ?? c?.is_completed ?? c?.status));
      return { key: String(c?.id ?? `${fallbackKey}-item-${idx}`), name: childName, done: childDone, value: childValue || undefined };
    });

  const progressText = children.length ? `${children.filter((c) => c.done).length}/${children.length}` : "";
  // Single tasks: tick already indicates completion; keep the UI minimal.
  // - No status ("Completed") and no task number.
  const metaRight = isMulti ? progressText : timeLabel;

  const doneSingle = truthyDone(raw?.done ?? raw?.completed ?? raw?.is_completed ?? raw?.value ?? taskStatus) || taskStatus.toLowerCase() === "completed";
  const doneMulti = children.length ? children.every((c) => c.done) : false;

  const subtitle = isMulti
    ? categoryName
    : (children[0]?.name ?? "");

  return {
    key: String(raw?.id ?? fallbackKey),
    name,
    done: isMulti ? doneMulti : doneSingle,
    isMulti,
    subtitle: subtitle || undefined,
    metaRight: metaRight || undefined,
    metaSub: (isMulti ? metaSub : "") || undefined,
    items: children
  };
}

function normalizeTaskGroups(resp: any): NormalizedTaskGroup[] {
  const root = resp?.data ?? resp ?? null;
  if (!root) return [];

  // Primary API shape: { success, filters, data: Task[] }
  if (Array.isArray(root)) {
    const tasks = root.filter((t) => t && typeof t === "object") as any[];
    if (!tasks.length) return [];

    const single = tasks.filter((t) => String(t?.task_type ?? "").toLowerCase().includes("single"));
    const multi = tasks.filter((t) => String(t?.task_type ?? "").toLowerCase().includes("multi"));
    const other = tasks.filter((t) => !single.includes(t) && !multi.includes(t));

    const sortByCreatedDesc = (a: any, b: any) => String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? ""));

    const groups: NormalizedTaskGroup[] = [];
    if (single.length) groups.push({ title: "Single tasks", tasks: [...single].sort(sortByCreatedDesc).map((t, i) => normalizeTask(t, `single-${i}`)) });
    if (multi.length) groups.push({ title: "Multi tasks", tasks: [...multi].sort(sortByCreatedDesc).map((t, i) => normalizeTask(t, `multi-${i}`)) });
    if (other.length) groups.push({ title: "Tasks", tasks: [...other].sort(sortByCreatedDesc).map((t, i) => normalizeTask(t, `task-${i}`)) });
    return groups;
  }

  const single = asArray(root?.single_tasks ?? root?.singleTasks ?? root?.single ?? root?.tasks_single);
  const multi = asArray(root?.multi_tasks ?? root?.multiTasks ?? root?.multi ?? root?.tasks_multi);

  if (single.length || multi.length) {
    const groups: NormalizedTaskGroup[] = [];
    if (single.length) groups.push({ title: "Single tasks", tasks: single.map((t, i) => normalizeTask(t, `single-${i}`)) });
    if (multi.length) groups.push({ title: "Multi tasks", tasks: multi.map((t, i) => normalizeTask(t, `multi-${i}`)) });
    return groups;
  }

  // Fallback: find a tasks array in common keys
  const candidateArrays = [
    root?.tasks,
    root?.data,
    root?.rows,
    root?.items,
    resp?.tasks
  ];
  const arr = candidateArrays.find((v) => Array.isArray(v)) as any[] | undefined;
  if (!arr) return [];

  return [{ title: "Tasks", tasks: arr.map((t, i) => normalizeTask(t, `task-${i}`)) }];
}

function fmtTaskTime(value: string): string {
  // API now returns Sydney-local "YYYY-MM-DD HH:mm:ss".
  // Display h:mm AM/PM.
  if (!value) return "";
  const s = String(value).trim();
  const parts = s.split(" ");
  const timePart = parts.length >= 2 ? (parts[1] ?? "") : s.includes("T") ? (s.split("T")[1] ?? "") : s;
  const hhmm = timePart.slice(0, 5);
  const [hhStr, mmStr] = hhmm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;
  const suffix = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${hour12}:${String(mm).padStart(2, "0")} ${suffix}`;
}
