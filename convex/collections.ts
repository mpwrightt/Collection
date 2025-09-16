import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow, getOrCreateCurrentUser } from "./users";

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

// Summary stats for a single collection (quantity, distinct products, estimated value)
export const collectionSummary = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { totalQuantity: 0, distinctProducts: 0, estimatedValue: 0 };
    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();
    const mine = items.filter((i) => i.collectionId === collectionId);
    const totalQuantity = mine.reduce((s, it) => s + (it.quantity ?? 0), 0);
    const distinctProducts = new Set(mine.map((it) => `${it.productId}:${it.skuId ?? "_"}`)).size;
    // Best-effort value from pricingCache
    let estimatedValue = 0;
    for (const it of mine) {
      const price = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", (q) => q.eq("productId", it.productId))
        .unique();
      let market = 0;
      if (price?.data) {
        if (typeof (price as any).data?.marketPrice === 'number') {
          market = (price as any).data.marketPrice;
        } else if (Array.isArray((price as any).data?.results) && (price as any).data.results[0]?.marketPrice) {
          market = Number((price as any).data.results[0].marketPrice) || 0;
        } else if (Array.isArray((price as any).data?.Results) && (price as any).data.Results[0]?.marketPrice) {
          market = Number((price as any).data.Results[0].marketPrice) || 0;
        }
      }
      estimatedValue += (it.quantity ?? 0) * market;
    }
    return { totalQuantity, distinctProducts, estimatedValue };
  }
});
