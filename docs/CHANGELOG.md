# Changelog

All notable changes in this hackathon project. Times are local.

## 2025-09-15T17:48:09-04:00

- Backend
  - Convex actions: `tcg.getCategories`, `tcg.getGroups`, `tcg.getAllGroups` (paged), `tcg.searchProducts` (supports `categoryId` + `groupId`), `tcg.getProductDetails`, `tcg.getProductMedia`, `tcg.getSkus`, `tcg.getCategoryMedia`.
  - Rate limiting (10 rps) and bearer token caching; optional Python service fallback.
  - Collections: `createCollection`, `updateCollection`, `deleteCollection` (safe delete), `addItem`, `listItems`, `listCollectionsWithCounts`, `collectionSummary`.
  - Auth robustness: `getOrCreateCurrentUser` auto-provisions users on first write.

- Python Service
  - Endpoints: `/groups`, `/skus`, `/media`, `/product-details`, `/categories`, `/category-media`.

- UI
  - `app/dashboard/collections/page.tsx`: folder grid Create/Rename/Delete with auth gating; open folder.
  - `app/dashboard/collections/[id]/page.tsx`: centered Add Cards dialog; scrollable filters and results; image thumbnails; focused Card Details modal with SKUs; folder items list and KPIs (qty, distinct, estimated value).
  - Sidebar user menu (`app/dashboard/nav-user.tsx`): Account + Sign out dropdown.

- Configuration
  - `run_all.sh` no longer pushes localhost Python URL to Convex.
  - Uses `TCGPY_PUBLIC_URL` when available, else direct TCG API via Convex with `TCGPLAYER_*` env vars.
  - Clerk JWT template requirements documented.

- Archon
  - Project synced; tasks updated/created for collections UI, auto-provision user, icons/combobox filters, richer card details, and pricing/KPI work.

