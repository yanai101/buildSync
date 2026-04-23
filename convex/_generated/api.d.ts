/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as budgetCategories from "../budgetCategories.js";
import type * as dashboard from "../dashboard.js";
import type * as expenses from "../expenses.js";
import type * as files from "../files.js";
import type * as lib_access from "../lib/access.js";
import type * as payments from "../payments.js";
import type * as projects from "../projects.js";
import type * as seeds from "../seeds.js";
import type * as stages from "../stages.js";
import type * as suppliers from "../suppliers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  budgetCategories: typeof budgetCategories;
  dashboard: typeof dashboard;
  expenses: typeof expenses;
  files: typeof files;
  "lib/access": typeof lib_access;
  payments: typeof payments;
  projects: typeof projects;
  seeds: typeof seeds;
  stages: typeof stages;
  suppliers: typeof suppliers;
  users: typeof users;
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
