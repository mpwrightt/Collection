import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal query to fetch a cached API token for a provider
export const getTokenRecord = internalQuery({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    return await ctx.db
      .query("apiTokens")
      .withIndex("byProvider", (q) => q.eq("provider", provider))
      .unique();
  },
});

// List ALL products for a given group (set) by paging through results
export const listGroupProducts = action({
  args: { groupId: v.number() },
  handler: async (ctx, { groupId }) => {
    'use node';
    const svc = getPythonServiceUrl();
    const out: any[] = [];
    let offset = 0;
    const limit = 200;
    while (true) {
      let page: any;
      if (svc) {
        const url = `${svc}/products?groupId=${groupId}&limit=${limit}&offset=${offset}`;
        page = await fetchJson(url, { method: 'GET' });
      } else {
        const clientId = process.env.TCGPLAYER_CLIENT_ID!;
        const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
        const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
        if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
        await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
        const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
        const url = apiBase(version, `catalog/products?groupId=${groupId}&limit=${limit}&offset=${offset}`);
        page = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
      }
      const list = page?.results || page?.Results || page?.data || [];
      out.push(...list);
      if (!list.length || list.length < limit) break;
      offset += limit;
      // small pacing between pages to avoid bursts
      await new Promise((r) => setTimeout(r, 50));
    }
    return { Success: true, Results: out };
  }
});

// Get group (set) details by IDs
export const getGroupsByIds = action({
  args: { groupIds: v.array(v.number()) },
  handler: async (ctx, { groupIds }) => {
    'use node';
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return { Success: true, Results: [] };
    }
    const clean = Array.from(new Set(groupIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)));
    if (clean.length === 0) return { Success: true, Results: [] };
    const svc = getPythonServiceUrl();
    if (svc) {
      // If python service exposes groups by ids route, prefer it; otherwise fall through to direct API
      try {
        const url = `${svc}/groups/by-ids?ids=${encodeURIComponent(clean.join(','))}`;
        return await fetchJson(url, { method: 'GET' });
      } catch {}
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || 'v1.39.0';
    if (!clientId || !clientSecret) throw new Error('Missing TCGPLAYER credentials');
    const results: any[] = [];
    for (const gid of clean) {
      await acquireSlotWithRetry(ctx, { provider: 'tcgplayer', rate: 10, windowMs: 1000 });
      const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
      const url = apiBase(version, `catalog/groups/${gid}`);
      try {
        const payload = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
        const list = payload?.results || payload?.Results || payload?.data || [];
        if (Array.isArray(list) && list.length) results.push(...list);
      } catch (e) {
        // ignore individual group failures
      }
      // tiny pacing between calls
      await new Promise((r) => setTimeout(r, 40));
    }
    return { Success: true, Results: results };
  },
});

// Get media for a category (icon/banner); proxy to service or direct API
export const getCategoryMedia = action({
  args: { categoryId: v.number() },
  handler: async (ctx, { categoryId }) => {
    'use node';
    const svc = getPythonServiceUrl();
    if (svc) {
      const url = `${svc}/category-media?categoryId=${categoryId}`;
      return await fetchJson(url, { method: 'GET' });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `catalog/categories/${categoryId}/media`);
    return await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
  }
});

// Get all groups (sets) for a category by paging through results
export const getAllGroups = action({
  args: { categoryId: v.number() },
  handler: async (ctx, { categoryId }) => {
    'use node';
    const svc = getPythonServiceUrl();
    const out: any[] = [];
    let offset = 0;
    const limit = 200;
    while (true) {
      const params = new URLSearchParams({ categoryId: String(categoryId), limit: String(limit), offset: String(offset) });
      let page: any;
      if (svc) {
        const url = `${svc}/groups?${params.toString()}`;
        page = await fetchJson(url, { method: 'GET' });
      } else {
        const clientId = process.env.TCGPLAYER_CLIENT_ID!;
        const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
        const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
        if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
        await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
        const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
        const url = apiBase(version, `catalog/groups?${params.toString()}`);
        page = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
      }
      const list = page?.results || page?.Results || page?.data || [];
      out.push(...list);
      if (!list.length || list.length < limit) break;
      offset += limit;
      if (offset > 5000) break; // hard cap to avoid runaway
      // tiny delay between pages to avoid bursts
      await new Promise((r) => setTimeout(r, 60));
    }
    return { Success: true, Results: out };
  }
});

