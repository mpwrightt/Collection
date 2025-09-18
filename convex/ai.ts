import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

type DeckCard = {
  productId: number;
  skuId?: number;
  quantity: number;
  section?: string; // e.g., "main", "sideboard", "extra"
};

type Holding = {
  productId: number;
  skuId?: number;
  quantity: number;
};

function getTargetMainSize(tcg: string, format?: string | null) {
  if (tcg === 'ygo') return 40;
  if (tcg === 'mtg' && (format || '').toLowerCase() === 'commander') return 100;
  return 60; // mtg/pokemon default
}

function computeStats(cards: DeckCard[], tcg: string, format?: string | null) {
  const bySection: Record<string, number> = {};
  let total = 0;
  let unique = 0;
  const byProduct: Record<string, number> = {};

  for (const c of cards) {
    const sec = c.section || "main";
    bySection[sec] = (bySection[sec] || 0) + c.quantity;
    total += c.quantity;
    const key = `${c.productId}:${c.skuId ?? "_"}`;
    if (!byProduct[key]) unique += 1;
    byProduct[key] = (byProduct[key] || 0) + c.quantity;
  }

  // Heuristic duplicate flagging by TCG. Avoid false positives for Pokemon (basic energy) and MTG Commander.
  let duplicateThreshold = 4;
  if (tcg === 'ygo') duplicateThreshold = 3;
  if (tcg === 'pokemon') duplicateThreshold = Number.POSITIVE_INFINITY; // skip
  if (tcg === 'mtg' && (format || '').toLowerCase() === 'commander') duplicateThreshold = Number.POSITIVE_INFINITY; // skip

  const duplicates = Object.entries(byProduct)
    .filter(([_, q]) => q > duplicateThreshold)
    .map(([k, q]) => ({ key: k, quantity: q }));

  return { total, unique, bySection, duplicates };
}

function extractFirstJson(text: string): any | null {
  if (!text || typeof text !== 'string') return null;

  console.log("Extracting JSON from:", text.substring(0, 100)); // Debug

  // Try direct parsing first
  try {
    const parsed = JSON.parse(text.trim());
    console.log("Direct parse successful");
    return parsed;
  } catch (e) {
    console.log("Direct parse failed:", e instanceof Error ? e.message : String(e));
  }

  // Remove common AI response prefixes/suffixes
  let cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^Here's the JSON:/i, '')
    .replace(/^Analysis:/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    console.log("Cleaned parse successful");
    return parsed;
  } catch (e) {
    console.log("Cleaned parse failed:", e instanceof Error ? e.message : String(e));
  }

  // Find JSON object boundaries
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    const candidate = cleaned.substring(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      console.log("Boundary parse successful");
      return parsed;
    } catch (e) {
      console.log("Boundary parse failed:", e instanceof Error ? e.message : String(e));
    }
  }

  console.log("All parsing attempts failed");
  return null;
}

