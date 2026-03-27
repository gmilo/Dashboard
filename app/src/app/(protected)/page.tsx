import { PageShell } from "@/components/page-shell";
import { StoreDashboardCard } from "@/components/store-dashboard-card.client";
import { todayInSydneyISO } from "@/lib/dates";
import { storesForAccess } from "@/lib/stores";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";

export default async function DashboardPage() {
  const date = todayInSydneyISO();
  const session = await getSession();
  const companies = companiesFromAuth0User(session?.user);
  const stores = storesForAccess(companies);

  return (
    <PageShell title="Dashboard">
      {stores.length ? (
        <div className="space-y-4">
          {stores.map((store) => (
            <StoreDashboardCard key={store.id} store={store} date={date} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          You haven&apos;t been assigned to a company yet. Please contact an administrator.
        </div>
      )}
    </PageShell>
  );
}
