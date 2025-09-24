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
import type * as admin from "../admin.js";
import type * as advancedPresets from "../advancedPresets.js";
import type * as ai from "../ai.js";
import type * as aiCache from "../aiCache.js";
import type * as anime from "../anime.js";
import type * as animeQueries from "../animeQueries.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as authSecurity from "../authSecurity.js";
import type * as autoRefresh from "../autoRefresh.js";
import type * as characterEnrichment from "../characterEnrichment.js";
import type * as characterMigration from "../characterMigration.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as deduplicationUtils from "../deduplicationUtils.js";
import type * as emailVerification from "../emailVerification.js";
import type * as externalApis from "../externalApis.js";
import type * as http from "../http.js";
import type * as migrations_migrateCharacterEnrichment from "../migrations/migrateCharacterEnrichment.js";
import type * as migrations from "../migrations.js";
import type * as moodSuggestionEngine from "../moodSuggestionEngine.js";
import type * as notifications from "../notifications.js";
import type * as openaiProxy from "../openaiProxy.js";
import type * as performanceMonitor from "../performanceMonitor.js";
import type * as recommendationFilterWorker from "../recommendationFilterWorker.js";
import type * as reels from "../reels.js";
import type * as retryEnrichment from "../retryEnrichment.js";
import type * as reviews from "../reviews.js";
import type * as router from "../router.js";
import type * as runMigration from "../runMigration.js";
import type * as testData from "../testData.js";
import type * as twilioSender from "../twilioSender.js";
import type * as types from "../types.js";
import type * as useAnimeDetailMobileOptimizations from "../useAnimeDetailMobileOptimizations.js";
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
  admin: typeof admin;
  advancedPresets: typeof advancedPresets;
  ai: typeof ai;
  aiCache: typeof aiCache;
  anime: typeof anime;
  animeQueries: typeof animeQueries;
  auth: typeof auth;
  authActions: typeof authActions;
  authSecurity: typeof authSecurity;
  autoRefresh: typeof autoRefresh;
  characterEnrichment: typeof characterEnrichment;
  characterMigration: typeof characterMigration;
  crons: typeof crons;
  deduplication: typeof deduplication;
  deduplicationUtils: typeof deduplicationUtils;
  emailVerification: typeof emailVerification;
  externalApis: typeof externalApis;
  http: typeof http;
  "migrations/migrateCharacterEnrichment": typeof migrations_migrateCharacterEnrichment;
  migrations: typeof migrations;
  moodSuggestionEngine: typeof moodSuggestionEngine;
  notifications: typeof notifications;
  openaiProxy: typeof openaiProxy;
  performanceMonitor: typeof performanceMonitor;
  recommendationFilterWorker: typeof recommendationFilterWorker;
  reels: typeof reels;
  retryEnrichment: typeof retryEnrichment;
  reviews: typeof reviews;
  router: typeof router;
  runMigration: typeof runMigration;
  testData: typeof testData;
  twilioSender: typeof twilioSender;
  types: typeof types;
  useAnimeDetailMobileOptimizations: typeof useAnimeDetailMobileOptimizations;
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