export const analyzeDeck = action({
  args: {
    tcg: v.string(),
    format: v.optional(v.string()),
    deck: v.object({
      name: v.optional(v.string()),
      cards: v.array(
        v.object({
          productId: v.number(),
          skuId: v.optional(v.number()),
          quantity: v.number(),
          section: v.optional(v.string()),
        })
      ),
    }),
    holdings: v.optional(
      v.array(
        v.object({
          productId: v.number(),
          skuId: v.optional(v.number()),
          quantity: v.number(),
        })
      )
    ),
    // Accept but ignore to remain compatible with analyzer_v2 callers
    includeAI: v.optional(v.boolean()),
  },
  handler: async (ctx, { tcg, format, deck, holdings }) => {
    "use node";

    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // Faster model for better performance

    console.log("API Key exists:", !!apiKey);
    console.log("Model name:", modelName);

    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY environment variable.");
    }

    const stats = computeStats(deck.cards as DeckCard[], tcg, format ?? null);

    // Optimized payload - reduce data size for faster processing
    const deckCards = (deck.cards as DeckCard[]).slice(0, 500);

    // Group cards by productId for more efficient analysis
    const cardSummary = deckCards.reduce((acc, card) => {
      const key = card.productId;
      if (!acc[key]) {
        acc[key] = { productId: card.productId, totalQuantity: 0, sections: [] };
      }
      acc[key].totalQuantity += card.quantity;
      if (!acc[key].sections.includes(card.section || 'main')) {
        acc[key].sections.push(card.section || 'main');
      }
      return acc;
    }, {} as Record<number, { productId: number; totalQuantity: number; sections: string[] }>);

    // Optimize holdings - only include high-value summary
    const holdingsSummary = (holdings as Holding[] | undefined)?.slice(0, 100)
      .filter(h => h.quantity > 0)
      .map(h => ({ productId: h.productId, quantity: h.quantity })) ?? [];

    const payload = {
      tcg,
      format: format ?? null,
      deck: {
        name: deck.name ?? "Untitled Deck",
        stats,
        uniqueCards: Object.values(cardSummary).length,
        cardSummary: Object.values(cardSummary).slice(0, 100), // Limit for performance
      },
      holdings: holdingsSummary,
    };

    const systemInstructions = `Analyze this ${tcg}${format ? ` ${format}` : ''} deck and respond with JSON only. Do not include any markdown, explanations, or other text.

JSON format:
{
  "analysis": {
    "summary": "Brief analysis",
    "strengths": ["str1", "str2"],
    "weaknesses": ["weak1", "weak2"]
  },
  "issues": [],
  "suggestions": [
    {"change": "suggestion", "rationale": "reason", "requiresPurchase": false}
  ],
  "stats": {"bySection": {}, "total": 0, "unique": 0}
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstructions,
      generationConfig: {
        temperature: 0.0, // Max consistency
        maxOutputTokens: 1024,
        candidateCount: 1,
        topP: 1,
        topK: 1,
        responseMimeType: "application/json",
      },
    });

    const promptData = JSON.stringify(payload); // Compact JSON
    console.log("Sending prompt to AI:", `${promptData.substring(0, 200)}...`); // Debug

    let result: any;
    try {
      // Add a timeout so we don't hang forever
      const withTimeout = <T>(p: Promise<T>, ms: number) => new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
      });
      result = await withTimeout(model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptData }] }],
      }), 15000);
    } catch (err: any) {
      console.error("AI generateContent failed:", err?.message || String(err));
      const fallbackAi = {
        analysis: {
          summary: `This is a ${stats.total}-card ${tcg.toUpperCase()}${format ? ` ${format}` : ''} deck with ${stats.unique} unique cards.`,
          strengths: (() => {
            const target = getTargetMainSize(tcg, format)
            const okSize = stats.total === target || (tcg === 'ygo' && stats.total >= 40 && stats.total <= 60)
            const arr: string[] = []
            if (okSize) arr.push('Proper deck size')
            return arr
          })(),
          weaknesses: (() => {
            const target = getTargetMainSize(tcg, format)
            const arr: string[] = []
            if (tcg === 'ygo') {
              if (stats.total < 40) arr.push(`Deck too small (${stats.total}/40 cards)`) 
              if (stats.total > 60) arr.push(`Deck too large (${stats.total}/60 max)`) 
            } else {
              if (stats.total < target) arr.push(`Deck too small (${stats.total}/${target} cards)`) 
              if (stats.total > target && (tcg !== 'mtg' || (format || '').toLowerCase() !== 'commander')) arr.push(`Deck too large (${stats.total}/${target} target)`) 
            }
            // Only mention duplicates when threshold is active
            const dupThreshold = (tcg === 'ygo') ? 3 : (tcg === 'pokemon' ? Infinity : ((format || '').toLowerCase() === 'commander' ? Infinity : 4))
            if (dupThreshold < Infinity && stats.duplicates.length > 0) arr.push('Has cards with more than allowed copies')
            return arr
          })()
        },
        issues: [{ type: "API_ERROR", detail: err?.message || "AI call failed", severity: "warning" }],
        suggestions: (() => {
          const target = getTargetMainSize(tcg, format)
          const sugg: any[] = []
          if ((tcg !== 'ygo' && stats.total < target) || (tcg === 'ygo' && stats.total < 40)) {
            sugg.push({ change: `Add more cards to reach ${tcg === 'ygo' ? 40 : target}`, rationale: 'Format deck size', requiresPurchase: true })
          }
          return sugg
        })(),
        stats,
        raw: "AI call failed"
      };
      return { model: modelName, stats, ai: fallbackAi };
    }

    console.log("AI Response object:", JSON.stringify(result, null, 2)); // Debug full response

    let text = "";
    if (typeof result?.response?.text === "function") {
      try {
        text = result.response.text();
      } catch (e) {
        console.log("Error calling text() function:", e);
      }
    }

    if (!text) {
      // Try alternative response extraction
      const candidates = (result as any)?.response?.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (parts && Array.isArray(parts)) {
          text = parts.map((p: any) => p.text || "").join("\n");
        }
      }
    }

    console.log("AI Raw Response:", text); // Debug logging
    console.log("Response length:", text.length);

    // If no response at all, provide a basic analysis fallback
    if (!text || text.trim().length === 0) {
      const fallbackAi = {
        analysis: {
          summary: `This is a ${stats.total}-card ${tcg.toUpperCase()}${format ? ` ${format}` : ''} deck with ${stats.unique} unique cards.`,
          strengths: (() => {
            const target = getTargetMainSize(tcg, format)
            const okSize = stats.total === target || (tcg === 'ygo' && stats.total >= 40 && stats.total <= 60)
            return okSize ? ["Proper deck size"] : []
          })(),
          weaknesses: (() => {
            const target = getTargetMainSize(tcg, format)
            const arr: string[] = []
            if (tcg === 'ygo') {
              if (stats.total < 40) arr.push(`Deck too small (${stats.total}/40 cards)`) 
              if (stats.total > 60) arr.push(`Deck too large (${stats.total}/60 max)`) 
            } else {
              if (stats.total < target) arr.push(`Deck too small (${stats.total}/${target} cards)`) 
              if (stats.total > target && (tcg !== 'mtg' || (format || '').toLowerCase() !== 'commander')) arr.push(`Deck too large (${stats.total}/${target} target)`) 
            }
            const dupThreshold = (tcg === 'ygo') ? 3 : (tcg === 'pokemon' ? Infinity : ((format || '').toLowerCase() === 'commander' ? Infinity : 4))
            if (dupThreshold < Infinity && stats.duplicates.length > 0) arr.push('Has cards with more than allowed copies')
            return arr
          })()
        },
        issues: [{ type: "API_ERROR", detail: "AI service returned empty response", severity: "warning" }],
        suggestions: (() => {
          const target = getTargetMainSize(tcg, format)
          const sugg: any[] = []
          if ((tcg !== 'ygo' && stats.total < target) || (tcg === 'ygo' && stats.total < 40)) {
            sugg.push({ change: `Add more cards to reach ${tcg === 'ygo' ? 40 : target}`, rationale: 'Format deck size', requiresPurchase: true })
          }
          return sugg
        })(),
        stats: stats,
        raw: "Empty AI response"
      };
      console.log("Using fallback analysis:", fallbackAi);
      return { model: modelName, stats, ai: fallbackAi };
    }

    const ai = extractFirstJson(text) ?? {
      analysis: { summary: "AI returned non-JSON response", strengths: [], weaknesses: [] },
      issues: [{ type: "LLM_PARSE", detail: `Non-JSON response: ${text.substring(0, 200)}...`, severity: "warning" }],
      suggestions: [],
      raw: text,
      stats: stats,
    };

    console.log("Parsed AI Result:", ai); // Debug logging

    return { model: modelName, stats, ai };
  },
});

export const buildDeck = action({
  args: {
    tcg: v.string(),
    format: v.optional(v.string()),
    goal: v.optional(v.string()), // e.g., archetype or style like "Mono-Red Aggro"
    targetMainSize: v.optional(v.number()), // default 60 (MTG/Pokemon) or 40 (YGO)
    enforceRules: v.optional(v.boolean()), // if true, apply format legality and construction rules
    // Provide owned card names with rough quantities to bias selection
    holdings: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, { tcg, format, goal, targetMainSize, enforceRules, holdings }) => {
    "use node";

    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // Faster model for better performance
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY environment variable.");

    const size = typeof targetMainSize === "number" && targetMainSize > 0 ? targetMainSize : (tcg === "ygo" ? 40 : 60)

    // Build format-specific rule text
    let ruleText = ''
    if (enforceRules) {
      if (tcg === 'mtg') {
        if ((format || '').toLowerCase() === 'commander') {
          ruleText = `Commander rules (EDH):
          - 100-card singleton deck (exactly 100 cards total).
          - Exactly one commander (legendary creature or designated card); include it with quantity 1.
          - No duplicate non-basic cards (singleton), basic lands can repeat.
          - All nonland cards must obey color identity of the commander.
          - Use only cards legal in Commander (avoid banned list).`
        } else {
          ruleText = `Constructed MTG rules:
          - Main deck must be exactly ${size} cards unless the format dictates otherwise.
          - Up to 4 copies of a given non-basic card across main+sideboard.
          - Use only cards legal in ${format ?? 'the selected'} format (avoid banned/restricted).`
        }
      } else if (tcg === 'pokemon') {
        ruleText = `Pokemon TCG rules:
        - Exactly 60 cards in the main deck.
        - Up to 4 copies of the same named card, except basic energy cards can exceed 4.
        - Use only cards legal in ${format ?? 'the selected'} format.`
      } else if (tcg === 'ygo') {
        ruleText = `Yu-Gi-Oh! rules:
        - Main deck target 40 cards (40–60 allowed).
        - Up to 3 copies of a card (respect Forbidden/Limited list).
        - Use Extra/Side if suggested by the archetype; keep within legal sizes.
        - Use only cards legal in ${format ?? 'the selected'} format.`
      }
    }

    const preferOwnedLine = Array.isArray(holdings) && holdings.length > 0
      ? `- Prefer cards the user ALREADY OWNS when possible. Owned list is provided with names and quantities.`
      : ''

    const system = `You are an expert deck building assistant for trading card games.
Return STRICT JSON:
{
  "plan": string, // high-level plan for the deck
  "cards": [ { "name": string, "quantity": number, "section"?: "main"|"sideboard"|"extra" } ]
}
Rules:
- Consider TCG (${tcg}) and format (${format ?? "unknown"}). If uncertain, use sensible defaults.
${preferOwnedLine}
- Target exactly ${size} cards in the main deck (ignore sideboard/extra if not applicable).
- Do not include card names that are fictional or non-existent.
- Keep the JSON valid with no extra commentary.`
    + (ruleText ? `\n Format-Specific Rules:\n${ruleText}` : '')

    const payload = {
      tcg,
      format: format ?? null,
      goal: goal ?? null,
      targetMainSize: size,
      owned: (holdings ?? []).slice(0, 300),
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 512,
        candidateCount: 1,
        topP: 1,
        topK: 1,
        responseMimeType: "application/json",
      },
    });
    const prompt = JSON.stringify(payload);
    const withTimeout = <T>(p: Promise<T>, ms: number) => new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms);
      p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
    });
    const result = await withTimeout(model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }), 15000);
    const text = typeof result?.response?.text === "function"
      ? result.response.text()
      : (result as any)?.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? "";

    const parsed = ((): any => {
      try { return JSON.parse(text) } catch {}
      const match = text.match(/```json[\s\S]*?```/i) || text.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[0].replace(/```json|```/gi, "").trim()) } catch {}
      }
      return null
    })();

    const cards = Array.isArray(parsed?.cards) ? parsed.cards : []
    const plan = typeof parsed?.plan === "string" ? parsed.plan : ""

    // Sanitize output
    const clean = cards
      .filter((c: any) => typeof c?.name === "string" && c.name.trim().length > 0 && Number.isFinite(Number(c?.quantity)))
      .map((c: any) => ({ name: String(c.name).trim(), quantity: Math.max(1, Math.floor(Number(c.quantity))), section: c.section === "sideboard" || c.section === "extra" ? c.section : "main" }))

    return { model: modelName, plan, cards: clean }
  },
});
