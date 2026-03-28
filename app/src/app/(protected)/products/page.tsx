import { PageShell } from "@/components/page-shell";
import { ProductsTabs } from "@/components/products-tabs.client";
import { todayInSydneyISO } from "@/lib/dates";

export default function ProductsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const tab = typeof searchParams?.tab === "string" ? searchParams.tab : undefined;
  const initialTab = tab === "toppings" ? "toppings" : tab === "merchandise" ? "merchandise" : "drinks";
  return (
    <PageShell title="Products">
      <ProductsTabs todayISO={todayInSydneyISO()} initialTab={initialTab} />
    </PageShell>
  );
}
