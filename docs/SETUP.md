# Setup & Local Development

Timestamp: 2025-09-15T17:48:09-04:00

## Requirements
- Node 18+ (Next.js 15)
- pnpm (preferred) or npm
- Convex CLI (`npm i -g convex`)
- Clerk account + application (Frontend API URL + keys)
- TCGplayer API client credentials

## Environment Variables
- Next.js
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`
  - `NEXT_PUBLIC_CONVEX_URL`
- Convex (server-side)
  - `TCGPLAYER_CLIENT_ID`
  - `TCGPLAYER_CLIENT_SECRET`
  - `TCGPLAYER_API_VERSION` (e.g., `v1.39.0`)
  - Optional: `TCGPY_SERVICE_URL` (legacy) or `TCGPY_PUBLIC_URL` (tunnel/public)
  - Optional: `CLERK_WEBHOOK_SECRET` (if using Clerk webhooks)

Set Convex env:
```
npx convex env set TCGPLAYER_CLIENT_ID "..."
npx convex env set TCGPLAYER_CLIENT_SECRET "..."
npx convex env set TCGPLAYER_API_VERSION "v1.39.0"
```

Remove old localhost Python URL from Convex env if present. Use `TCGPY_PUBLIC_URL` only when the Python service is publicly reachable.

## Running
```
pnpm i
pnpm dev
```
This runs Next.js and the Convex dev server. Ensure you are signed in via Clerk.

## Clerk JWT Template (convex)
Ensure a JWT template named `convex` with:
```
{
  "aud": "convex",
  "name": "{{user.full_name}}",
  "email": "{{user.primary_email_address}}",
  "picture": "{{user.image_url}}",
  "nickname": "{{user.username}}",
  "given_name": "{{user.first_name}}",
  "family_name": "{{user.last_name}}",
  "email_verified": "{{user.email_verified}}",
  "updated_at": "{{user.updated_at}}"
}
```
