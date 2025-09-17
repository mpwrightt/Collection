import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow, getOrCreateCurrentUser } from "./users";

type CollectionSummaryData = {
  totalQuantity: number
  distinctProducts: number
  estimatedValue: number
  averageValue: number
  completionPercentage: number
  missingCards: number
  setName: string | null
  latestItemUpdatedAt: number
  updatedAt: number
}

const extractMarketPrice = (priceDoc: any): number => {
  if (!priceDoc) return 0
  const data = (priceDoc as any).data ?? priceDoc
  if (!data) return 0

  if (typeof data.marketPrice === "number") {
    return Number(data.marketPrice) || 0
  }

  const candidates = Array.isArray(data.results) ? data.results : Array.isArray(data.Results) ? data.Results : []
  if (Array.isArray(candidates) && candidates.length > 0) {
    const normal = candidates.find((r: any) => r?.subTypeName === "Normal" && typeof r.marketPrice === "number")
    const anyPrice = candidates.find((r: any) => typeof r?.marketPrice === "number")
    if (normal) return Number(normal.marketPrice) || 0
    if (anyPrice) return Number(anyPrice.marketPrice) || 0
  }

  if (Array.isArray(data.results) && data.results[0]?.marketPrice) {
    return Number(data.results[0].marketPrice) || 0
  }
  if (Array.isArray(data.Results) && data.Results[0]?.marketPrice) {
    return Number(data.Results[0].marketPrice) || 0
  }

  return 0
}

async function computeCollectionSummaryInternal(
  ctx: any,
  userId: any,
  collectionId: any
): Promise<CollectionSummaryData> {
  const items = await ctx.db
    .query("collectionItems")
    .withIndex("byCollectionId", (q: any) => q.eq("collectionId", collectionId))
    .collect()

  const mine = items.filter((item: any) => String(item.userId) === String(userId))

  let totalQuantity = 0
  let latestItemUpdatedAt = 0
  const productSet = new Set<number>()
  const quantityBySku = new Map<string, { productId: number; skuId?: number; quantity: number }>()

  for (const item of mine) {
    const quantity = item.quantity ?? 0
    totalQuantity += quantity
    productSet.add(item.productId)
    const updated = item.updatedAt ?? item.createdAt ?? 0
    if (updated > latestItemUpdatedAt) latestItemUpdatedAt = updated

    const skuKey = `${item.productId}:${item.skuId ?? '_'}`
    const existing = quantityBySku.get(skuKey)
    if (existing) {
      existing.quantity += quantity
    } else {
      quantityBySku.set(skuKey, {
        productId: item.productId,
        skuId: item.skuId ?? undefined,
        quantity,
      })
    }
  }

  const priceCache = new Map<string, number>()
  const getMarketPriceForKey = async (productId: number, skuId?: number) => {
    const cacheKey = `${productId}:${skuId ?? '_'}`
    if (priceCache.has(cacheKey)) return priceCache.get(cacheKey) ?? 0

    let record: any = null

    if (typeof skuId === "number") {
      record = await ctx.db
        .query("pricingCache")
        .withIndex("byProductSku", (q: any) => q.eq("productId", productId).eq("skuId", skuId))
        .first()
    }

    if (!record) {
      record = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", (q: any) => q.eq("productId", productId))
        .first()
    }

    const price = extractMarketPrice(record)
    priceCache.set(cacheKey, price)
    return price
  }

  let estimatedValue = 0
  for (const { productId, skuId, quantity } of quantityBySku.values()) {
    const market = await getMarketPriceForKey(productId, skuId)
    estimatedValue += quantity * market
  }

  const distinctProducts = productSet.size

  // Completion metrics (if a target exists)
  let completionPercentage = 0
  let missingCards = 0
  let setName: string | null = null

  const target = await ctx.db
    .query("collectionTargets")
    .withIndex("byCollectionId", (q: any) => q.eq("collectionId", collectionId))
    .first()

  if (target) {
    const set = await ctx.db
      .query("sets")
      .withIndex("bySetId", (q: any) => q.eq("setId", target.setId))
      .first()

    if (set) {
      setName = set.name ?? null

      const setCards = await ctx.db
        .query("setCards")
        .withIndex("bySetId", (q: any) => q.eq("setId", target.setId))
        .collect()

      const ownedProductIds = new Set(mine.map((item: any) => item.productId))

      let targetCardNumbers: string[]
      if (target.targetType === "complete") {
        targetCardNumbers = setCards.map((card: any) => card.cardNumber)
      } else if (target.targetType === "custom" && Array.isArray(target.targetCards)) {
        targetCardNumbers = target.targetCards
      } else {
        targetCardNumbers = setCards
          .filter((card: any) => {
            if (target.targetType === "holos_only") {
              return card.rarity?.toLowerCase().includes("holo") || card.rarity?.toLowerCase().includes("rare")
            }
            if (target.targetType === "rares_only") {
              return card.rarity?.toLowerCase().includes("rare")
            }
            return true
          })
          .map((card: any) => card.cardNumber)
      }

      const targetCards = setCards.filter((card: any) => targetCardNumbers.includes(card.cardNumber))
      const ownedTargetCards = targetCards.filter((card: any) => ownedProductIds.has(card.productId))

      completionPercentage = targetCards.length > 0 ? (ownedTargetCards.length / targetCards.length) * 100 : 0
      missingCards = Math.max(0, targetCards.length - ownedTargetCards.length)
    }
  }

  const averageValue = totalQuantity > 0 ? estimatedValue / totalQuantity : 0

  return {
    totalQuantity,
    distinctProducts,
    estimatedValue,
    averageValue,
    completionPercentage,
    missingCards,
    setName,
    latestItemUpdatedAt,
    updatedAt: Date.now(),
  }
}

