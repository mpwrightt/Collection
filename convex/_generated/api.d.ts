/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as analyzer_v2 from "../analyzer_v2.js";
import type * as collections from "../collections.js";
import type * as dashboard from "../dashboard.js";
import type * as debug from "../debug.js";
import type * as decks from "../decks.js";
import type * as formats from "../formats.js";
import type * as http from "../http.js";
import type * as paymentAttemptTypes from "../paymentAttemptTypes.js";
import type * as paymentAttempts from "../paymentAttempts.js";
import type * as pricing from "../pricing.js";
import type * as sets from "../sets.js";
import type * as tcg from "../tcg.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  analyzer_v2: typeof analyzer_v2;
  collections: typeof collections;
  dashboard: typeof dashboard;
  debug: typeof debug;
  decks: typeof decks;
  formats: typeof formats;
  http: typeof http;
  paymentAttemptTypes: typeof paymentAttemptTypes;
  paymentAttempts: typeof paymentAttempts;
  pricing: typeof pricing;
  sets: typeof sets;
  tcg: typeof tcg;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
