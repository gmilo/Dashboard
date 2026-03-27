import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    // Protect everything except Next internals, public assets, and the Auth0 routes.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|firebase-messaging-sw.js).*)"
  ]
};

