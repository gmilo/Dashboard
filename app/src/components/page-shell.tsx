import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBarUser } from "@/components/top-bar-user";
import { PushAutoSync } from "@/components/push-auto-sync.client";

export function PageShell({ title, headerRight, children }: { title: string; headerRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <PushAutoSync />
      <div className="sticky top-0 z-40 shadow-sm dark:shadow-none">
        <div className="h-[env(safe-area-inset-top)] bg-white/90 backdrop-blur dark:bg-slate-950/90" />
        <header className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex items-center justify-between gap-3">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              {headerRight}
              <TopBarUser />
            </div>
          </div>
        </header>
      </div>
      <main className="flex-1 bg-slate-100 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] dark:bg-slate-950">{children}</main>
      <BottomNav />
    </div>
  );
}
