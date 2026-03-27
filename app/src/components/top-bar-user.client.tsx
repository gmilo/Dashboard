"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";

export function TopBarUser() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-slate-200/70 dark:bg-slate-800" aria-hidden />;
  }

  if (!user) return null;

  const picture = typeof user.picture === "string" ? user.picture : "";
  const alt = typeof user.name === "string" ? user.name : "User";

  return (
    <Link href="/settings" className="flex items-center" aria-label="Open settings">
      {picture ? (
        // Use <img> to avoid Next Image hostname configuration churn for identity provider avatars.
        <img src={picture} alt={alt} className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-800" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          {(alt?.[0] ?? "U").toUpperCase()}
        </div>
      )}
    </Link>
  );
}

