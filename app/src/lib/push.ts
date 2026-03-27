"use client";

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { config as appConfig } from "@/lib/config";

export type PushSetupResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

type SaveTokenPayload = {
  action: "save" | "delete";
  token?: string;
  name: string;
};

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
  const saveResponse = await fetch(`${appConfig.apiBaseUrl}/save-token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!saveResponse.ok) {
    return { ok: false, reason: `Token save failed (${saveResponse.status})` };
  }
  return { ok: true };
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

  // Ensure SW exists. (You must provide /firebase-messaging-sw.js in public/)
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(getFirebaseMessaging(), {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!token) return { ok: false, reason: "No FCM token returned" };

  const saved = await saveTokenToBackend({
    action: "save",
    token,
    name: userId
  });
  if (!saved.ok) return { ok: false, reason: saved.reason };

  return { ok: true, token };
}

export async function disablePushNotifications({ userId }: { userId: string }): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!userId.trim()) return { ok: false, reason: "Missing user id" };
  return saveTokenToBackend({ action: "delete", name: userId });
}
