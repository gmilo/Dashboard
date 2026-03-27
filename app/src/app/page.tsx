import { PageShell } from "@/components/page-shell";
import { StoreDashboardCard } from "@/components/store-dashboard-card.client";
import { todayInSydneyISO } from "@/lib/dates";
import { STORES } from "@/lib/stores";

export default async function DashboardPage() {
  const date = todayInSydneyISO();

  return (
    <PageShell title="Dashboard">
      <div className="space-y-4">
        {STORES.map((store) => (
          <StoreDashboardCard key={store.id} store={store} date={date} />
        ))}
      </div>
    </PageShell>
  );
}
