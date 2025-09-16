# Runbook / Troubleshooting

Timestamp: 2025-09-15T17:48:09-04:00

## Common Issues
- "Can't get current user" in Convex
  - Ensure you are signed in via Clerk
  - JWT template named `convex` with `aud: "convex"`
  - Mutations now auto-create user via `getOrCreateCurrentUser`

- TCG calls failing
  - Confirm Convex env has `TCGPLAYER_*` vars
  - Ensure you're not using a localhost `TCGPY_SERVICE_URL` in Convex; use `TCGPY_PUBLIC_URL` or direct API

- Categories/Sets long lists
  - Scroll within the dropdown; combobox upgrade planned

## Useful Commands
```
pnpm dev           # run Next.js + Convex dev
npx convex env list
```
