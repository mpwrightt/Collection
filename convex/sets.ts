import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow, getOrCreateCurrentUser } from "./users";

// Create a new set/expansion
export const createSet = mutation({
  args: {
    categoryId: v.number(),
    setId: v.string(),
    name: v.string(),
    abbreviation: v.optional(v.string()),
    totalCards: v.number(),
    releaseDate: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("sets", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Add a card to a set
export const addCardToSet = mutation({
  args: {
    setId: v.string(),
    cardNumber: v.string(),
    productId: v.number(),
    name: v.string(),
    rarity: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("setCards", {
      ...args,
      priceUpdatedAt: args.estimatedPrice ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Create a collection target (what set a collection is trying to complete)
export const createCollectionTarget = mutation({
  args: {
    collectionId: v.id("collections"),
    setId: v.string(),
    targetType: v.string(),
    targetCards: v.optional(v.array(v.string())),
    priority: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    // Verify the collection belongs to the user
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== user._id) {
      throw new Error("Collection not found or not owned by user");
    }

    const id = await ctx.db.insert("collectionTargets", {
      userId: user._id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// List available sets
export const listSets = query({
  args: { categoryId: v.optional(v.number()) },
  handler: async (ctx, { categoryId }) => {
    if (categoryId) {
      return await ctx.db
        .query("sets")
        .withIndex("byCategoryId", q => q.eq("categoryId", categoryId))
        .collect();
    } else {
      return await ctx.db.query("sets").collect();
    }
  },
});

// Get set details with cards
export const getSetWithCards = query({
  args: { setId: v.string() },
  handler: async (ctx, { setId }) => {
    const set = await ctx.db
      .query("sets")
      .withIndex("bySetId", q => q.eq("setId", setId))
      .first();

    if (!set) return null;

    const cards = await ctx.db
      .query("setCards")
      .withIndex("bySetId", q => q.eq("setId", setId))
      .collect();

    return { ...set, cards };
  },
});

// Calculate completion percentage for a collection
export const calculateCollectionCompletion = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Get the collection target
    const target = await ctx.db
      .query("collectionTargets")
      .withIndex("byCollectionId", q => q.eq("collectionId", collectionId))
      .first();

    if (!target) return null;

    // Get set information
    const set = await ctx.db
      .query("sets")
      .withIndex("bySetId", q => q.eq("setId", target.setId))
      .first();

    if (!set) return null;

    // Get all cards in the set
    const setCards = await ctx.db
      .query("setCards")
      .withIndex("bySetId", q => q.eq("setId", target.setId))
      .collect();

    // Get user's collection items for this collection
    const userItems = await ctx.db
      .query("collectionItems")
      .withIndex("byCollectionId", q => q.eq("collectionId", collectionId))
      .collect();

    // Create a map of owned product IDs for quick lookup
    const ownedProductIds = new Set(userItems.map(item => item.productId));

    // Determine which cards we're trying to complete
    let targetCardNumbers: string[];
    if (target.targetType === "complete") {
      targetCardNumbers = setCards.map(card => card.cardNumber);
    } else if (target.targetType === "custom" && target.targetCards) {
      targetCardNumbers = target.targetCards;
    } else {
      // For other target types like "holos_only", "rares_only"
      targetCardNumbers = setCards
        .filter(card => {
          if (target.targetType === "holos_only") {
            return card.rarity?.toLowerCase().includes("holo") ||
                   card.rarity?.toLowerCase().includes("rare");
          }
          if (target.targetType === "rares_only") {
            return card.rarity?.toLowerCase().includes("rare");
          }
          return true;
        })
        .map(card => card.cardNumber);
    }

    // Calculate owned vs target
    const targetCards = setCards.filter(card => targetCardNumbers.includes(card.cardNumber));
    const ownedTargetCards = targetCards.filter(card => ownedProductIds.has(card.productId));

    // Calculate pricing information
    let totalValue = 0;
    let ownedValue = 0;
    let missingValue = 0;

    for (const card of targetCards) {
      const price = card.estimatedPrice || 0;
      totalValue += price;

      if (ownedProductIds.has(card.productId)) {
        ownedValue += price;
      } else {
        missingValue += price;
      }
    }

    const completionPercentage = targetCards.length > 0
      ? (ownedTargetCards.length / targetCards.length) * 100
      : 0;

    return {
      setId: target.setId,
      setName: set.name,
      targetType: target.targetType,
      totalCards: targetCards.length,
      ownedCards: ownedTargetCards.length,
      missingCards: targetCards.length - ownedTargetCards.length,
      completionPercentage,
      totalValue,
      ownedValue,
      missingValue,
      missingCardsList: targetCards
        .filter(card => !ownedProductIds.has(card.productId))
        .map(card => ({
          cardNumber: card.cardNumber,
          name: card.name,
          rarity: card.rarity,
          estimatedPrice: card.estimatedPrice || 0,
          productId: card.productId
        }))
    };
  },
});

// Get collection targets for a user
export const getUserCollectionTargets = query({
  args: { collectionId: v.optional(v.id("collections")) },
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let query = ctx.db
      .query("collectionTargets")
      .withIndex("byUserId", q => q.eq("userId", user._id));

    const targets = await query.collect();

    if (collectionId) {
      return targets.filter(t => t.collectionId === collectionId);
    }

    return targets;
  },
});

// Update card pricing for a set
export const updateSetCardPricing = mutation({
  args: {
    setId: v.string(),
    cardPricing: v.array(v.object({
      productId: v.number(),
      estimatedPrice: v.number(),
    })),
  },
  handler: async (ctx, { setId, cardPricing }) => {
    const now = Date.now();

    for (const { productId, estimatedPrice } of cardPricing) {
      const card = await ctx.db
        .query("setCards")
        .withIndex("byProductId", q => q.eq("productId", productId))
        .first();

      if (card && card.setId === setId) {
        await ctx.db.patch(card._id, {
          estimatedPrice,
          priceUpdatedAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// Bulk import set cards from TCGPlayer data
export const importSetCards = mutation({
  args: {
    setId: v.string(),
    cards: v.array(v.object({
      cardNumber: v.string(),
      productId: v.number(),
      name: v.string(),
      rarity: v.optional(v.string()),
      category: v.optional(v.string()),
      estimatedPrice: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { setId, cards }) => {
    const now = Date.now();

    for (const card of cards) {
      // Check if card already exists
      const existing = await ctx.db
        .query("setCards")
        .withIndex("bySetCardNumber", q =>
          q.eq("setId", setId).eq("cardNumber", card.cardNumber)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("setCards", {
          setId,
          ...card,
          priceUpdatedAt: card.estimatedPrice ? now : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});