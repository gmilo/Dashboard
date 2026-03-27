import { PageShell } from "@/components/page-shell";

export default function DrinksPage() {
  return (
    <PageShell title="Drinks">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Coming next: top drinks + categories powered by `/api/data/drinks.php` and `/api/data/categories.php`.
      </div>
    </PageShell>
  );
}

