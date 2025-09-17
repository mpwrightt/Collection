import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow, getOrCreateCurrentUser } from "./users";

// Helper: best-effort market price extraction from pricing cache records
function extractMarketPrice(priceDoc: any): number {
  if (!priceDoc) return 0
  const data = (priceDoc as any).data ?? priceDoc
  if (!data) return 0

  const pick = (rec: any): number => {
    if (!rec || typeof rec !== 'object') return 0
    if (typeof rec.marketPrice === 'number') return Number(rec.marketPrice) || 0
    if (typeof rec.midPrice === 'number') return Number(rec.midPrice) || 0
    if (typeof rec.lowPrice === 'number') return Number(rec.lowPrice) || 0
    if (typeof rec.directLowPrice === 'number') return Number(rec.directLowPrice) || 0
    if (typeof rec.highPrice === 'number') return Number(rec.highPrice) || 0
    return 0
  }

  const direct = pick(data)
  if (direct > 0) return direct

  const candidates = Array.isArray((data as any).results)
    ? (data as any).results
    : Array.isArray((data as any).Results)
      ? (data as any).Results
      : []
  if (candidates.length > 0) {
    const normal = candidates.find((r: any) => r?.subTypeName === 'Normal')
    const fromNormal = pick(normal)
    if (fromNormal > 0) return fromNormal
    for (const r of candidates) {
      const val = pick(r)
      if (val > 0) return val
    }
  }
  return 0
}

async function resolveFormatId(ctx: any, tcg: string, code?: string | null) {
  if (!code) return undefined
  const list = await ctx.db
    .query("formats")
    .withIndex("byTcg", (q: any) => q.eq("tcg", tcg))
    .collect()
  const found = list.find((f: any) => (f.code && String(f.code).toLowerCase() === String(code).toLowerCase()) || (f.name && String(f.name).toLowerCase() === String(code).toLowerCase()))
  return found?._id
}

export const listDecks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return [] as any[]

    const decks = await ctx.db
      .query("decks")
      .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
      .collect()

    // Gather counts and lightweight value estimate
    const out: any[] = []
    for (const d of decks) {
      const cards = await ctx.db
        .query("deckCards")
        .withIndex("byDeckId", (q: any) => q.eq("deckId", d._id))
        .collect()

      const counts = { main: 0, sideboard: 0, extra: 0, total: 0 }
      let estimatedValue = 0
      for (const c of cards) {
        const section = (c.section || 'main') as 'main' | 'sideboard' | 'extra'
        counts[section] = (counts as any)[section] + (c.quantity ?? 0)
        counts.total += (c.quantity ?? 0)
        // Price lookup by productId (best-effort)
        const price = await ctx.db
          .query("pricingCache")
          .withIndex("byProductId", (q: any) => q.eq("productId", c.productId))
          .unique()
        const unit = extractMarketPrice(price)
        estimatedValue += (c.quantity ?? 0) * (unit || 0)
      }

      out.push({
        _id: d._id,
        name: d.name,
        tcg: d.tcg,
        formatId: d.formatId ?? null,
        notes: d.notes ?? null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        counts,
        estimatedValue,
      })
    }

    // Sort by updatedAt desc
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return out
  }
})

// Action: Refresh product-level prices for all cards in a deck and upsert into pricing cache
export const refreshDeckPrices = action({
  args: { deckId: v.id("decks") },
  handler: async (ctx, { deckId }) => {
    'use node'
    // Load deck (uses ownership checks in getDeck)
    const data: any = await ctx.runQuery(api.decks.getDeck, { deckId } as any)
    const productIds: number[] = Array.from(
      new Set(
        (data?.cards ?? [])
          .map((c: any) => Number(c.productId))
          .filter((n: any) => Number.isFinite(n) && n > 0)
      )
    )
    if (productIds.length === 0) return { products: 0, upserted: 0 }

    const CHUNK = 100
    const entries: any[] = []
    for (let i = 0; i < productIds.length; i += CHUNK) {
      const chunk = productIds.slice(i, i + CHUNK)
      try {
        const resp: any = await ctx.runAction(api.tcg.getProductPrices, { productIds: chunk })
        const list: any[] = resp?.results || resp?.Results || resp?.data || []
        for (const rec of list) {
          const pid = Number(rec.productId || rec.ProductId)
          if (!pid) continue
          entries.push({ productId: pid, categoryId: 0, currency: 'USD', data: rec })
        }
      } catch (e) {
        // continue on partial failures
      }
      await new Promise((r) => setTimeout(r, 50))
    }

    if (entries.length > 0) {
      await ctx.runMutation(api.pricing.upsertPrices, { entries })
    }

    return { products: productIds.length, upserted: entries.length }
  }
})

