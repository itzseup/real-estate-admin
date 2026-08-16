/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as blogPosts from "../blogPosts.js";
import type * as bookings from "../bookings.js";
import type * as inquiries from "../inquiries.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_entity from "../lib/entity.js";
import type * as lib_fields from "../lib/fields.js";
import type * as lib_password from "../lib/password.js";
import type * as properties from "../properties.js";
import type * as testimonials from "../testimonials.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  auth: typeof auth;
  blogPosts: typeof blogPosts;
  bookings: typeof bookings;
  inquiries: typeof inquiries;
  "lib/authz": typeof lib_authz;
  "lib/entity": typeof lib_entity;
  "lib/fields": typeof lib_fields;
  "lib/password": typeof lib_password;
  properties: typeof properties;
  testimonials: typeof testimonials;
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
