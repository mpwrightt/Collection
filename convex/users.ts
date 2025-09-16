import { internalMutation, query, QueryCtx } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});



export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    // Dev fallback: use demo-local user if present
    const isDev = (process as any)?.env?.NODE_ENV !== 'production'
    if (isDev) {
      const demo = await userByExternalId(ctx, 'demo-local')
      return demo
    }
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

// For use inside mutations: ensure there's a user record based on the current Clerk identity.
export async function getOrCreateCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    // Dev fallback: create or get a demo-local user
    const isDev = (process as any)?.env?.NODE_ENV !== 'production'
    if (!isDev) throw new Error("Can't get current user");
    let existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", 'demo-local'))
      .unique();
    if (existing) return existing as any;
    const id = await ctx.db.insert("users", {
      name: 'Demo User',
      externalId: 'demo-local',
    });
    const created = await ctx.db.get(id);
    return created as any;
  }
  // Try to find existing user
  let existing = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
    .unique();
  if (existing) return existing as any;

  // Create a minimal record using identity fields
  const name =
    (identity as any).name ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
    identity.email ||
    "User";
  const id = await ctx.db.insert("users", {
    name,
    externalId: identity.subject,
  });
  const created = await ctx.db.get(id);
  return created as any;
}