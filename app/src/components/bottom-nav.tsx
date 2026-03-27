"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, CupSoda, Wallet, Settings } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/drinks", label: "Drinks", icon: CupSoda },
  { href: "/cashup", label: "Cashup", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon className={clsx("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
