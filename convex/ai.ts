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

function computeStats(cards: DeckCard[]) {
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

  const duplicates = Object.entries(byProduct)
    .filter(([_, q]) => q > 4) // heuristic default; real rules handled by format engine later
    .map(([k, q]) => ({ key: k, quantity: q }));

  return { total, unique, bySection, duplicates };
}

function extractFirstJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    // try to find fenced code block
    const match = text.match(/```json[\s\S]*?```/i) || text.match(/\{[\s\S]*\}/);
    if (match) {
      const block = match[0].replace(/```json|```/gi, "").trim();
      try {
        return JSON.parse(block);
      } catch {
        return null;
      }
    }
    return null;
  }
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
  },
  handler: async (ctx, { tcg, format, deck, holdings }) => {
    "use node";

    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY environment variable.");
    }

    const stats = computeStats(deck.cards as DeckCard[]);

    // Keep payload small — only include essentials for LLM context
    const payload = {
      tcg,
      format: format ?? null,
      deck: {
        name: deck.name ?? "Untitled Deck",
        stats,
        cards: (deck.cards as DeckCard[]).slice(0, 500), // guard against extreme sizes
      },
      holdings: (holdings as Holding[] | undefined)?.slice(0, 200) ?? [],
    };

    const systemInstructions = `You are a deck building assistant for trading card games (TCGs). 
Return a concise JSON response with:
{
  "analysis": {"summary": string, "strengths": string[], "weaknesses": string[]},
  "issues": [ {"type": string, "detail": string, "severity": "error"|"warning" } ],
  "suggestions": [ { "change": string, "rationale": string, "requiresPurchase": boolean } ],
  "stats": { "bySection": Record<string, number>, "total": number, "unique": number }
}
Rules:
- Consider tcg and format; mention assumptions if format-specific data is missing.
- Prefer suggestions that use owned cards (provided in holdings) when possible.
- If legality constraints are unknown, flag potential legality checks as warnings, not errors.
- Keep output strictly valid JSON with no extra commentary.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `${systemInstructions}\n\nDeck Payload:\n${JSON.stringify(payload, null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = typeof result?.response?.text === "function"
      ? result.response.text()
      : (result as any)?.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? "";

    const ai = extractFirstJson(text) ?? {
      analysis: { summary: "", strengths: [], weaknesses: [] },
      issues: [{ type: "LLM_PARSE", detail: "Non-JSON response", severity: "warning" }],
      suggestions: [],
      raw: text,
      stats: stats,
    };

    return { model: modelName, stats, ai };
  },
});
