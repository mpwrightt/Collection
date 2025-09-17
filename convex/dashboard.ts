import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { totalCards: 0, distinctProducts: 0, collectionsCount: 0, decksCount: 0, portfolioValue: 0 };

    const [items, collections, decks] = await Promise.all([
      ctx.db.query("collectionItems").withIndex("byUserId", q => q.eq("userId", user._id)).collect(),
      ctx.db.query("collections").withIndex("byUserId", q => q.eq("userId", user._id)).collect(),
      ctx.db.query("decks").withIndex("byUserId", q => q.eq("userId", user._id)).collect(),
    ]);

    const totalCards = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
    const distinctProducts = new Set(items.map(it => `${it.productId}:${it.skuId ?? "_"}`)).size;
    const collectionsCount = collections.length;
    const decksCount = decks.length;

    // Best-effort portfolio value using pricingCache if available
    let portfolioValue = 0;
    for (const it of items) {
      const price = await ctx.db
        .query("pricingCache")
        .withIndex("byProductId", q => q.eq("productId", it.productId))
        .unique();
      let market = 0;
      if (price?.data) {
        // Try common shapes
        if (typeof (price as any).data?.marketPrice === 'number') {
          market = (price as any).data.marketPrice;
        } else if (Array.isArray((price as any).data?.results) && (price as any).data.results[0]?.marketPrice) {
          market = Number((price as any).data.results[0].marketPrice) || 0;
        } else if (Array.isArray((price as any).data?.Results) && (price as any).data.Results[0]?.marketPrice) {
          market = Number((price as any).data.Results[0].marketPrice) || 0;
        }
      }
      portfolioValue += (it.quantity ?? 0) * market;
    }

    return { totalCards, distinctProducts, collectionsCount, decksCount, portfolioValue };
  }
});

export const getItemsTimeSeries = query({
  args: { rangeDays: v.number() },
  handler: async (ctx, { rangeDays }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [] as { date: string; added: number }[];
    const now = Date.now();
    const start = now - rangeDays * 24 * 60 * 60 * 1000;
    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();
    const buckets = new Map<string, number>();
    for (const it of items) {
      const t = it.createdAt ?? it._creationTime;
      if (t < start) continue;
      const day = new Date(new Date(t).toDateString())
        .toISOString()
        .slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + (it.quantity ?? 0));
    }
    const out: { date: string; added: number }[] = [];
    for (
      let d = new Date(new Date(start).toDateString());
      d <= new Date(now);
      d.setDate(d.getDate() + 1)
    ) {
      const day = new Date(d).toISOString().slice(0, 10);
      out.push({ date: day, added: buckets.get(day) ?? 0 });
    }
    return out;
  },
});

export const getHoldings = query({
  args: { limit: v.optional(v.number()), offset: v.optional(v.number()) },
  handler: async (ctx, { limit = 20, offset = 0 }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { rows: [], total: 0 };

    const items = await ctx.db
      .query("collectionItems")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    // Aggregate by productId:skuId
    const agg = new Map<string, {
      productId: number
      skuId?: number
      quantity: number
      lastAt: number
      anyCollectionId?: any
      categoryId?: number
    }>();
    for (const it of items) {
      const key = `${it.productId}:${it.skuId ?? '_'}`;
      const prev = agg.get(key);
      const t = it.createdAt ?? it._creationTime;
      if (!prev) {
        agg.set(key, {
          productId: it.productId,
          skuId: it.skuId ?? undefined,
          quantity: it.quantity ?? 0,
          lastAt: t,
          anyCollectionId: it.collectionId,
          categoryId: it.categoryId,
        });
      } else {
        prev.quantity += it.quantity ?? 0;
        prev.lastAt = Math.max(prev.lastAt, t);
        prev.anyCollectionId = prev.anyCollectionId ?? it.collectionId;
        if (!prev.categoryId && it.categoryId) {
          prev.categoryId = it.categoryId;
        }
      }
    }

    const keys = Array.from(agg.keys());
    const total = keys.length;
    const slice = keys.slice(offset, offset + limit);

    const rows = await Promise.all(
      slice.map(async (key) => {
        const { productId, skuId, quantity, lastAt, anyCollectionId, categoryId } = agg.get(key)!;
        let collectionName: string | null = null;
        if (anyCollectionId) {
          const c = (await ctx.db.get(anyCollectionId as any)) as any;
          collectionName = c?.name ?? null;
        }
        let marketPrice = 0;
        const price = await ctx.db
          .query("pricingCache")
          .withIndex("byProductId", (q) => q.eq("productId", productId))
          .unique();
        if (price?.data) {
          if (typeof (price as any).data?.marketPrice === 'number') {
            marketPrice = (price as any).data.marketPrice;
          } else if (Array.isArray((price as any).data?.results) && (price as any).data.results[0]?.marketPrice) {
            marketPrice = Number((price as any).data.results[0].marketPrice) || 0;
          } else if (Array.isArray((price as any).data?.Results) && (price as any).data.Results[0]?.marketPrice) {
            marketPrice = Number((price as any).data.Results[0].marketPrice) || 0;
          }
        }
        const totalValue = marketPrice * (quantity ?? 0);
        return {
          id: key,
          productId,
          skuId: skuId ?? null,
          quantity,
          collection: collectionName ?? 'Unassigned',
          marketPrice,
          totalValue,
          addedAt: lastAt,
          categoryId: categoryId ?? null,
        };
      })
    );

    // Sort by totalValue desc by default
    rows.sort((a, b) => b.totalValue - a.totalValue);
    return { rows, total };
  },
});

export const getRecentItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [] as any[];

    const items = await ctx
      .db
      .query("collectionItems")
      .withIndex("byUserId", q => q.eq("userId", user._id))
      .collect();

    // Enrich with collection name
    const out = await Promise.all(items.map(async it => {
      let collectionName: string | null = null;
      if (it.collectionId) {
        const c = await ctx.db.get(it.collectionId);
        collectionName = c?.name ?? null;
      }
      return {
        _id: it._id,
        createdAt: it.createdAt,
        productId: it.productId,
        skuId: it.skuId ?? null,
        quantity: it.quantity,
        collectionName,
        categoryId: it.categoryId,
      };
    }));

    out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return out.slice(0, limit ?? 10);
  }
});
