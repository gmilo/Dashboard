import { PageShell } from "@/components/page-shell";
import { CashupSalesMedia } from "@/components/cashup-salesmedia.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function CashupPage() {
  const dateTo = todayInSydneyISO();
  return (
    <PageShell title="Cashup">
      <CashupSalesMedia dateTo={dateTo} />
    </PageShell>
  );
}
