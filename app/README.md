# Milo Dashboard PWA (Next.js)

Mobile-first PWA frontend intended to replace the legacy PHP UI while continuing to consume the existing backend endpoints.

## Local dev

```bash
cd app
npm install
npm run bootstrap:env
npm run dev
```

## Backend configuration

Base URLs are configured via env vars (see `.env.example`).

## Push notifications

This uses Firebase Cloud Messaging (FCM):

- App code reads `NEXT_PUBLIC_FIREBASE_*` env vars.
- `public/firebase-messaging-sw.js` is auto-generated from env on `npm run dev`/`npm run build`.

Note: the legacy `../config/firebase-credentials.json` is a **service account private key** and must not be placed into `NEXT_PUBLIC_*` env vars.

## Deploy

- **Vercel:** set the project root to `app/` and configure env vars.
- **Container:** build with the included `Dockerfile`.
