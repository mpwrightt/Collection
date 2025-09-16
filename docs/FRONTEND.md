# Frontend (Next.js) — Flows & Components

Timestamp: 2025-09-15T17:48:09-04:00

## Collections Grid
- Path: `app/dashboard/collections/page.tsx`
- Features: Create, Rename, Delete (safe when empty), Open folder
- Auth-gated with Clerk; Sign in prompt for signed-out users

## Folder Detail
- Path: `app/dashboard/collections/[id]/page.tsx`
- Add Cards dialog (centered):
  - Category + Set filters (scrollable; combobox upgrade planned)
  - Search with product thumbnails
  - Selecting a result opens a focused Card Details modal with image and SKUs
  - Add with quantity (+ SKU if selected)
- Items table: productId, skuId, qty, added date
- KPIs: total quantity, distinct products, estimated value

## User Menu
- Path: `app/dashboard/nav-user.tsx`
- Dropdown with Account and Sign out
