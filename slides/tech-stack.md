# Tech Stack & Integrations

## Frontend
- Next.js 15 (App Router) — UI in `app/`
- React 19 + Tailwind UI components
- Modern UX: tabs, modals, progressive lists, and price displays

## Backend
- Convex (serverless database + actions/queries)
  - TCG actions: `convex/tcg.ts`
  - AI: `convex/ai.ts`, `convex/analyzer_v2.ts`
  - Formats/legality: `convex/formats.ts`

## External Services
- Google Gemini (via `@google/generative-ai`)
  - Deck building with exact size prompts
  - Deterministic analysis fallback in `analyzer_v2`
- TCGplayer API
  - Catalog: categories, groups (sets), products
  - Pricing: product-level and SKU-level fallbacks
  - Token caching and rate limiting

## Resilience & Performance
- Graceful handling of no-result searches
  - `searchProducts` treats TCGplayer 404 + "No products were found" as empty results
- Rate limiting with Convex mutations
  - Protects upstream APIs and coordinates expensive jobs
- Batching for details/pricing
  - Efficient `getProductDetails`, `getProductPrices`, `getSkuPrices`
- AI timeouts and compact JSON prompts
  - Faster response, consistent outputs

## Optional Python Service
- `TCGPY_SERVICE_URL` proxy (when available) for product/groups/pricing
- Failover to direct TCGplayer API if service not present
