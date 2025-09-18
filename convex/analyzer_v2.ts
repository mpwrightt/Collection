import { action } from "./_generated/server"
import { v } from "convex/values"
import { api } from "./_generated/api"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Shared types with minimal coupling to UI
type DeckCard = { productId: number; skuId?: number | null; quantity: number; section?: "main"|"sideboard"|"extra" }
type Holding = { productId: number; skuId?: number | null; quantity: number }

type Stats = { total: number; unique: number; bySection: Record<string, number>; duplicates: Array<{ key: string; quantity: number }> }

function getTargetMainSize(tcg: string, format?: string | null) {
  if (tcg === 'ygo') return 40
  if (tcg === 'mtg' && (format || '').toLowerCase() === 'commander') return 100
  return 60
}

function getDuplicateThreshold(tcg: string, format?: string | null) {
  if (tcg === 'ygo') return 3
  if (tcg === 'pokemon') return Infinity // allow >4 (basic energy etc.)
  if (tcg === 'mtg' && (format || '').toLowerCase() === 'commander') return Infinity // singleton handled elsewhere
  return 4
}

function computeStats(cards: DeckCard[], tcg: string, format?: string | null): Stats {
  const bySection: Record<string, number> = {}
  const byProduct: Record<string, number> = {}
  let total = 0
  let unique = 0

  for (const c of cards) {
    const sec = c.section || 'main'
    bySection[sec] = (bySection[sec] || 0) + (c.quantity || 0)
    total += c.quantity || 0
    const key = `${c.productId}:${c.skuId ?? '_'}`
    if (!(key in byProduct)) unique += 1
    byProduct[key] = (byProduct[key] || 0) + (c.quantity || 0)
  }

  const threshold = getDuplicateThreshold(tcg, format)
  const duplicates = Object.entries(byProduct)
    .filter(([_, q]) => q > threshold)
    .map(([k, q]) => ({ key: k, quantity: q as number }))

  return { total, unique, bySection, duplicates }
}

function deterministicAnalysis(tcg: string, format: string | null | undefined, cards: DeckCard[], holdings?: Holding[]) {
  const stats = computeStats(cards, tcg, format ?? null)
  const target = getTargetMainSize(tcg, format)

  // Holdings lookup for missing calc
  const byHolding = new Map<number, number>()
  for (const h of (holdings ?? [])) byHolding.set(h.productId, (byHolding.get(h.productId) || 0) + (h.quantity || 0))

  let totalMissing = 0
  for (const c of cards) {
    const owned = byHolding.get(c.productId) || 0
    const missing = Math.max(0, (c.quantity || 0) - owned)
    totalMissing += missing
  }

  const strengths: string[] = []
  const weaknesses: string[] = []
  // Size checks
  if (tcg === 'ygo') {
    if (stats.total >= 40 && stats.total <= 60) strengths.push('Proper deck size')
    if (stats.total < 40) weaknesses.push(`Deck too small (${stats.total}/40 cards)`) 
    if (stats.total > 60) weaknesses.push(`Deck too large (${stats.total}/60 max)`) 
  } else if ((format || '').toLowerCase() === 'commander' && tcg === 'mtg') {
    if (stats.total === 100) strengths.push('Proper Commander deck size (100)')
    if (stats.total !== 100) weaknesses.push(`Commander deck must be 100 cards (currently ${stats.total})`)
  } else {
    if (stats.total === target) strengths.push('Proper deck size')
    if (stats.total < target) weaknesses.push(`Deck too small (${stats.total}/${target} cards)`) 
    if (stats.total > target) weaknesses.push(`Deck too large (${stats.total}/${target} target)`) 
  }

  const dupThreshold = getDuplicateThreshold(tcg, format)
  if (dupThreshold < Infinity && stats.duplicates.length > 0) {
    weaknesses.push('Has cards with more than allowed copies')
  }

  const issues: Array<{ type: string; detail: string; productId?: number; severity?: string }> = []
  for (const d of stats.duplicates) {
    if (dupThreshold === Infinity) continue
    const [pidStr] = d.key.split(':')
    const pid = Number(pidStr)
    if (Number.isFinite(pid)) {
      issues.push({ type: 'copies_limit', detail: `Product ${pid} exceeds allowed copies (${d.quantity} > ${dupThreshold})`, productId: pid, severity: 'warning' })
    }
  }

  // Suggestions
  const suggestions: Array<{ change: string; rationale: string; requiresPurchase?: boolean }> = []
  if ((tcg !== 'ygo' && stats.total < target) || (tcg === 'ygo' && stats.total < 40)) {
    suggestions.push({ change: `Add cards to reach ${tcg === 'ygo' ? 40 : target}`, rationale: 'Meet format deck size', requiresPurchase: totalMissing > 0 })
  }
  if (dupThreshold < Infinity && stats.duplicates.length > 0) {
    suggestions.push({ change: `Reduce copies exceeding the ${dupThreshold} limit`, rationale: 'Respect copy limits' })
  }

  const summary = `This is a ${stats.total}-card ${tcg.toUpperCase()}${format ? ` ${format}` : ''} deck with ${stats.unique} unique cards.`

  return { stats, analysis: { summary, strengths, weaknesses }, issues, suggestions }
}

