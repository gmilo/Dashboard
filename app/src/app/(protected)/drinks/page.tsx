import { PageShell } from "@/components/page-shell";
import { DrinksReport } from "@/components/drinks-report.client";
import { todayInSydneyISO } from "@/lib/dates";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function DrinksPage() {
  return (
    <PageShell
      title="Drinks"
      headerRight={
        <Link
          href="/toppings"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
          aria-label="Toppings"
          title="Toppings"
        >
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      <DrinksReport todayISO={todayInSydneyISO()} />
    </PageShell>
  );
}
