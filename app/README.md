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

## Auth (Auth0)

This app uses Auth0 via `@auth0/nextjs-auth0`.

Required env vars (see `.env.example`):
- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

Auth routes are served at:
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/callback`
- `/api/auth/me`

Auth0 dashboard settings (Application → Settings):
- **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`, `https://<your-domain>/api/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`, `https://<your-domain>`
- **Allowed Web Origins:** `http://localhost:3000`, `https://<your-domain>`

To generate `AUTH0_SECRET` locally (macOS/Linux):
```bash
openssl rand -hex 32
```

### Company access (per user)

If you store companies in the Auth0 user profile under `user_metadata.companies` (example below), you must expose it to the app as an ID token claim (Auth0 Actions / Rules), because `user_metadata` is not automatically included in the session.

Example `user_metadata`:
```json
{ "companies": [ { "name": "Greystanes", "id": 197 } ] }
```

Recommended: add a **Post Login Action** that sets a custom claim like `https://milo.dashify.com/companies` to `event.user.user_metadata.companies`.

Then set:
- `AUTH0_COMPANIES_CLAIM=https://milo.dashify.com/companies`