async function aiNarrativeIfAvailable(tcg: string, format: string | null | undefined, base: ReturnType<typeof deterministicAnalysis>) {
  const apiKey = process.env.GOOGLE_API_KEY
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  if (!apiKey) return { model: 'deterministic-v2', ai: base }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.1, maxOutputTokens: 512, candidateCount: 1, responseMimeType: 'application/json' },
      systemInstruction: `Return JSON only with shape {"summary":string,"strengths":string[],"weaknesses":string[]}. No markdown.`
    })
    const prompt = JSON.stringify({ tcg, format: format ?? null, stats: base.stats, analysis: base.analysis, issues: base.issues.slice(0, 10) })
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }]}] })
    let text = ''
    if (typeof result?.response?.text === 'function') text = result.response.text()
    if (!text) {
      const cand = (result as any)?.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || ''
      text = cand
    }
    const json = JSON.parse(text)
    const merged = {
      ...base,
      analysis: {
        summary: typeof json?.summary === 'string' && json.summary.length > 0 ? json.summary : base.analysis.summary,
        strengths: Array.isArray(json?.strengths) ? json.strengths : base.analysis.strengths,
        weaknesses: Array.isArray(json?.weaknesses) ? json.weaknesses : base.analysis.weaknesses,
      }
    }
    return { model: `gemini:${modelName}`, ai: merged }
  } catch (e) {
    return { model: 'deterministic-v2', ai: base }
  }
}

export const analyzeDeckV2 = action({
  args: {
    tcg: v.string(),
    format: v.optional(v.string()),
    deck: v.object({ name: v.optional(v.string()), cards: v.array(v.object({ productId: v.number(), skuId: v.optional(v.number()), quantity: v.number(), section: v.optional(v.string()) })) }),
    holdings: v.optional(v.array(v.object({ productId: v.number(), skuId: v.optional(v.number()), quantity: v.number() }))),
    includeAI: v.optional(v.boolean()),
  },
  handler: async (ctx, { tcg, format, deck, holdings, includeAI }) => {
    'use node'

    const cards = deck.cards as DeckCard[]
    const base = deterministicAnalysis(tcg, format ?? null, cards, holdings as Holding[] | undefined)

    // Integrate format legality checks if available
    try {
      if (format) {
        const legality = await ctx.runAction(api.formats.validateDeckLegality, {
          tcg,
          formatCode: format,
          cards: cards.map(c => ({ productId: c.productId, quantity: c.quantity }))
        } as any)
        const legalIssues: Array<{ productId: number; type: string; detail: string }> = legality?.issues || []
        for (const iss of legalIssues) {
          base.issues.push({ type: iss.type, detail: iss.detail, productId: iss.productId, severity: 'error' })
        }
      }
    } catch {}

    if (includeAI) {
      const res = await aiNarrativeIfAvailable(tcg, format ?? null, base)
      return { model: res.model, stats: base.stats, ai: { ...res.ai, stats: base.stats, raw: res.model } }
    }

    return { model: 'deterministic-v2', stats: base.stats, ai: { ...base, stats: base.stats, raw: 'deterministic' } }
  }
})
