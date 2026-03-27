"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function DashboardDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next && isISODate(next)) params.set("date", next);
    else params.delete("date");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <label
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
      aria-label="Select date"
      title="Select date"
    >
      <Calendar className="h-4 w-4" />
      <input
        type="date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        value={date}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

