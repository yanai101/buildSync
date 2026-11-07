/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as _lib_activity from "../_lib/activity.js";
import type * as _lib_contractorPaymentSync from "../_lib/contractorPaymentSync.js";
import type * as _lib_entitlements from "../_lib/entitlements.js";
import type * as _lib_fileValidation from "../_lib/fileValidation.js";
import type * as _lib_financialSummary from "../_lib/financialSummary.js";
import type * as _lib_projectAccess from "../_lib/projectAccess.js";
import type * as _lib_projectDeletion from "../_lib/projectDeletion.js";
import type * as _lib_resolveCurrentStageName from "../_lib/resolveCurrentStageName.js";
import type * as _lib_roomArchiveCleanup from "../_lib/roomArchiveCleanup.js";
import type * as _lib_roomArchiveShared from "../_lib/roomArchiveShared.js";
import type * as _lib_stageSchedule from "../_lib/stageSchedule.js";
import type * as _test_factories from "../_test/factories.js";
import type * as accountMerge from "../accountMerge.js";
import type * as aiQuotes from "../aiQuotes.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as budget from "../budget.js";
import type * as checklists from "../checklists.js";
import type * as cleanup from "../cleanup.js";
import type * as contractorNotes from "../contractorNotes.js";
import type * as crons from "../crons.js";
import type * as dailyLogs from "../dailyLogs.js";
import type * as dashboard from "../dashboard.js";
import type * as debug from "../debug.js";
import type * as financing from "../financing.js";
import type * as guides from "../guides.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as mutations from "../mutations.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as permits from "../permits.js";
import type * as personalFiles from "../personalFiles.js";
import type * as photos from "../photos.js";
import type * as projectExport from "../projectExport.js";
import type * as projectFiles from "../projectFiles.js";
import type * as projectPlans from "../projectPlans.js";
import type * as projects from "../projects.js";
import type * as push from "../push.js";
import type * as pushActions from "../pushActions.js";
import type * as queries from "../queries.js";
import type * as quickNotes from "../quickNotes.js";
import type * as quotes from "../quotes.js";
import type * as roomArchive from "../roomArchive.js";
import type * as seed from "../seed.js";
import type * as stages from "../stages.js";
import type * as superAdmin from "../superAdmin.js";
import type * as support from "../support.js";
import type * as timeline from "../timeline.js";
import type * as users from "../users.js";
import type * as zodSchemas from "../zodSchemas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  "_lib/activity": typeof _lib_activity;
  "_lib/contractorPaymentSync": typeof _lib_contractorPaymentSync;
  "_lib/entitlements": typeof _lib_entitlements;
  "_lib/fileValidation": typeof _lib_fileValidation;
  "_lib/financialSummary": typeof _lib_financialSummary;
  "_lib/projectAccess": typeof _lib_projectAccess;
  "_lib/projectDeletion": typeof _lib_projectDeletion;
  "_lib/resolveCurrentStageName": typeof _lib_resolveCurrentStageName;
  "_lib/roomArchiveCleanup": typeof _lib_roomArchiveCleanup;
  "_lib/roomArchiveShared": typeof _lib_roomArchiveShared;
  "_lib/stageSchedule": typeof _lib_stageSchedule;
  "_test/factories": typeof _test_factories;
  accountMerge: typeof accountMerge;
  aiQuotes: typeof aiQuotes;
  announcements: typeof announcements;
  auth: typeof auth;
  budget: typeof budget;
  checklists: typeof checklists;
  cleanup: typeof cleanup;
  contractorNotes: typeof contractorNotes;
  crons: typeof crons;
  dailyLogs: typeof dailyLogs;
  dashboard: typeof dashboard;
  debug: typeof debug;
  financing: typeof financing;
  guides: typeof guides;
  http: typeof http;
  invitations: typeof invitations;
  mutations: typeof mutations;
  notifications: typeof notifications;
  orders: typeof orders;
  permits: typeof permits;
  personalFiles: typeof personalFiles;
  photos: typeof photos;
  projectExport: typeof projectExport;
  projectFiles: typeof projectFiles;
  projectPlans: typeof projectPlans;
  projects: typeof projects;
  push: typeof push;
  pushActions: typeof pushActions;
  queries: typeof queries;
  quickNotes: typeof quickNotes;
  quotes: typeof quotes;
  roomArchive: typeof roomArchive;
  seed: typeof seed;
  stages: typeof stages;
  superAdmin: typeof superAdmin;
  support: typeof support;
  timeline: typeof timeline;
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