// Create a new collection folder (optionally nested)
export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("collections")),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { name, description, parentId, labels }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const now = Date.now();
    const id = await ctx.db.insert("collections", {
      userId: user._id,
      name,
      description,
      parentId,
      labels,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Rename or update a collection
export const updateCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    parentId: v.optional(v.id("collections")),
  },
  handler: async (ctx, { collectionId, name, description, labels, parentId }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const existing = await ctx.db.get(collectionId);
    if (!existing || existing.userId !== user._id) throw new Error("Collection not found");
    await ctx.db.patch(collectionId, {
      name: name ?? existing.name,
      description: description ?? existing.description,
      labels: labels ?? existing.labels,
      parentId: parentId ?? existing.parentId,
      updatedAt: Date.now(),
    });
  },
});

// List collections for current user (optionally nested under parent)
export const listCollections = query({
  args: { parentId: v.optional(v.id("collections")) },
  handler: async (ctx, { parentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    let q = ctx.db.query("collections").withIndex("byUserId", (q) => q.eq("userId", user._id));
    const all = await q.collect();
    return all.filter((c) => (parentId ? c.parentId === parentId : true));
  },
});

// Add a card to a collection (or unassigned to any folder if collectionId omitted)
export const addItem = mutation({
  args: {
    collectionId: v.optional(v.id("collections")),
    categoryId: v.number(),
    groupId: v.optional(v.number()),
    productId: v.number(),
    skuId: v.optional(v.number()),
    quantity: v.number(),
    condition: v.optional(v.string()),
    language: v.optional(v.string()),
    notes: v.optional(v.string()),
    acquiredPrice: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { collectionId, categoryId, groupId, productId, skuId, quantity, condition, language, notes, acquiredPrice },
  ) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const now = Date.now();
    // Optional: merge with existing identical line item
    const id = await ctx.db.insert("collectionItems", {
      userId: user._id,
      collectionId,
      categoryId,
      groupId,
      productId,
      skuId,
      quantity,
      condition,
      language,
      notes,
      acquiredPrice,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// List items for a collection (or all unassigned items if collectionId not provided)
export const listItems = query({
  args: { collectionId: v.optional(v.id("collections")) },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    let q = ctx.db.query("collectionItems").withIndex("byUserId", (q) => q.eq("userId", user._id));
    const all = await q.collect();
    return all.filter((i) => (collectionId ? i.collectionId === collectionId : !i.collectionId));
  },
});

// Move an item to another collection or unassign
export const moveItem = mutation({
  args: { itemId: v.id("collectionItems"), targetCollectionId: v.optional(v.id("collections")) },
  handler: async (ctx, { itemId, targetCollectionId }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");
    await ctx.db.patch(itemId, { collectionId: targetCollectionId, updatedAt: Date.now() });
  },
});

// Remove an item
export const removeItem = mutation({
  args: { itemId: v.id("collectionItems") },
  handler: async (ctx, { itemId }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");
    await ctx.db.delete(itemId);
  },
});

// Update quantity for an item
export const updateItemQuantity = mutation({
  args: { itemId: v.id("collectionItems"), quantity: v.number() },
  handler: async (ctx, { itemId, quantity }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");
    const q = Math.max(0, Math.floor(quantity));
    if (q === 0) {
      await ctx.db.delete(itemId);
      return;
    }
    await ctx.db.patch(itemId, { quantity: q, updatedAt: Date.now() });
  },
});

// Update one or more fields on an item (quantity, condition, skuId, notes, acquiredPrice)
export const updateItemFields = mutation({
  args: {
    itemId: v.id("collectionItems"),
    quantity: v.optional(v.number()),
    condition: v.optional(v.string()),
    skuId: v.optional(v.number()),
    notes: v.optional(v.string()),
    acquiredPrice: v.optional(v.number()),
  },
  handler: async (ctx, { itemId, quantity, condition, skuId, notes, acquiredPrice }) => {
    const user = await getOrCreateCurrentUser(ctx as any);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");
    const patch: any = { updatedAt: Date.now() };
    if (typeof quantity === 'number') {
      const q = Math.max(0, Math.floor(quantity));
      if (q === 0) {
        await ctx.db.delete(itemId);
        return;
      }
      patch.quantity = q;
    }
    if (typeof condition === 'string') patch.condition = condition;
    if (typeof skuId === 'number') patch.skuId = skuId;
    if (typeof notes === 'string') patch.notes = notes;
    if (typeof acquiredPrice === 'number') patch.acquiredPrice = acquiredPrice;
    await ctx.db.patch(itemId, patch);
  },
});

// Delete a collection (only if empty) or cascade=false by default
export const deleteCollection = mutation({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const coll = await ctx.db.get(collectionId);
    if (!coll || coll.userId !== user._id) throw new Error("Collection not found");
    const anyItem = await ctx.db
      .query("collectionItems")
      .withIndex("byCollectionId", q => q.eq("collectionId", collectionId))
      .first();
    if (anyItem) {
      throw new Error("Collection is not empty. Move or remove items first.");
    }
    await ctx.db.delete(collectionId);
  }
});

// List top-level collections with item counts
export const listCollectionsWithCounts = query({
  args: { parentId: v.optional(v.id("collections")) },
  handler: async (ctx, { parentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [] as any[];
    const cols = await ctx.db
      .query("collections")
      .withIndex("byUserId", q => q.eq("userId", user._id))
      .collect();
    const filtered = cols.filter(c => (parentId ? c.parentId === parentId : !c.parentId));
    const counts = new Map<string, number>();
    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byUserId", q => q.eq("userId", user._id))
      .collect();
    for (const it of items) {
      const key = it.collectionId ? String(it.collectionId) : "unassigned";
      counts.set(key, (counts.get(key) ?? 0) + (it.quantity ?? 0));
    }
    return filtered.map(c => ({
      _id: c._id,
      name: c.name,
      description: c.description ?? null,
      labels: c.labels ?? [],
      parentId: c.parentId ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      itemCount: counts.get(String(c._id)) ?? 0,
    }));
  }
});

// Summary stats for a single collection (quantity, distinct products, estimated value, completion)
export const collectionSummary = query({
  args: {
    collectionId: v.id("collections"),
    fresh: v.optional(v.boolean()),
  },
  handler: async (ctx, { collectionId, fresh }) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      return {
        totalQuantity: 0,
        distinctProducts: 0,
        estimatedValue: 0,
        averageValue: 0,
        completionPercentage: 0,
        setName: null,
        missingCards: 0,
        latestItemUpdatedAt: 0,
        updatedAt: 0,
      }
    }

    let cached: any = null
    if (!fresh) {
      cached = await ctx.db
        .query("collectionSummaries")
        .withIndex("byCollectionId", (q: any) => q.eq("collectionId", collectionId))
        .first()

      if (cached && String(cached.userId) !== String(user._id)) {
        cached = null
      }
    }

    if (cached && !fresh) {
      return {
        totalQuantity: cached.totalQuantity,
        distinctProducts: cached.distinctProducts,
        estimatedValue: cached.estimatedValue,
        averageValue: cached.averageValue,
        completionPercentage: cached.completionPercentage,
        setName: cached.setName ?? null,
        missingCards: cached.missingCards,
        latestItemUpdatedAt: cached.latestItemUpdatedAt,
        updatedAt: cached.updatedAt,
      }
    }

    const computed = await computeCollectionSummaryInternal(ctx, user._id, collectionId)
    return computed
  },
})

export const listCollectionSummaries = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const [collections, cachedSummaries] = await Promise.all([
      ctx.db
        .query("collections")
        .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("collectionSummaries")
        .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
        .collect(),
    ])

    const cachedMap = new Map<string, any>()
    for (const summary of cachedSummaries) {
      cachedMap.set(String(summary.collectionId), summary)
    }

    const results: any[] = []
    for (const collection of collections) {
      const computed = await computeCollectionSummaryInternal(ctx, user._id, collection._id)
      const cached = cachedMap.get(String(collection._id))
      results.push({
        _id: cached?._id,
        collectionId: collection._id,
        totalQuantity: computed.totalQuantity,
        distinctProducts: computed.distinctProducts,
        estimatedValue: computed.estimatedValue,
        averageValue: computed.averageValue,
        completionPercentage: computed.completionPercentage,
        missingCards: computed.missingCards,
        setName: computed.setName,
        latestItemUpdatedAt: computed.latestItemUpdatedAt,
        updatedAt: computed.updatedAt,
      })
    }

    return results
  },
})

