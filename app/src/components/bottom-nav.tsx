"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, CupSoda, Wallet, Boxes } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/products", label: "Products", icon: CupSoda },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/cashup", label: "Cashup", icon: Wallet }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-10px_25px_-20px_rgba(15,23,42,0.25)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-[0_-10px_25px_-20px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === "/products" && (pathname.startsWith("/products") || pathname.startsWith("/drinks") || pathname.startsWith("/toppings")));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-[#EE5621]" : "text-slate-600 dark:text-slate-400"
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
