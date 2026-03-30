import { PageShell } from "@/components/page-shell";
import { StoreDashboardCard } from "@/components/store-dashboard-card.client";
import { todayInSydneyISO } from "@/lib/dates";
import { storesForAccess } from "@/lib/stores";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { DashboardDateFab } from "@/components/dashboard-date-fab.client";
import Link from "next/link";
import { Users } from "lucide-react";

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
    <PageShell
      title="Dashboard"
      contentMaxWidthClass="max-w-[56rem]"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            href="/members"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
            aria-label="Members"
            title="Members"
          >
            <Users className="h-4 w-4" />
          </Link>
        </div>
      }
    >
      <DashboardDateFab date={date} todayISO={today} />
      {stores.length ? (
        <div className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2">
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
