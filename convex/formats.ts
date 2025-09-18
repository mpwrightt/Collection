import { action, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Format document shape (flexible rules JSON)
// Expect rules to optionally include:
// {
//   legalGroupIds?: number[];      // Allowed TCGplayer group (set) IDs for this format
//   bannedProductIds?: number[];   // Explicitly banned product IDs
//   notes?: string;
// }

type FormatDoc = {
  _id: any;
  tcg: string;
  name: string;
  code?: string | null;
  rules?: any;
  updatedAt: number;
};

// Helper query to get all formats for a TCG
export const getFormatsByTcg = query({
  args: { tcg: v.string() },
  handler: async (ctx, { tcg }) => {
    return await ctx.db
      .query("formats")
      .withIndex("byTcg", (q: any) => q.eq("tcg", tcg))
      .collect();
  },
});

// Admin: upsert a format and its rules
export const upsertFormat = mutation({
  args: {
    tcg: v.string(),
    name: v.string(),
    code: v.optional(v.string()),
    rules: v.optional(v.any()),
  },
  handler: async (ctx, { tcg, name, code, rules }) => {
    const existing = await ctx.db
      .query("formats")
      .withIndex("byTcgName", (q: any) => q.eq("tcg", tcg).eq("name", name))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { tcg, name, code: code ?? existing.code, rules: rules ?? existing.rules, updatedAt: now });
      return existing._id;
    }
    const id = await ctx.db.insert("formats", { tcg, name, code, rules: rules ?? {}, updatedAt: now });
    return id;
  },
});

export const getFormat = query({
  args: { tcg: v.string(), codeOrName: v.string() },
  handler: async (ctx, { tcg, codeOrName }) => {
    const list = await ctx.db
      .query("formats")
      .withIndex("byTcg", (q: any) => q.eq("tcg", tcg))
      .collect();
    const needle = String(codeOrName).toLowerCase();
    const fmt = list.find((f: any) => {
      const c = (f.code ? String(f.code) : "").toLowerCase();
      const n = (f.name ? String(f.name) : "").toLowerCase();
      return c === needle || n === needle;
    });
    return fmt ? { _id: fmt._id, tcg: fmt.tcg, name: fmt.name, code: fmt.code ?? null, rules: fmt.rules ?? {} } : null;
  },
});

// Search products but filter to only those legal for the selected format using rules.legalGroupIds if present.
export const searchLegalProducts = action({
  args: {
    tcg: v.string(),
    formatCode: v.optional(v.string()),
    productName: v.string(),
    categoryId: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { tcg, formatCode, productName, categoryId, limit = 30, offset = 0 }) => {
    'use node';

    // Find format by inlining the logic to avoid api reference issues
    let fmt: FormatDoc | null = null;
    if (formatCode) {
      const formatsList = await ctx.runQuery(api.formats.getFormatsByTcg, { tcg });
      const needle = String(formatCode).toLowerCase();
      fmt = formatsList.find((f: any) => {
        const c = (f.code ? String(f.code) : "").toLowerCase();
        const n = (f.name ? String(f.name) : "").toLowerCase();
        return c === needle || n === needle;
      }) || null;
    }
    // If pokemon standard with missing rules, attempt to compute legal groups (SV-era) and persist
    if (
      (!fmt || !fmt.rules || !Array.isArray(fmt.rules.legalGroupIds) || fmt.rules.legalGroupIds.length === 0) &&
      (tcg.toLowerCase() === 'pokemon') && String(formatCode || '').toLowerCase() === 'standard'
    ) {
      // Prevent stampede: only one expensive computation per window
      try {
        const acquire = await ctx.runMutation(internal.tcg.tryAcquireRateLimitSlot, {
          provider: 'formats:pokemon-standard-legal-compute',
          rate: 1,
          windowMs: 10 * 60 * 1000, // 10 minutes
        } as any)
        if (acquire && acquire.ok) {
          try {
            const CAT_POKEMON = 3;
            const groupsResp: any = await ctx.runAction(api.tcg.getAllGroups, { categoryId: CAT_POKEMON } as any)
            const groups: any[] = groupsResp?.results || groupsResp?.Results || groupsResp?.data || []
            const allowedIds: number[] = []
            for (const g of groups) {
              const name: string = String(g?.name ?? g?.groupName ?? '')
              const abbr: string = String(g?.abbreviation ?? g?.code ?? '')
              // Heuristic: Scarlet & Violet era sets usually include 'Scarlet' or abbreviations starting with 'SV'
              if (/scarlet\s*&\s*violet/i.test(name) || /^sv\s*\d*/i.test(abbr) || /^sv\s*\d*/i.test(name)) {
                const gid = Number(g?.groupId ?? g?.GroupId)
                if (Number.isFinite(gid) && gid > 0) allowedIds.push(gid)
              }
            }
            if (allowedIds.length > 0) {
              await ctx.runMutation(api.formats.upsertFormat, {
                tcg: 'pokemon',
                name: 'Standard',
                code: 'standard',
                rules: { ...(fmt?.rules ?? {}), legalGroupIds: Array.from(new Set(allowedIds)) },
              } as any)
              // Re-fetch the updated format after upserting
              const formatsList = await ctx.runQuery(api.formats.getFormatsByTcg, { tcg });
              const needle = String(formatCode).toLowerCase();
              fmt = formatsList.find((f: any) => {
                const c = (f.code ? String(f.code) : "").toLowerCase();
                const n = (f.name ? String(f.name) : "").toLowerCase();
                return c === needle || n === needle;
              }) || null;
            }
          } catch {}
        }
      } catch {}
    }
    // Passthrough if no format or rules available
    const hasRules = !!fmt && fmt.rules && Array.isArray(fmt.rules.legalGroupIds) && fmt.rules.legalGroupIds.length > 0;

    const payload: any = await ctx.runAction(api.tcg.searchProducts, {
      productName,
      ...(typeof categoryId === 'number' ? { categoryId } : {}),
      limit,
      offset,
    } as any);

    const list: any[] = payload?.results || payload?.Results || payload?.data || [];

    if (!hasRules) {
      return { Success: true, Results: list };
    }

    const allowed = new Set<number>((fmt!.rules.legalGroupIds as number[]).map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0));

    const filtered = list.filter((item: any) => {
      const gid = Number(item?.groupId ?? item?.GroupId ?? item?.group?.groupId);
      if (!Number.isFinite(gid)) return false; // if unknown set, be conservative
      if (!allowed.has(gid)) return false;
      // Optional: exclude banned products if declared
      if (Array.isArray(fmt!.rules.bannedProductIds)) {
        const pid = Number(item?.productId ?? item?.ProductId);
        if (Number.isFinite(pid) && (fmt!.rules.bannedProductIds as any[]).includes(pid)) return false;
      }
      return true;
    });

    return { Success: true, Results: filtered };
  },
});

