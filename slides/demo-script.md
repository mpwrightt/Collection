# Demo Script (6–8 minutes)

## 0:00 – 0:45 — Setup & Context
- Open the app at `/dashboard/decks`
- One-liner: “Collection Tracker helps players manage collections, build legal decks with AI, and understand cost.”

## 0:45 – 2:00 — Core Features Tour
- Show tabs: Collection / Catalog / AI
- Show a few holdings, highlight total quantities and values
- Open deck builder list; show sections (Main/Sideboard/Extra)

## 2:00 – 3:30 — Catalog Search
- Search a few cards by name
- Add to deck, show price and owned quantity aggregation
- Mention resilient search: 404 “No products found” handled as empty results

## 3:30 – 5:15 — AI Deck Build
- In AI tab, ensure “Enforce Format Rules” ON and “Bias to Owned” OFF
- Select TCG and format (e.g., MTG Standard, Pokémon Standard, or YGO Advanced)
- Click “Build with AI”: highlight exact deck size target and legal rules
- When plan appears, show “Finding cards in catalog…” mapping; note improved speed

## 5:15 – 6:30 — Analysis & Legality
- Click “Analyze Deck”
- Show stats (total, unique, duplicates) and AI narrative
- Mention `formats.validateDeckLegality` for set legality

## Backup Talking Points
- Rate limiting and token caching protect upstream APIs
- Batching for details/prices/skus improves performance
- Optional Python proxy (`TCGPY_SERVICE_URL`) when available

## Q&A Prompts
- How are format rules encoded and kept fresh?
- What happens if TCG APIs return no results or change shapes?
- How would we support another TCG?
