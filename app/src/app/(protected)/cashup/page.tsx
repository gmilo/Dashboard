import { PageShell } from "@/components/page-shell";
import { CashupSalesMedia } from "@/components/cashup-salesmedia.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function CashupPage() {
  const todayISO = todayInSydneyISO();
  return (
    <PageShell title="Cashup">
      <CashupSalesMedia initialDateTo={todayISO} />
    </PageShell>
  );
}