// Get SKUs for product IDs
export const getSkus = action({
  args: { productIds: v.array(v.number()) },
  handler: async (ctx, { productIds }) => {
    'use node';
    if (productIds.length === 0) return emptySkuResponse();
    const svc = getPythonServiceUrl();
    const cleanIds = Array.from(new Set(productIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0 && Number.isInteger(n))
    ));
    if (cleanIds.length === 0) return emptySkuResponse();
    const normalizeList = (resp: any): any[] => resp?.results || resp?.Results || resp?.data || [];
    const CHUNK = 10; // Smaller chunks for SKU requests
    const collectSkus = async (loadChunk: (chunk: number[]) => Promise<any[]>) => {
      const all: any[] = [];
      for (let i = 0; i < cleanIds.length; i += CHUNK) {
        const chunk = cleanIds.slice(i, i + CHUNK);
        const list = await loadChunk(chunk);
        all.push(...list);
        if (cleanIds.length > CHUNK) await new Promise((r) => setTimeout(r, 100));
      }
      return {
        Success: true,
        Results: all,
        results: all,
        data: all,
      };
    };
    if (svc) {
      return await collectSkus(async (chunk) => {
        const url = `${svc}/skus?productIds=${encodeURIComponent(chunk.join(','))}`;
        const payload = await fetchJson(url, { method: 'GET' });
        return normalizeList(payload);
      });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    const fetchSkuChunk = async (ids: number[]): Promise<any[]> => {
      const attempt = async (subset: number[]): Promise<any[]> => {
        const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
        // Use individual product endpoints instead of batch
        const allSkus: any[] = [];
        for (const productId of subset) {
          try {
            // Rate limit each outgoing request to avoid 429s
            await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
            const url = apiBase(version, `catalog/products/${productId}/skus`);
            const payload = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
            const skus = normalizeList(payload);
            allSkus.push(...skus);
            // Small delay between requests
            await new Promise((r) => setTimeout(r, 50));
          } catch (err: any) {
            if (!isBadRequest(err)) {
              console.warn(`Failed to get SKUs for productId=${productId}:`, err.message);
            } else {
              console.warn(`Invalid productId=${productId} for SKU lookup`);
            }
            // Continue with other products instead of failing completely
          }
        }
        return allSkus;
      };
      return await attempt(ids);
    };
    return await collectSkus(fetchSkuChunk);
  }
});
// List groups (sets) for a category, optional name filter
export const getGroups = action({
  args: { categoryId: v.optional(v.number()), name: v.optional(v.string()), limit: v.optional(v.number()), offset: v.optional(v.number()) },
  handler: async (ctx, { categoryId, name, limit, offset }) => {
    'use node';
    const svc = getPythonServiceUrl();
    const params = new URLSearchParams();
    if (categoryId !== undefined) params.set('categoryId', String(categoryId));
    if (name) params.set('name', name);
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    if (svc) {
      const url = `${svc}/groups?${params.toString()}`;
      return await fetchJson(url, { method: 'GET' });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `catalog/groups?${params.toString()}`);
    return await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
  }
});

// Get media (images) for a product
export const getProductMedia = action({
  args: { productId: v.number() },
  handler: async (ctx, { productId }) => {
    'use node';
    const svc = getPythonServiceUrl();
    if (svc) {
      const url = `${svc}/media?productId=${productId}`;
      return await fetchJson(url, { method: 'GET' });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `catalog/products/${productId}/media`);
    return await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
  }
});

// Get product details for one or more IDs
export const getProductDetails = action({
  args: { productIds: v.array(v.number()) },
  handler: async (ctx, { productIds }) => {
    'use node';
    if (productIds.length === 0) return { Success: true, Results: [] };
    const svc = getPythonServiceUrl();
    const ids = productIds.join(',');
    if (svc) {
      const url = `${svc}/product-details?ids=${encodeURIComponent(ids)}`;
      return await fetchJson(url, { method: 'GET' });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `catalog/products/${ids}`);
    return await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `${type} ${token}` } });
  }
});

// Internal mutation to enforce a simple fixed-window rate limit
export const acquireRateLimitSlot = internalMutation({
  args: { provider: v.string(), rate: v.number(), windowMs: v.number() },
  handler: async (ctx, { provider, rate, windowMs }) => {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("byProvider", (q) => q.eq("provider", provider))
      .unique();

    if (!existing || existing.windowStart !== windowStart || existing.windowMs !== windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart, count: 1, windowMs });
      } else {
        await ctx.db.insert("rateLimits", { provider, windowStart, count: 1, windowMs });
      }
      return;
    }

    if (existing.count >= rate) {
      throw new Error(`Rate limit exceeded for ${provider}: ${existing.count}/${rate} in ${windowMs}ms`);
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  },
});

