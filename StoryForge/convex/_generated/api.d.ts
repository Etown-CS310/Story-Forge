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
import type * as debug from "../debug.js";
import type * as myFunctions from "../myFunctions.js";
import type * as queries_stories from "../queries/stories.js";
import type * as queries_visualization from "../queries/visualization.js";
import type * as ui from "../ui.js";

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
  debug: typeof debug;
  myFunctions: typeof myFunctions;
  "queries/stories": typeof queries_stories;
  "queries/visualization": typeof queries_visualization;
  ui: typeof ui;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
