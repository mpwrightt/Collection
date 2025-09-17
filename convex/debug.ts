import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// Debug function to add pricing for user's actual cards
export const addPricingForUserCards = mutation({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Get user's items in this collection
    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byCollectionId", q => q.eq("collectionId", collectionId))
      .collect();

    console.log(`Found ${items.length} items in collection`);

    // Get unique product IDs
    const uniqueProductIds = [...new Set(items.map(item => item.productId))];

    // Create pricing entries for each unique product
    const pricingEntries = uniqueProductIds.map(productId => ({
      productId,
      categoryId: 3, // Pokemon
      currency: "USD",
      data: {
        marketPrice: Math.floor(Math.random() * 50) + 5, // $5-$55
        results: [{
          subTypeName: "Normal",
          marketPrice: Math.floor(Math.random() * 50) + 5,
          lowPrice: Math.floor(Math.random() * 30) + 2,
          midPrice: Math.floor(Math.random() * 40) + 3,
          highPrice: Math.floor(Math.random() * 60) + 10,
          directLowPrice: Math.floor(Math.random() * 25) + 1
        }]
      }
    }));

    // Insert pricing cache entries
    const now = Date.now();
    for (const entry of pricingEntries) {
      // Check if pricing already exists
      const existing = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", q => q.eq("productId", entry.productId))
        .first();

      if (!existing) {
        await ctx.db.insert("pricingCache", {
          productId: entry.productId,
          categoryId: entry.categoryId,
          currency: entry.currency,
          data: entry.data,
          lastFetchedAt: now,
        });
      }
    }

    return {
      success: true,
      itemsFound: items.length,
      uniqueProducts: uniqueProductIds.length,
      pricingEntriesCreated: pricingEntries.length,
      productIds: uniqueProductIds
    };
  },
});

// Debug function to see what's in the collection
export const debugCollection = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byCollectionId", q => q.eq("collectionId", collectionId))
      .collect();

    const uniqueProductIds = [...new Set(items.map(item => item.productId))];

    // Check which have pricing
    const pricingData = [];
    for (const productId of uniqueProductIds) {
      const pricing = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", q => q.eq("productId", productId))
        .first();
      pricingData.push({ productId, hasPricing: !!pricing });
    }

    return {
      collectionId,
      totalItems: items.length,
      uniqueProducts: uniqueProductIds.length,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        categoryId: item.categoryId
      })),
      pricingData
    };
  },
});