import { PageShell } from "@/components/page-shell";
import { ToppingsReport } from "@/components/toppings-report.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function ToppingsPage() {
  return (
    <PageShell title="Toppings">
      <ToppingsReport todayISO={todayInSydneyISO()} />
    </PageShell>
  );
}

