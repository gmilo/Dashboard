"use client";

import { initializeApp, type FirebaseApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { config as appConfig } from "@/lib/config";

export type PushSetupResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

type SaveTokenPayload = {
  action: "save" | "delete";
  token?: string;
  name: string;
};

const LS_OPT_IN = "push_opt_in";
const LS_TOKEN = "push_fcm_token";
const LS_LAST_SYNC = "push_fcm_last_sync";

function getFirebaseConfigFromEnv() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  };
}

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging {
  if (!firebaseApp) {
    const firebaseConfig = getFirebaseConfigFromEnv();
    if (!firebaseConfig) {
      throw new Error("Missing Firebase env vars (NEXT_PUBLIC_FIREBASE_*)");
    }
    firebaseApp = initializeApp(firebaseConfig);
  }
  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }
  return messaging;
}

async function saveTokenToBackend(payload: SaveTokenPayload): Promise<{ ok: true } | { ok: false; reason: string }> {
  let saveResponse: Response;
  try {
    saveResponse = await fetch(`${appConfig.apiBaseUrl}/save-token.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e: any) {
    return { ok: false, reason: e?.message ? String(e.message) : "Network error" };
  }

  if (!saveResponse.ok) {
    return { ok: false, reason: `Token save failed (${saveResponse.status})` };
  }
  // Best-effort parse for debugging; backend sometimes returns empty body on upstream errors.
  try {
    const txt = await saveResponse.text();
    if (txt) JSON.parse(txt);
  } catch {
    // ignore
  }
  return { ok: true };
}

async function getOrCreateSwRegistration(): Promise<ServiceWorkerRegistration> {
  // Ensure SW exists. (You must provide /firebase-messaging-sw.js in public/)
  // Registering repeatedly is safe and ensures updated SW is picked up after deployments.
  return navigator.serviceWorker.register("/firebase-messaging-sw.js");
}

async function getCurrentToken(vapidKey: string): Promise<string | null> {
  const registration = await getOrCreateSwRegistration();
  const token = await getToken(getFirebaseMessaging(), {
    vapidKey,
    serviceWorkerRegistration: registration
  });
  return token || null;
}

export async function enablePushNotifications({
  userId,
}: {
  userId: string;
}): Promise<PushSetupResult> {
  if (!userId.trim()) return { ok: false, reason: "Missing user id" };

  if (!(await isSupported())) {
    return { ok: false, reason: "Push not supported in this browser" };
  }

  if (!("Notification" in window)) return { ok: false, reason: "Notifications not supported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Notification permission not granted" };

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { ok: false, reason: "Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY" };

  const token = await getCurrentToken(vapidKey);

  if (!token) return { ok: false, reason: "No FCM token returned" };

  const saved = await saveTokenToBackend({
    action: "save",
    token,
    name: userId
  });
  if (!saved.ok) return { ok: false, reason: saved.reason };

  try {
    localStorage.setItem(LS_OPT_IN, "1");
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
  } catch {
    // ignore
  }

  return { ok: true, token };
}

export async function disablePushNotifications({ userId }: { userId: string }): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!userId.trim()) return { ok: false, reason: "Missing user id" };
  const existingToken = (() => {
    try {
      return localStorage.getItem(LS_TOKEN) ?? "";
    } catch {
      return "";
    }
  })();

  const saved = await saveTokenToBackend({ action: "delete", name: userId, token: existingToken || undefined });
  if (!saved.ok) return saved;

  // Best-effort: also remove the browser token from FCM so it doesn't keep receiving silently.
  try {
    if (existingToken) {
      await deleteToken(getFirebaseMessaging());
    }
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(LS_OPT_IN);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_LAST_SYNC);
  } catch {
    // ignore
  }

  return { ok: true };
}

export async function syncPushNotifications({ userId }: { userId: string }): Promise<{ ok: true; token?: string } | { ok: false; reason: string }> {
  if (!userId.trim()) return { ok: false, reason: "Missing user id" };

  if (!(await isSupported())) return { ok: false, reason: "Push not supported" };
  if (!("Notification" in window)) return { ok: false, reason: "Notifications not supported" };
  if (Notification.permission !== "granted") return { ok: false, reason: "Notification permission not granted" };

  const optedIn = (() => {
    try {
      return localStorage.getItem(LS_OPT_IN) === "1";
    } catch {
      return false;
    }
  })();
  if (!optedIn) return { ok: true };

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { ok: false, reason: "Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY" };

  const token = await getCurrentToken(vapidKey);
  if (!token) return { ok: false, reason: "No FCM token returned" };

  const prevToken = (() => {
    try {
      return localStorage.getItem(LS_TOKEN) ?? "";
    } catch {
      return "";
    }
  })();

  const lastSyncMs = (() => {
    try {
      const v = Number(localStorage.getItem(LS_LAST_SYNC) ?? "");
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  })();

  // Avoid hammering the backend if nothing changed.
  const twelveHours = 12 * 60 * 60 * 1000;
  if (token === prevToken && Date.now() - lastSyncMs < twelveHours) return { ok: true, token };

  const saved = await saveTokenToBackend({ action: "save", token, name: userId });
  if (!saved.ok) return saved;

  try {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
  } catch {
    // ignore
  }

  return { ok: true, token };
}
