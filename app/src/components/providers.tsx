"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { swrJsonFetcher } from "@/lib/swr";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrJsonFetcher,
        dedupingInterval: 30_000,
        focusThrottleInterval: 60_000,
        revalidateOnFocus: false,
        shouldRetryOnError: false
      }}
    >
      {children}
    </SWRConfig>
  );
}

