"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Best-effort registration; ignore errors (e.g. during local dev).
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

