# Data Model (Convex)

Timestamp: 2025-09-15T17:48:09-04:00

## Tables
- `users` — { name, externalId } with index `byExternalId`
- `collections` — { userId, name, description?, parentId?, labels?, createdAt, updatedAt }
- `collectionItems` — { userId, collectionId, categoryId?, groupId?, productId, skuId?, quantity, condition?, language?, notes?, acquiredPrice?, createdAt, updatedAt }
  - Indexes: `byUserId`
- `pricingCache` — { productId, data, fetchedAt } with index `byProductId`
- `apiTokens` — { provider, token, type, expiresAt } index `byProvider`
- `rateLimits` — for internal coordination
- `decks`, `deckCards`, `formats` — stubs for deck builder work

## Derived Queries
- `listCollectionsWithCounts`
- `collectionSummary` (total qty, distinct, estimated value)
