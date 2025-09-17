import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
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

  // Helper to pick best available price from a record
  const pick = (rec: any): number => {
    if (!rec || typeof rec !== 'object') return 0
    if (typeof rec.marketPrice === 'number') return Number(rec.marketPrice) || 0
    if (typeof rec.midPrice === 'number') return Number(rec.midPrice) || 0
    if (typeof rec.lowPrice === 'number') return Number(rec.lowPrice) || 0
    if (typeof rec.directLowPrice === 'number') return Number(rec.directLowPrice) || 0
    if (typeof rec.highPrice === 'number') return Number(rec.highPrice) || 0
    return 0
  }

  // Direct object shape (product-level or sku-level)
  const direct = pick(data)
  if (direct > 0) return direct

  // Array shapes from API responses
  const candidates = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.Results)
      ? data.Results
      : []
  if (candidates.length > 0) {
    // Prefer Normal subtype when available
    const normal = candidates.find((r: any) => r?.subTypeName === 'Normal')
    const fromNormal = pick(normal)
    if (fromNormal > 0) return fromNormal
    // Fallback to any entry with a price
    for (const r of candidates) {
      const val = pick(r)
      if (val > 0) return val
    }
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

  // Pricing: prefer per-item effectivePrice if stored; otherwise use SKU-first cache lookup
  let estimatedValue = 0
  for (const item of mine) {
    const qty = item.quantity ?? 0
    let unit = typeof item.effectivePrice === 'number' ? item.effectivePrice : undefined
    if (typeof unit !== 'number' || !(unit > 0)) {
      unit = await getMarketPriceForKey(item.productId, item.skuId)
    }
    estimatedValue += qty * (unit || 0)
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
    effectivePrice: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, { itemId, quantity, condition, skuId, notes, acquiredPrice, effectivePrice, priceUpdatedAt }) => {
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
    if (typeof effectivePrice === 'number') patch.effectivePrice = effectivePrice;
    if (typeof priceUpdatedAt === 'number') patch.priceUpdatedAt = priceUpdatedAt;
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

// Action: Auto refresh all SKU-level pricing and recompute summaries
export const refreshAllPricesAndSummaries = action({
  args: {},
  handler: async (ctx) => {
    'use node'
    // Load all collections and their items
    const collections: any[] = (await ctx.runQuery(api.collections.listCollections, {} as any)) as any[]
    const itemsLists: any[] = await Promise.all([
      ...collections.map(c => ctx.runQuery(api.collections.listItems, { collectionId: c._id } as any)),
      ctx.runQuery(api.collections.listItems, {} as any), // unassigned
    ])
    const items: any[] = ([] as any[]).concat(...itemsLists.map(x => x as any[]))

    const productIds = Array.from(new Set(items.map(i => Number(i.productId)).filter(n => Number.isFinite(n) && n > 0)))
    if (productIds.length === 0) {
      // Still ensure summaries are persisted
      await Promise.all(collections.map(c => ctx.runMutation(api.collections.refreshCollectionSummary, { collectionId: c._id })))
      return { collections: collections.length, items: 0, backfilled: 0, pricedSkus: 0 }
    }

    // Fetch SKUs for products
    const skusResp: any = await ctx.runAction(api.tcg.getSkus, { productIds })
    const skus: any[] = skusResp?.results || skusResp?.Results || skusResp?.data || []
    const skuMap = new Map<number, any[]>()
    const skuIds: number[] = []
    const skuIdToProductId = new Map<number, number>()
    for (const sku of skus) {
      const pid = Number(sku.productId)
      if (!skuMap.has(pid)) skuMap.set(pid, [])
      skuMap.get(pid)!.push(sku)
      const sid = Number(sku.skuId || sku.productConditionId)
      if (sid) { skuIds.push(sid); skuIdToProductId.set(sid, pid) }
    }

    // Fetch SKU prices (primary)
    let skuPricesList: any[] = []
    if (skuIds.length > 0) {
      const skuPrices: any = await ctx.runAction(api.tcg.getSkuPrices, { skuIds })
      skuPricesList = skuPrices?.results || skuPrices?.Results || skuPrices?.data || []
    }

    // Fetch product prices (fallback)
    const prodPrices: any = await ctx.runAction(api.tcg.getProductPrices, { productIds })
    const prodPriceList: any[] = prodPrices?.results || prodPrices?.Results || prodPrices?.data || []

    // Upsert cache
    const entries: any[] = []
    for (const rec of prodPriceList) {
      const pid = Number(rec.productId || rec.ProductId)
      if (!pid) continue
      entries.push({ productId: pid, categoryId: 0, currency: 'USD', data: rec })
    }
    for (const sp of skuPricesList) {
      const sid = Number(sp.skuId || sp.SkuId || sp.productConditionId)
      const pid = sid ? (skuIdToProductId.get(sid) || Number(sp.productId || sp.ProductId)) : undefined
      if (pid && sid) entries.push({ productId: Number(pid), skuId: Number(sid), categoryId: 0, currency: 'USD', data: sp })
    }
    if (entries.length > 0) await ctx.runMutation(api.pricing.upsertPrices, { entries })

    // Backfill skuId for items missing it, based on condition
    const CONDITION_ID: Record<string, number> = { NM: 1, LP: 2, MP: 3, HP: 4, DMG: 5 }
    let backfilled = 0
    for (const it of items) {
      if (it.skuId) continue
      const list = skuMap.get(Number(it.productId)) || []
      const targetId = CONDITION_ID[String(it.condition || 'NM')] || 1
      const match = list.find((s: any) => Number(s.conditionId) === targetId)
      if (match?.skuId) {
        await ctx.runMutation(api.collections.updateItemFields, { itemId: it._id, skuId: Number(match.skuId) })
        backfilled++
      }
    }

    // Refresh summaries to persist current numbers (optional but useful)
    await Promise.all(collections.map(c => ctx.runMutation(api.collections.refreshCollectionSummary, { collectionId: c._id })))

    return { collections: collections.length, items: items.length, backfilled, pricedSkus: skuPricesList.length }
  }
})

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
    // If parentId is undefined, return ALL collections (both top-level and nested).
    // Otherwise, filter to direct children of the specified parent.
    const filtered = (typeof parentId === 'undefined')
      ? cols
      : cols.filter(c => c.parentId === parentId);
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

// Calculate collection grade based on card conditions and value
export const calculateCollectionGrade = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 'C';

    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byCollectionId", (q: any) => q.eq("collectionId", collectionId))
      .collect();

    const userItems = items.filter((item: any) => String(item.userId) === String(user._id));

    if (userItems.length === 0) return 'C';

    // Calculate condition distribution
    const conditionCounts = new Map<string, number>();
    let totalQuantity = 0;
    let totalValue = 0;

    for (const item of userItems) {
      const condition = item.condition || 'NM';
      const quantity = item.quantity || 0;
      const price = item.effectivePrice || 0;

      conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + quantity);
      totalQuantity += quantity;
      totalValue += price * quantity;
    }

    // Calculate condition percentages
    const nmPercentage = ((conditionCounts.get('NM') || 0) / totalQuantity) * 100;
    const lpPercentage = ((conditionCounts.get('LP') || 0) / totalQuantity) * 100;
    const mpPercentage = ((conditionCounts.get('MP') || 0) / totalQuantity) * 100;
    const hpPercentage = ((conditionCounts.get('HP') || 0) / totalQuantity) * 100;
    const dmgPercentage = ((conditionCounts.get('DMG') || 0) / totalQuantity) * 100;

    const averageValue = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    // Grade calculation logic
    // S Grade: 80%+ NM, high average value (>$50), total value >$5000
    if (nmPercentage >= 80 && averageValue >= 50 && totalValue >= 5000) {
      return 'S';
    }

    // A Grade: 60%+ NM or 80%+ NM+LP, good average value (>$20), total value >$1000
    if ((nmPercentage >= 60 || (nmPercentage + lpPercentage) >= 80) && averageValue >= 20 && totalValue >= 1000) {
      return 'A';
    }

    // B Grade: 40%+ NM or 60%+ NM+LP, decent average value (>$5), total value >$500
    if ((nmPercentage >= 40 || (nmPercentage + lpPercentage) >= 60) && averageValue >= 5 && totalValue >= 500) {
      return 'B';
    }

    // C Grade: Everything else
    return 'C';
  },
});
