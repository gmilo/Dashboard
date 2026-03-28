import { PageShell } from "@/components/page-shell";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { MembersReport } from "@/components/members-report.client";

export default async function MembersPage() {
  const session = await getSession();
  const companies = companiesFromAuth0User(session?.user);

  return (
    <PageShell title="Members">
      {companies.length ? (
        <MembersReport companies={companies.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` }))} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          You haven&apos;t been assigned to a company yet. Please contact an administrator.
        </div>
      )}
    </PageShell>
  );
}

