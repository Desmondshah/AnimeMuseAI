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
import type * as anime from "../anime.js";
import type * as animeQueries from "../animeQueries.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as autoRefresh from "../autoRefresh.js";
import type * as characterEnrichment from "../characterEnrichment.js";
import type * as crons from "../crons.js";
import type * as externalApis from "../externalApis.js";
import type * as http from "../http.js";
import type * as moodSuggestionEngine from "../moodSuggestionEngine.js";
import type * as notifications from "../notifications.js";
import type * as openaiProxy from "../openaiProxy.js";
import type * as performanceMonitor from "../performanceMonitor.js";
import type * as reviews from "../reviews.js";
import type * as router from "../router.js";
import type * as twilioSender from "../twilioSender.js";
import type * as types from "../types.js";
import type * as useAnimeDetailMobileOptimizations from "../useAnimeDetailMobileOptimizations.js";
import type * as useMobileOptimizations from "../useMobileOptimizations.js";
import type * as useMoodBoardAnalytics from "../useMoodBoardAnalytics.js";
import type * as useMoodBoardPerformance from "../useMoodBoardPerformance.js";
import type * as useMoodBoardState from "../useMoodBoardState.js";
import type * as usePersistentChatHistory from "../usePersistentChatHistory.js";
import type * as useTheme from "../useTheme.js";
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
  anime: typeof anime;
  animeQueries: typeof animeQueries;
  auth: typeof auth;
  authActions: typeof authActions;
  autoRefresh: typeof autoRefresh;
  characterEnrichment: typeof characterEnrichment;
  crons: typeof crons;
  externalApis: typeof externalApis;
  http: typeof http;
  moodSuggestionEngine: typeof moodSuggestionEngine;
  notifications: typeof notifications;
  openaiProxy: typeof openaiProxy;
  performanceMonitor: typeof performanceMonitor;
  reviews: typeof reviews;
  router: typeof router;
  twilioSender: typeof twilioSender;
  types: typeof types;
  useAnimeDetailMobileOptimizations: typeof useAnimeDetailMobileOptimizations;
  useMobileOptimizations: typeof useMobileOptimizations;
  useMoodBoardAnalytics: typeof useMoodBoardAnalytics;
  useMoodBoardPerformance: typeof useMoodBoardPerformance;
  useMoodBoardState: typeof useMoodBoardState;
  usePersistentChatHistory: typeof usePersistentChatHistory;
  useTheme: typeof useTheme;
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
