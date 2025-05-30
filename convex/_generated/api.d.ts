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
import type * as ai from "../ai.js";
import type * as anime from "../anime.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as crons from "../crons.js";
import type * as externalApis from "../externalApis.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as openaiProxy from "../openaiProxy.js";
import type * as reviews from "../reviews.js";
import type * as router from "../router.js";
import type * as twilioSender from "../twilioSender.js";
import type * as types from "../types.js";
import type * as useMobileOptimizations from "../useMobileOptimizations.js";
import type * as usePersistentChatHistory from "../usePersistentChatHistory.js";
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
  ai: typeof ai;
  anime: typeof anime;
  auth: typeof auth;
  authActions: typeof authActions;
  crons: typeof crons;
  externalApis: typeof externalApis;
  http: typeof http;
  notifications: typeof notifications;
  openaiProxy: typeof openaiProxy;
  reviews: typeof reviews;
  router: typeof router;
  twilioSender: typeof twilioSender;
  types: typeof types;
  useMobileOptimizations: typeof useMobileOptimizations;
  usePersistentChatHistory: typeof usePersistentChatHistory;
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
