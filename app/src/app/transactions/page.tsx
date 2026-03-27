import { PageShell } from "@/components/page-shell";

export default function TransactionsPage() {
  return (
    <PageShell title="Transactions">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Coming next: filters + table powered by `/api/data/transactions.php`.
      </div>
    </PageShell>
  );
}

