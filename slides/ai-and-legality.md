# AI Strategy & Legality Enforcement

## AI Deck Building
- Exact main-deck sizes enforced in prompt
  - MTG/Pokémon: 60 cards
  - MTG Commander: 100 cards
  - Yu‑Gi‑Oh!: aims for 40 (legal 40–60)
- Optional bias to owned collection (toggle in UI)
  - When OFF: AI chooses freely (rules-first)
  - When ON: AI prefers provided owned names/quantities

## Legality Rules
- `convex/formats.ts`
  - `searchLegalProducts(tcg, formatCode, productName)`: filters catalog results to format-legal sets
  - `validateDeckLegality(tcg, formatCode, cards)`: checks each product’s groupId against allowed sets
- Pokémon Standard (SV era) bootstrap
  - Computes allowed groupIds from category 3 when missing
  - Upserts rules to `formats` table for reuse
  - Guarded with a 10-minute rate-limit slot to prevent stampede

## Robustness: No-Result Searches
- TCGplayer occasionally returns `404` with `{ success:false, errors:["No products were found."], results:[] }`
- We treat this as an empty result, not an error, in `tcg.searchProducts`
- Result: smoother UX during AI name→product mapping and manual search

## Performance
- Faster AI responses
  - Strict generation config + 15s timeout in `convex/ai.ts`
  - Compact JSON prompts and JSON-only responses
- Faster name→product mapping
  - Concurrent top-1 searches (batch size 10) in deck builder UI
  - Server-side rate limiting protects upstream APIs