// Non-throwing variant used by helpers to avoid noisy logs when we expect to wait.
export const tryAcquireRateLimitSlot = internalMutation({
  args: { provider: v.string(), rate: v.number(), windowMs: v.number() },
  handler: async (ctx, { provider, rate, windowMs }) => {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("byProvider", (q) => q.eq("provider", provider))
      .unique();

    if (!existing || existing.windowStart !== windowStart || existing.windowMs !== windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart, count: 1, windowMs });
      } else {
        await ctx.db.insert("rateLimits", { provider, windowStart, count: 1, windowMs });
      }
      return { ok: true, waitMs: 0 };
    }

    // If we hit the rate, return suggested waitMs instead of throwing
    if (existing.count >= rate) {
      const windowEnd = existing.windowStart + existing.windowMs;
      const timeLeft = Math.max(0, windowEnd - now);
      // Add small jitter to avoid stampedes
      const jitter = Math.floor(Math.random() * Math.max(25, Math.ceil(existing.windowMs / Math.max(1, rate))));
      return { ok: false, waitMs: timeLeft + jitter };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { ok: true, waitMs: 0 };
  },
});

// Internal mutation to upsert a provider token
export const upsertTokenRecord = internalMutation({
  args: {
    provider: v.string(),
    accessToken: v.string(),
    tokenType: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, { provider, accessToken, tokenType, expiresAt }) => {
    const existing = await ctx.db
      .query("apiTokens")
      .withIndex("byProvider", (q) => q.eq("provider", provider))
      .unique();

    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("apiTokens", {
        provider,
        accessToken,
        tokenType,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        accessToken,
        tokenType,
        expiresAt,
        updatedAt: now,
      });
    }
  },
});

function apiBase(version: string, path: string) {
  return `https://api.tcgplayer.com/${version}/${path.replace(/^\//, "")}`;
}

async function ensureBearerToken(
  ctx: any,
  clientId: string,
  clientSecret: string,
): Promise<{ token: string; type: string }> {
  const provider = "tcgplayer";
  const existing = await ctx.runQuery(internal.tcg.getTokenRecord, { provider });
  const now = Date.now();
  if (existing && existing.expiresAt > now + 60_000) {
    return { token: existing.accessToken, type: existing.tokenType ?? "bearer" };
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://api.tcgplayer.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to get TCGplayer token: ${res.status} ${res.statusText} ${txt}`);
  }
  const json: any = await res.json();
  const accessToken = json.access_token as string;
  const tokenType = (json.token_type as string) || "bearer";
  const expiresIn = (json.expires_in as number) ?? 1209599; // seconds
  const expiresAt = now + expiresIn * 1000 - 60_000; // refresh 1 min early

  await ctx.runMutation(internal.tcg.upsertTokenRecord, {
    provider,
    accessToken,
    tokenType,
    expiresAt,
  });

  return { token: accessToken, type: tokenType };
}

