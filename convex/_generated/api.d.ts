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
import type * as anime from "../anime.js";
import type * as auth from "../auth.js";
import type * as externalApis from "../externalApis.js";
import type * as http from "../http.js";
import type * as openaiProxy from "../openaiProxy.js";
import type * as reviews from "../reviews.js";
import type * as router from "../router.js";
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
  anime: typeof anime;
  auth: typeof auth;
  externalApis: typeof externalApis;
  http: typeof http;
  openaiProxy: typeof openaiProxy;
  reviews: typeof reviews;
  router: typeof router;
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
