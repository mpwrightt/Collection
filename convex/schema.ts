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
});