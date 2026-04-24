/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_activity from "../_lib/activity.js";
import type * as auth from "../auth.js";
import type * as budget from "../budget.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as mutations from "../mutations.js";
import type * as notes from "../notes.js";
import type * as photos from "../photos.js";
import type * as projects from "../projects.js";
import type * as queries from "../queries.js";
import type * as quotes from "../quotes.js";
import type * as seed from "../seed.js";
import type * as stages from "../stages.js";
import type * as users from "../users.js";
import type * as zodSchemas from "../zodSchemas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/activity": typeof _lib_activity;
  auth: typeof auth;
  budget: typeof budget;
  dashboard: typeof dashboard;
  http: typeof http;
  mutations: typeof mutations;
  notes: typeof notes;
  photos: typeof photos;
  projects: typeof projects;
  queries: typeof queries;
  quotes: typeof quotes;
  seed: typeof seed;
  stages: typeof stages;
  users: typeof users;
  zodSchemas: typeof zodSchemas;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
