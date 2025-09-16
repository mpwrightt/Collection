# TCG Collection Tracker – Product Requirements Document (PRD)

## 1) Summary
A multi-TCG collection tracker and deck builder with pricing analytics, format validation, AI-driven deck insights, and a "buy missing" purchase flow via TCGplayer.

## 2) Goals
- Track user collections across any TCG available on TCGplayer (MTG, Pokémon, Yu-Gi-Oh!, etc.).
- Provide dashboard analytics (total value, changes, top movers, recent adds).
- Build decks with format validation and surface legality issues.
- AI assistant analyzes decks, suggests improvements, and flags problems.
- One-click "buy missing" flow using TCGplayer quicklist/CSV or affiliate deep links.

## 3) Non-Goals
- Managing actual order fulfillment or inventory outside of user collections.
- Full vendor-side store management (buylist is discontinued by TCGplayer).

## 4) Users & Use Cases
- Collectors: organize cards by folders/tags, track value.
- Players: build, validate, and iterate on decks with AI guidance.
- New users: search catalog, add to collections, explore pricing.

## 5) Key Features
- Collections: nested folders, tags, CRUD, card-level notes, quantities, condition.
- Pricing: server-side cache with daily refresh and on-demand fetches.
- Deck Builder: MTG, Pokémon, Yu-Gi-Oh! initial formats; rules for deck size, copy limits, sections.
- AI Assistant: stats (curve/type), suggestions constrained by format and user holdings.
- Buy Missing: detect deltas between deck and collection; export CSV/quicklist or deep link to TCGplayer.

## 6) Tech Stack
- Frontend: Next.js 15 (App Router), Tailwind v4, shadcn/ui, Recharts.
- Backend: Convex (real-time DB + functions), Clerk auth.
- APIs: TCGplayer REST API (catalog, pricing). Optional OpenAI for AI assistant.

## 7) Integrations
- Clerk: auth, JWT template, webhooks.
- Convex: schema for users, collections, items, decks, formats, pricing cache.
- TCGplayer API: bearer token, catalog/category/product/pricing.

## 8) Data Model (Convex)
- users: { externalId, name }
- collections: { userId, name, parentId?, labels?, createdAt, updatedAt }
- collectionItems: { userId, collectionId?, categoryId, groupId?, productId, skuId?, quantity, condition?, language?, acquiredPrice?, createdAt, updatedAt }
- pricingCache: { productId, skuId?, categoryId, currency?, data, lastFetchedAt }
- apiTokens: { provider, accessToken, tokenType?, expiresAt, createdAt, updatedAt }
- rateLimits: { provider, windowStart, count, windowMs }
- formats: { tcg, name, code?, rules, updatedAt }
- decks: { userId, name, tcg, formatId?, notes?, createdAt, updatedAt }
- deckCards: { deckId, categoryId, productId, skuId?, quantity, section?, role?, createdAt, updatedAt }

## 9) Security & Compliance
- Server-only TCG credentials; never exposed client-side.
- Rate limit to 10 req/s globally for TCG API.
- Input validation and safe rendering of user content.

## 10) AI Assistant
- Server action computes stats and calls provider (OpenAI) if configured.
- Recommendations prefer owned cards; surface legality and synergy notes.

## 11) Buy Missing Flow
- Detect missing quantities per SKU.
- Generate CSV compatible with TCGplayer mass entry quicklist or use affiliate deep links.
- Redirect to TCGplayer for checkout.

## 12) Milestones
1) Foundation: schema, token cache, catalog/pricing service, basic add-to-collection.
2) Dashboard & Pricing: pricing cache jobs, analytics UI.
3) Deck Builder: models, editor UI, format rules, validation panel.
4) AI Assistant: analysis action + UI.
5) Buy Missing: detection + CSV/deep link flow.

## 13) References
- TCGplayer Docs: https://docs.tcgplayer.com/docs/welcome
- Getting Started: https://docs.tcgplayer.com/docs/getting-started
- Reference: https://docs.tcgplayer.com/reference

