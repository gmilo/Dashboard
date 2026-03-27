import { PageShell } from "@/components/page-shell";
import { StoreDashboardCard } from "@/components/store-dashboard-card.client";
import { todayInSydneyISO } from "@/lib/dates";
import { storesForAccess } from "@/lib/stores";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { DashboardDatePicker } from "@/components/dashboard-date-picker.client";

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function DashboardPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const today = todayInSydneyISO();
  const raw = typeof searchParams?.date === "string" ? searchParams.date : "";
  const date = raw && isISODate(raw) ? raw : today;
  const session = await getSession();
  const companies = companiesFromAuth0User(session?.user);
  const stores = storesForAccess(companies);

  return (
    <PageShell title="Dashboard" headerRight={<DashboardDatePicker date={date} />}>
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
