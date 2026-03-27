import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@auth0/nextjs-auth0";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/login");
  }
  return children;
}