export const getDeck = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, { deckId }) => {
    const isDev = (process as any)?.env?.NODE_ENV !== 'production'
    const user = await getCurrentUser(ctx)

    const deck = await ctx.db.get(deckId)
    if (!deck) throw new Error("Deck not found")

    // Enforce ownership when a user exists or in production
    if (user) {
      if (String(deck.userId) !== String(user._id)) throw new Error("Deck not found")
    } else if (!isDev) {
      // In production require auth
      throw new Error("Can't get current user")
    }

    let formatCode: string | null = null
    if (deck.formatId) {
      const fmt = await ctx.db.get(deck.formatId)
      if (fmt?.code) formatCode = String(fmt.code)
      else if (fmt?.name) formatCode = String(fmt.name)
    }

    const cards = await ctx.db
      .query("deckCards")
      .withIndex("byDeckId", (q: any) => q.eq("deckId", deckId))
      .collect()

    return {
      deck: {
        _id: deck._id,
        name: deck.name,
        tcg: deck.tcg,
        formatId: deck.formatId ?? null,
        formatCode,
        notes: deck.notes ?? null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
      cards: cards.map((c: any) => ({
        categoryId: c.categoryId,
        productId: c.productId,
        skuId: c.skuId ?? null,
        quantity: c.quantity,
        section: c.section ?? 'main',
      }))
    }
  }
})

export const saveDeck = mutation({
  args: {
    deckId: v.optional(v.id("decks")),
    name: v.string(),
    tcg: v.string(),
    formatCode: v.optional(v.string()),
    notes: v.optional(v.string()),
    cards: v.array(v.object({
      categoryId: v.number(),
      productId: v.number(),
      skuId: v.optional(v.number()),
      quantity: v.number(),
      section: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { deckId, name, tcg, formatCode, notes, cards }) => {
    const user = await getOrCreateCurrentUser(ctx as any)
    const now = Date.now()

    const formatId = await resolveFormatId(ctx, tcg, formatCode)

    let id = deckId
    if (id) {
      const existing = await ctx.db.get(id)
      if (!existing || String(existing.userId) !== String(user._id)) throw new Error("Deck not found")
      await ctx.db.patch(id, {
        name,
        tcg,
        formatId: formatId ?? undefined,
        notes,
        updatedAt: now,
      })
      // Replace cards fully
      const existingCards = await ctx.db
        .query("deckCards")
        .withIndex("byDeckId", (q: any) => q.eq("deckId", id))
        .collect()
      await Promise.all(existingCards.map((c: any) => ctx.db.delete(c._id)))
    } else {
      id = await ctx.db.insert("decks", {
        userId: user._id,
        name,
        tcg,
        formatId: formatId ?? undefined,
        notes,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Insert cards
    for (const c of cards) {
      await ctx.db.insert("deckCards", {
        deckId: id!,
        categoryId: c.categoryId,
        productId: c.productId,
        skuId: c.skuId,
        quantity: c.quantity,
        section: c.section ?? 'main',
        role: undefined,
        createdAt: now,
        updatedAt: now,
      })
    }

    return id
  }
})

export const deleteDeck = mutation({
  args: { deckId: v.id("decks") },
  handler: async (ctx, { deckId }) => {
    const user = await getCurrentUserOrThrow(ctx)
    const deck = await ctx.db.get(deckId)
    if (!deck || String(deck.userId) !== String(user._id)) throw new Error("Deck not found")

    const cards = await ctx.db
      .query("deckCards")
      .withIndex("byDeckId", (q: any) => q.eq("deckId", deckId))
      .collect()
    await Promise.all(cards.map((c: any) => ctx.db.delete(c._id)))
    await ctx.db.delete(deckId)
  }
})