// Validate a list of productIds against the format rules. Returns issues but does not throw.
export const validateDeckLegality = action({
  args: {
    tcg: v.string(),
    formatCode: v.optional(v.string()),
    cards: v.array(v.object({ productId: v.number(), quantity: v.optional(v.number()) })),
  },
  handler: async (ctx, { tcg, formatCode, cards }) => {
    'use node';

    // Find format by inlining the logic to avoid api reference issues
    let fmt: FormatDoc | null = null;
    if (formatCode) {
      const formatsList = await ctx.runQuery(api.formats.getFormatsByTcg, { tcg });
      const needle = String(formatCode).toLowerCase();
      fmt = formatsList.find((f: any) => {
        const c = (f.code ? String(f.code) : "").toLowerCase();
        const n = (f.name ? String(f.name) : "").toLowerCase();
        return c === needle || n === needle;
      }) || null;
    }
    if (!fmt || !fmt.rules) return { issues: [] };

    const allowedGroups: Set<number> = new Set<number>(
      Array.isArray(fmt.rules.legalGroupIds) ? fmt.rules.legalGroupIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0) : []
    );
    const bannedProducts: Set<number> = new Set<number>(
      Array.isArray(fmt.rules.bannedProductIds) ? fmt.rules.bannedProductIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0) : []
    );

    if (allowedGroups.size === 0 && bannedProducts.size === 0) return { issues: [] };

    const productIds = Array.from(new Set(cards.map((c) => Number(c.productId)).filter((n) => Number.isFinite(n) && n > 0)));
    if (productIds.length === 0) return { issues: [] };

    const details: any = await ctx.runAction(api.tcg.getProductDetails, { productIds } as any);
    const list: any[] = details?.results || details?.Results || details?.data || [];
    const byProduct = new Map<number, any>();
    for (const item of list) {
      const pid = Number(item?.productId ?? item?.ProductId);
      if (Number.isFinite(pid)) byProduct.set(pid, item);
    }

    const issues: Array<{ productId: number; type: string; detail: string }> = [];

    for (const c of cards) {
      const pid = Number(c.productId);
      if (!Number.isFinite(pid)) continue;
      if (bannedProducts.has(pid)) {
        issues.push({ productId: pid, type: 'banned', detail: 'This card is banned in the selected format.' });
        continue;
      }
      if (allowedGroups.size > 0) {
        const info = byProduct.get(pid);
        const gid = Number(info?.groupId ?? info?.GroupId ?? info?.product?.groupId);
        if (!Number.isFinite(gid) || !allowedGroups.has(gid)) {
          issues.push({ productId: pid, type: 'illegal_set', detail: 'Card set is not legal in the selected format.' });
        }
      }
    }

    return { issues };
  },
});
