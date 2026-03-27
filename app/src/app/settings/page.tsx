"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { PageShell } from "@/components/page-shell";
import { config } from "@/lib/config";
import { enablePushNotifications } from "@/lib/push";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState<string>(() => (typeof window === "undefined" ? "" : localStorage.getItem("name") ?? ""));
  const [pushStatus, setPushStatus] = useState<string>("");

  return (
    <PageShell title="Settings">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold">Appearance</div>
          <div className="mt-3 flex gap-2">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t}
                className={[
                  "rounded-lg border px-3 py-2 text-sm",
                  theme === t ? "border-slate-900 dark:border-slate-50" : "border-slate-200 dark:border-slate-800"
                ].join(" ")}
                onClick={() => setTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold">Push notifications</div>
          <label className="mt-3 block text-xs text-slate-500 dark:text-slate-400">Name (stored on device)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-slate-800"
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              localStorage.setItem("name", v);
            }}
            placeholder="e.g. Jay"
          />
          <button
            className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-50 dark:text-slate-900"
            onClick={async () => {
              setPushStatus("Enabling…");
              const res = await enablePushNotifications(name);
              setPushStatus(res.ok ? `Enabled (token saved)` : `Failed: ${res.reason}`);
            }}
          >
            Enable push notifications
          </button>
          {pushStatus ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{pushStatus}</div> : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="font-semibold">Backend</div>
          <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
            <div>data: {config.dataBaseUrl}</div>
            <div>ajax: {config.ajaxBaseUrl}</div>
            <div>api: {config.apiBaseUrl}</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

