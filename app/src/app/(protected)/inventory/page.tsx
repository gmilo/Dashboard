import { PageShell } from "@/components/page-shell";
import { InventoryTabs } from "@/components/inventory-tabs.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function InventoryPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const tab = typeof searchParams?.tab === "string" ? searchParams.tab : undefined;
  return (
    <PageShell title="Inventory">
      <InventoryTabs todayISO={todayInSydneyISO()} initialTab={tab} />
    </PageShell>
  );
}

