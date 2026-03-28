"use client";

import { useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { syncPushNotifications } from "@/lib/push";

export function PushAutoSync() {
  const { user } = useUser();
  const userId = (user?.sub ?? user?.email ?? "").trim();

  useEffect(() => {
    if (!userId) return;
    // Fire and forget: keeps tokens valid across SW updates / deployments.
    syncPushNotifications({ userId }).catch(() => null);
  }, [userId]);

  return null;
}

