# Authentication (Clerk) Integration

Timestamp: 2025-09-15T17:48:09-04:00

## Summary
- UI gated with `<SignedIn>` / `<SignedOut>` in `app/dashboard/collections/page.tsx`.
- User menu dropdown (`app/dashboard/nav-user.tsx`) exposes Account + Sign out.
- Convex mutations use `getOrCreateCurrentUser` to auto-create a `users` row from Clerk identity.

## Clerk → Convex
- `aud: "convex"` in JWT template.
- `convex/auth.config.ts` applicationID must match JWT template name (`convex`).

## Webhooks (optional)
- `convex/http.ts` exposes the `/clerk-users-webhook` route for `user.created/updated/deleted`.
- Requires `CLERK_WEBHOOK_SECRET` in Convex env and a Clerk webhook configured.
