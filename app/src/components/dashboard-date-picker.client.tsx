"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { useRef } from "react";

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function DashboardDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next && isISODate(next)) params.set("date", next);
    else params.delete("date");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <button
      type="button"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
      aria-label="Select date"
      title="Select date"
      onClick={() => {
        const el = inputRef.current;
        if (!el) return;
        try {
          if (typeof el.showPicker === "function") return el.showPicker();
        } catch {
          // ignore
        }
        // iOS Safari is picky about fully-hidden inputs; keep it in the layout and trigger a click.
        el.focus();
        el.click();
      }}
    >
      <Calendar className="h-4 w-4" />
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
        value={date}
        onChange={(e) => onChange(e.target.value)}
      />
    </button>
  );
}
