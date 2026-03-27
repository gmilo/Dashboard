import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBarUser } from "@/components/top-bar-user.client";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          <TopBarUser />
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
