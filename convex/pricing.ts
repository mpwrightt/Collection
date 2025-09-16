import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Bulk upsert pricing records into pricingCache.
// This cache is global (not per-user) and is read by various summary queries.
export const upsertPrices = mutation({
  args: {
    entries: v.array(v.object({
      productId: v.number(),
      skuId: v.optional(v.number()),
      categoryId: v.number(),
      currency: v.optional(v.string()),
      data: v.any(),
    })),
  },
  handler: async (ctx, { entries }) => {
    const now = Date.now();
    for (const e of entries) {
      // Try to find existing record by productId (+ optional skuId)
      let existing = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", (q) => q.eq("productId", e.productId))
        .unique();

      if (!existing && e.skuId !== undefined) {
        existing = await ctx.db
          .query("pricingCache")
          .withIndex("byProductSku", (q) => q.eq("productId", e.productId).eq("skuId", e.skuId!))
          .unique();
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          categoryId: e.categoryId,
          currency: e.currency ?? existing.currency ?? "USD",
          data: e.data,
          lastFetchedAt: now,
        });
      } else {
        await ctx.db.insert("pricingCache", {
          productId: e.productId,
          skuId: e.skuId,
          categoryId: e.categoryId,
          currency: e.currency ?? "USD",
          data: e.data,
          lastFetchedAt: now,
        });
      }
    }
  },
});

// Read cached prices for a list of products
export const getPricingForProducts = query({
  args: { productIds: v.array(v.number()) },
  handler: async (ctx, { productIds }) => {
    const out: { productId: number; data: any }[] = [];
    for (const pid of productIds) {
      const rec = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", (q) => q.eq("productId", pid))
        .unique();
      if (rec) out.push({ productId: pid, data: rec.data });
    }
    return out;
  },
});
