# How It Works — End-to-End

## Architecture at a Glance
- **Next.js App Router** UI in `app/` with modern components
- **Convex** backend: actions/queries in `convex/`
- **TCGplayer** integration for catalog, sets, products, and pricing (`convex/tcg.ts`)
- **AI (Google Gemini)** for strategy and deck building (`convex/ai.ts`, `convex/analyzer_v2.ts`)
- **Formats/Legality** rules engine and validation (`convex/formats.ts`)

## Core Flows
- **Collection import & aggregation**
  - Aggregated holdings queried via `api.dashboard.getHoldings`
  - Product details and prices fetched in batches (`getProductDetails`, `getProductPrices`)

- **Catalog search**
  - UI calls `tcg.searchProducts` or `formats.searchLegalProducts` with category/format
  - 404 “No products found” handled gracefully → empty list

- **Deck building (AI)**
  - UI calls `ai.buildDeck` with TCG/format, exact main size, and optional owned bias
  - AI returns JSON plan and card names
  - UI maps names → productIds via concurrent searches (top-1 match)

- **Deck analysis (AI or deterministic)**
  - `ai.analyzeDeck` or `analyzer_v2.analyzeDeckV2`
  - Deterministic stats: total, unique, duplicates
  - Optional Gemini summary; legality check via `formats.validateDeckLegality`

## Performance & Reliability
- **Rate limiting** wrapper in Convex to protect upstream APIs
- **Batching** for details/prices/skus to minimize latency
- **Timeouts** and strict generation configs for faster AI
- **Caching** of API tokens and selective set info