export const refreshCollectionSummary = mutation({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUserOrThrow(ctx)
    const collection = await ctx.db.get(collectionId)
    if (!collection || String(collection.userId) !== String(user._id)) {
      throw new Error("Collection not found")
    }

    const computed = await computeCollectionSummaryInternal(ctx, user._id, collectionId)

    const existing = await ctx.db
      .query("collectionSummaries")
      .withIndex("byCollectionId", (q: any) => q.eq("collectionId", collectionId))
      .first()

    if (existing && String(existing.userId) === String(user._id)) {
      await ctx.db.patch(existing._id, {
        totalQuantity: computed.totalQuantity,
        distinctProducts: computed.distinctProducts,
        estimatedValue: computed.estimatedValue,
        averageValue: computed.averageValue,
        completionPercentage: computed.completionPercentage,
        missingCards: computed.missingCards,
        setName: computed.setName ?? undefined,
        latestItemUpdatedAt: computed.latestItemUpdatedAt,
        updatedAt: computed.updatedAt,
      })
    } else {
      await ctx.db.insert("collectionSummaries", {
        userId: user._id,
        collectionId,
        totalQuantity: computed.totalQuantity,
        distinctProducts: computed.distinctProducts,
        estimatedValue: computed.estimatedValue,
        averageValue: computed.averageValue,
        completionPercentage: computed.completionPercentage,
        missingCards: computed.missingCards,
        setName: computed.setName ?? undefined,
        latestItemUpdatedAt: computed.latestItemUpdatedAt,
        updatedAt: computed.updatedAt,
      })
    }

    return computed
  },
})

// Get overall collection statistics for the user
export const getCollectionStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { totalCards: 0, totalValue: 0, totalFolders: 0 };
    
    // Get all user's collections
    const collections = await ctx.db
      .query("collections")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();
    
    let totalCards = 0
    let totalValue = 0
    for (const collection of collections) {
      const summary = await computeCollectionSummaryInternal(ctx, user._id, collection._id)
      totalCards += summary.totalQuantity
      totalValue += summary.estimatedValue
    }

    return {
      totalCards,
      totalValue,
      totalFolders: collections.length
    };
  }
});
