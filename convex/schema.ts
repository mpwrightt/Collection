import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
  // Authenticated users, synced from Clerk
  users: defineTable({
    name: v.string(),
    // this the Clerk ID, stored in the subject JWT field
    externalId: v.string(),
  }).index("byExternalId", ["externalId"]),

  // Payment attempts (from starter template)
  paymentAttempts: defineTable(paymentAttemptSchemaValidator)
    .index("byPaymentId", ["payment_id"])
    .index("byUserId", ["userId"])
    .index("byPayerUserId", ["payer.user_id"]),

  // Collections (folders) allow hierarchical organization via optional parentId
  collections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    // Nested folder structure
    parentId: v.optional(v.id("collections")),
    labels: v.optional(v.array(v.string())),
    createdAt: v.number(), // epoch ms
    updatedAt: v.number(), // epoch ms
  })
    .index("byUserId", ["userId"])
    .index("byParentId", ["parentId"])
    .index("byUserName", ["userId", "name"]),

  // Items in a user's collection, tied to TCGplayer catalog identifiers
  collectionItems: defineTable({
    userId: v.id("users"),
    collectionId: v.optional(v.id("collections")),
    // TCGplayer identifiers
    categoryId: v.number(), // e.g., MTG, Pokemon, YGO
    groupId: v.optional(v.number()), // set/expansion id
    productId: v.number(),
    skuId: v.optional(v.number()), // product variant
    quantity: v.number(),
    condition: v.optional(v.string()), // e.g., NM, LP
    language: v.optional(v.string()), // e.g., EN, JP
    notes: v.optional(v.string()),
    acquiredPrice: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byCollectionId", ["collectionId"])
    .index("byProduct", ["productId"])
    .index("bySku", ["skuId"]),

  // Cached pricing per product/SKU to respect TCGplayer API rate limits
  pricingCache: defineTable({
    productId: v.number(),
    skuId: v.optional(v.number()),
    categoryId: v.number(),
    currency: v.optional(v.string()), // default USD
    // Flexible storage for price fields (market, low, median, etc.)
    data: v.any(),
    lastFetchedAt: v.number(), // epoch ms
  })
    .index("byProductId", ["productId"])
    .index("byProductSku", ["productId", "skuId"]),

  // API tokens cache (e.g., TCGplayer bearer tokens)
  apiTokens: defineTable({
    provider: v.string(), // e.g., "tcgplayer"
    accessToken: v.string(),
    tokenType: v.optional(v.string()), // e.g., "bearer"
    expiresAt: v.number(), // epoch ms
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byProvider", ["provider"]),

  // Global rate limit tracker per provider (simple fixed window)
  rateLimits: defineTable({
    provider: v.string(),
    windowStart: v.number(), // epoch ms
    count: v.number(),
    windowMs: v.number(),
  }).index("byProvider", ["provider"]),

  // TCG formats and rule sets (validation rules stored as structured JSON)
  formats: defineTable({
    tcg: v.string(), // e.g., "mtg", "pokemon", "ygo"
    name: v.string(), // e.g., "Standard", "Modern"
    code: v.optional(v.string()), // canonical key, e.g., "standard"
    rules: v.any(), // rule schema: deck sizes, copy limits, sections, bans
    updatedAt: v.number(),
  })
    .index("byTcg", ["tcg"])
    .index("byTcgName", ["tcg", "name"]),

  // Decks created by users
  decks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    tcg: v.string(),
    formatId: v.optional(v.id("formats")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byFormatId", ["formatId"]),

  // Cards within a deck (main/sideboard/extra etc.)
  deckCards: defineTable({
    deckId: v.id("decks"),
    // TCGplayer identifiers for mapping to pricing and collection
    categoryId: v.number(),
    productId: v.number(),
    skuId: v.optional(v.number()),
    quantity: v.number(),
    section: v.optional(v.string()), // e.g., "main", "sideboard", "extra"
    role: v.optional(v.string()), // optional semantic role
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byDeckId", ["deckId"])
    .index("byDeckSection", ["deckId", "section"]),

  // Card sets/expansions (e.g., "Pokemon Base Set 2", "MTG Alpha")
  sets: defineTable({
    categoryId: v.number(), // TCG category (1=MTG, 3=Pokemon, etc.)
    setId: v.string(), // TCGplayer set/group ID
    name: v.string(), // "Pokemon Base Set 2"
    abbreviation: v.optional(v.string()), // "BS2"
    totalCards: v.number(), // expected total cards in set
    releaseDate: v.optional(v.string()), // "1999-02-24"
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byCategoryId", ["categoryId"])
    .index("bySetId", ["setId"])
    .index("byCategoryName", ["categoryId", "name"]),

  // Individual cards within sets with their expected positions
  setCards: defineTable({
    setId: v.string(), // references sets.setId
    cardNumber: v.string(), // "1/130", "25/102", etc.
    productId: v.number(), // TCGplayer product ID
    name: v.string(), // "Pikachu", "Black Lotus"
    rarity: v.optional(v.string()), // "Common", "Rare", "Mythic"
    category: v.optional(v.string()), // "Pokemon", "Trainer", etc.
    estimatedPrice: v.optional(v.number()), // cached market price
    priceUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("bySetId", ["setId"])
    .index("byProductId", ["productId"])
    .index("bySetCardNumber", ["setId", "cardNumber"]),

  // Collection completion targets (what sets users are trying to complete)
  collectionTargets: defineTable({
    userId: v.id("users"),
    collectionId: v.id("collections"),
    setId: v.string(), // references sets.setId
    targetType: v.string(), // "complete", "holos_only", "rares_only", "custom"
    targetCards: v.optional(v.array(v.string())), // specific card numbers if targetType="custom"
    priority: v.optional(v.number()), // 1=high, 2=medium, 3=low
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byCollectionId", ["collectionId"])
    .index("bySetId", ["setId"])
    .index("byUserSet", ["userId", "setId"]),
});