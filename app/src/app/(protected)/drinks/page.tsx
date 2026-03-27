import { PageShell } from "@/components/page-shell";
import { DrinksReport } from "@/components/drinks-report.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function DrinksPage() {
  return (
    <PageShell title="Drinks">
      <DrinksReport todayISO={todayInSydneyISO()} />
    </PageShell>
  );
}
