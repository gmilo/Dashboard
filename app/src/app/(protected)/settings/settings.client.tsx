"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { disablePushNotifications, enablePushNotifications, getLocalPushState } from "@/lib/push";
import { useUser } from "@auth0/nextjs-auth0/client";
import { companiesFromAuth0User } from "@/lib/auth-companies";

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading } = useUser();
  const [pushStatus, setPushStatus] = useState<string>("");
  const [pushWorking, setPushWorking] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => getLocalPushState().optedIn);
  const [deviceLabel, setDeviceLabel] = useState<string>(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("device_label") ?? ""
  );

  const userId = (user?.sub ?? user?.email ?? "").trim();
  const autoDeviceLabel = (user?.email ?? user?.name ?? user?.sub ?? "").trim();
  const companies = companiesFromAuth0User(user).sort((a, b) => (a.name ?? String(a.id)).localeCompare(b.name ?? String(b.id)));

  useEffect(() => {
    if (!autoDeviceLabel) return;
    setDeviceLabel(autoDeviceLabel);
    localStorage.setItem("device_label", autoDeviceLabel);
  }, [autoDeviceLabel]);

  useEffect(() => {
    // Keep UI in sync if something else updates localStorage (e.g. auto-sync).
    setPushEnabled(getLocalPushState().optedIn);
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Account</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {isLoading ? "Loading…" : user ? `Signed in as ${user.email ?? user.name ?? "user"}` : "Not signed in"}
        </div>
        {user ? (
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Companies</div>
            {companies.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                    title={`Company ID: ${c.id}`}
                  >
                    {c.name ?? `Company ${c.id}`}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                You haven&apos;t been assigned to a company yet. Please contact an administrator.
              </div>
            )}
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          {!user ? (
            <a
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-50 dark:text-slate-900"
              href="/api/auth/login"
            >
              Sign in
            </a>
          ) : (
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
              onClick={async () => {
                try {
                  if (userId) await disablePushNotifications({ userId });
                } finally {
                  window.location.href = "/api/auth/logout";
                }
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>

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
        <label className="mt-3 block text-xs text-slate-500 dark:text-slate-400">Device label (auto from login)</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-slate-800"
          value={deviceLabel}
          readOnly
          disabled
        />
        <button
          className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-50 dark:text-slate-900"
          disabled={pushWorking || !userId || pushEnabled}
          onClick={async () => {
            if (pushWorking || pushEnabled) return;
            setPushWorking(true);
            setPushStatus("Enabling…");
            try {
              if (!userId) {
                setPushStatus("Failed: not signed in");
                return;
              }
              const res = await enablePushNotifications({ userId });
              setPushEnabled(res.ok);
              setPushStatus(res.ok ? `Enabled (token saved)` : `Failed: ${res.reason}`);
            } finally {
              setPushWorking(false);
            }
          }}
        >
          Enable push notifications
        </button>
        <button
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
          disabled={pushWorking || !userId || !pushEnabled}
          onClick={async () => {
            if (pushWorking || !pushEnabled) return;
            setPushWorking(true);
            setPushStatus("Disabling…");
            try {
              if (!userId) {
                setPushStatus("Failed: not signed in");
                return;
              }
              const res = await disablePushNotifications({ userId });
              if (res.ok) setPushEnabled(false);
              setPushStatus(res.ok ? "Disabled" : `Failed: ${res.reason}`);
            } finally {
              setPushWorking(false);
            }
          }}
        >
          Disable push notifications
        </button>
        {pushStatus ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{pushStatus}</div> : null}
      </div>
    </div>
  );
}
