/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as debug from "../debug.js";
import type * as image from "../image.js";
import type * as myFunctions from "../myFunctions.js";
import type * as queries_stories from "../queries/stories.js";
import type * as queries_visualization from "../queries/visualization.js";
import type * as suggestions from "../suggestions.js";
import type * as ui from "../ui.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  debug: typeof debug;
  image: typeof image;
  myFunctions: typeof myFunctions;
  "queries/stories": typeof queries_stories;
  "queries/visualization": typeof queries_visualization;
  suggestions: typeof suggestions;
  ui: typeof ui;
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
