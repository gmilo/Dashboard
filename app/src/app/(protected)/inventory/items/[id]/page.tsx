import { PageShell } from "@/components/page-shell";
import { InventoryItemDetail } from "@/components/inventory-item-detail.client";
import { todayInSydneyISO, addDaysISO } from "@/lib/dates";

export default function InventoryItemPage({ params }: { params: { id: string } }) {
  const today = todayInSydneyISO();
  const from = addDaysISO(today, -7);
  return (
    <PageShell title="Inventory item">
      <InventoryItemDetail id={params.id} initialFrom={from} initialTo={today} />
    </PageShell>
  );
}

