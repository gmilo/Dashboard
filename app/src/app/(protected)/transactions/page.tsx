import { PageShell } from "@/components/page-shell";
import { TransactionsReport } from "@/components/transactions-report.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function TransactionsPage() {
  return (
    <PageShell title="Transactions">
      <TransactionsReport todayISO={todayInSydneyISO()} />
    </PageShell>
  );
}