async function fetchJson(path: string, init: RequestInit): Promise<any> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TCGplayer API error: ${res.status} ${res.statusText} ${txt}`);
  }
  return await res.json();
}

function getPythonServiceUrl(): string | null {
  const url = (process as any).env?.TCGPY_SERVICE_URL || (globalThis as any).process?.env?.TCGPY_SERVICE_URL;
  if (typeof url === "string" && url.length > 0) return url.replace(/\/$/, "");
  return null;
}

function emptySkuResponse() {
  return { Success: true, Results: [], results: [], data: [] };
}

function isBadRequest(err: any): boolean {
  if (!(err instanceof Error)) return false;
  return /\b400\b/.test(err.message);
}

function augmentSkuError(err: any, ids: number[]): Error {
  if (err instanceof Error) {
    const withContext = new Error(`${err.message} (productIds=${ids.join(',')})`);
    (withContext as any).cause = err;
    return withContext;
  }
  return new Error(`Failed to fetch SKUs for productIds=${ids.join(',')}: ${String(err)}`);
}

// Retry wrapper to mitigate write-conflicts on the rate limiter document under concurrency
async function acquireSlotWithRetry(
  ctx: any,
  args: { provider: string; rate: number; windowMs: number },
  retries: number = 20,
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res: any = await ctx.runMutation(internal.tcg.tryAcquireRateLimitSlot, args);
      if (res && res.ok) {
        return;
      }
      // Rate exceeded: wait recommended time and retry without consuming attempts
      const wait = Math.max(25, Math.min(1500, Number(res?.waitMs) || Math.ceil(args.windowMs / Math.max(1, args.rate))));
      await new Promise((r) => setTimeout(r, wait));
      attempt--;
      continue;
    } catch (e: any) {
      const msg = String(e?.message || e);
      const isConflict = /rateLimits/.test(msg) && /changed while this mutation/.test(msg);
      if (!isConflict || attempt === retries) {
        throw e;
      }
      const backoff = Math.min(300, 25 * (2 ** attempt)) + Math.floor(Math.random() * 25);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

// Public action to get catalog categories
export const getCategories = action({
  args: {},
  handler: async (ctx) => {
    'use node';
    const svc = getPythonServiceUrl();
    const out: any[] = [];
    let offset = 0;
    const limit = 200;
    while (true) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      let page: any;
      if (svc) {
        const url = `${svc}/categories?${params.toString()}`;
        page = await fetchJson(url, { method: "GET" });
      } else {
        const clientId = process.env.TCGPLAYER_CLIENT_ID!;
        const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
        const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
        if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
        await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
        const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
        const url = apiBase(version, `catalog/categories?${params.toString()}`);
        page = await fetchJson(url, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `${type} ${token}` },
        });
      }
      const list = page?.results || page?.Results || page?.data || [];
      out.push(...list);
      if (!list.length || list.length < limit) break;
      offset += limit;
      if (offset > 2000) break; // hard cap to avoid runaway
      // tiny delay between pages to avoid bursts
      await new Promise((r) => setTimeout(r, 60));
    }
    return { Success: true, Results: out };
  },
});

// Public action to search products by name and optional category
export const searchProducts = action({
  args: {
    productName: v.string(),
    categoryId: v.optional(v.number()),
    groupId: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { productName, categoryId, groupId, limit = 30, offset = 0 }) => {
    'use node';
    const svc = getPythonServiceUrl();
    const params = new URLSearchParams({ productName, limit: String(limit), offset: String(offset) });
    if (categoryId !== undefined) params.set("categoryId", String(categoryId));
    if (groupId !== undefined) params.set("groupId", String(groupId));
    if (svc) {
      const url = `${svc}/products?${params.toString()}`;
      return await fetchJson(url, { method: "GET" });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `catalog/products?${params.toString()}`);
    return await fetchJson(url, { method: "GET", headers: { Accept: "application/json", Authorization: `${type} ${token}` } });
  },
});

// Public action to fetch product market prices
export const getProductPrices = action({
  args: { productIds: v.array(v.number()) },
  handler: async (ctx, { productIds }) => {
    if (productIds.length === 0) return { Success: true, Results: [] };
    'use node';
    const svc = getPythonServiceUrl();
    const ids = productIds.join(",");
    if (svc) {
      const url = `${svc}/pricing/products?ids=${encodeURIComponent(ids)}`;
      return await fetchJson(url, { method: "GET" });
    }
    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
    const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
    const url = apiBase(version, `pricing/product/${ids}`);
    return await fetchJson(url, { method: "GET", headers: { Accept: "application/json", Authorization: `${type} ${token}` } });
  },
});

// Public action to fetch SKU-level prices (fallback when product-level is missing)
export const getSkuPrices = action({
  args: { skuIds: v.array(v.number()) },
  handler: async (ctx, { skuIds }) => {
    if (skuIds.length === 0) return { Success: true, Results: [] };
    'use node';
    const svc = getPythonServiceUrl();
    const cleanIds = Array.from(new Set(
      skuIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    ));
    if (cleanIds.length === 0) return { Success: true, Results: [] };

    if (svc) {
      const url = `${svc}/pricing/skus?ids=${encodeURIComponent(cleanIds.join(','))}`;
      return await fetchJson(url, { method: "GET" });
    }

    const clientId = process.env.TCGPLAYER_CLIENT_ID!;
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET!;
    const version = process.env.TCGPLAYER_API_VERSION || "v1.39.0";
    if (!clientId || !clientSecret) throw new Error("Missing TCGPLAYER credentials");
    const all: any[] = [];
    const CHUNK = 50; // smaller chunk size to avoid long URLs and 400s
    for (let i = 0; i < cleanIds.length; i += CHUNK) {
      const chunk = cleanIds.slice(i, i + CHUNK);
      await acquireSlotWithRetry(ctx, { provider: "tcgplayer", rate: 10, windowMs: 1000 });
      const { token, type } = await ensureBearerToken(ctx, clientId, clientSecret);
      const primaryUrl = apiBase(version, `pricing/marketprices/skus?skuIds=${chunk.join(',')}`);
      let page: any;
      try {
        page = await fetchJson(primaryUrl, { method: "GET", headers: { Accept: "application/json", Authorization: `${type} ${token}` } });
      } catch (e: any) {
        // Fallback to legacy endpoint shape
        const legacyUrl = apiBase(version, `pricing/sku/${chunk.join(',')}`);
        page = await fetchJson(legacyUrl, { method: "GET", headers: { Accept: "application/json", Authorization: `${type} ${token}` } });
      }
      const list = page?.results || page?.Results || page?.data || [];
      all.push(...list);
      // tiny pause between chunks
      await new Promise((r) => setTimeout(r, 50));
    }
    return { Success: true, Results: all };
  },
});
