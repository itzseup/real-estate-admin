// Field whitelists + coercion shared by every entity module.
//
// The admin UI posts whole form objects, which may carry `id`, `_id`,
// `_creationTime`, leftover Supabase columns, and numeric fields as strings.
// Convex rejects writes containing fields the schema does not declare, so each
// payload is filtered down to the declared columns and coerced to the declared
// type before it reaches `ctx.db`.
//
// Required columns (see convex/schema.ts) get a default on create, because the
// admin form initializes text/number inputs to empty strings.

export type FieldType = "string" | "number" | "boolean" | "string[]" | "agentId";

export type FieldSpec = Record<
  string,
  { type: FieldType; required?: boolean; default?: unknown }
>;

const str = (required = false, fallback = "") =>
  ({ type: "string" as const, required, default: fallback });
const num = (required = false, fallback = 0) =>
  ({ type: "number" as const, required, default: fallback });
const bool = (required = false, fallback = false) =>
  ({ type: "boolean" as const, required, default: fallback });

export const AGENT_FIELDS: FieldSpec = {
  name: str(true),
  email: str(true),
  phone: { type: "string" },
  bio: { type: "string" },
  avatar_url: { type: "string" },
  properties_count: { type: "number" },
};

export const PROPERTY_FIELDS: FieldSpec = {
  title: str(true),
  description: { type: "string" },
  price: num(true),
  address: str(true),
  city: str(true),
  state: str(true),
  zip_code: str(true),
  country: str(true, "AE"),
  bedrooms: num(true),
  bathrooms: num(true),
  area_sqft: { type: "number" },
  property_type: str(true, "condo"),
  status: str(true, "for_sale"),
  featured: bool(true),
  agent_id: { type: "agentId" },
  image_urls: { type: "string[]" },
  featured_image: { type: "string" },
};

export const INQUIRY_FIELDS: FieldSpec = {
  full_name: { type: "string" },
  name: { type: "string" },
  email: { type: "string" },
  phone: { type: "string" },
  message: { type: "string" },
  inquiry_type: { type: "string" },
  status: { type: "string" },
  agent_assigned: { type: "agentId" },
};

export const BLOG_POST_FIELDS: FieldSpec = {
  title: str(true),
  content: { type: "string" },
  slug: str(true),
  published: bool(true),
};

export const TESTIMONIAL_FIELDS: FieldSpec = {
  name: str(true),
  content: str(true),
  role: { type: "string" },
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false" || value === "") return false;
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

// `agent_id` / `agent_assigned` are `v.id('agents')`. The form supplies a raw
// string, which may be empty or a stale non-Convex id — normalizeId returns
// null for anything that is not a valid id for that table, and we drop it.
function toAgentId(value: unknown, ctx: { db: any }): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  return ctx.db.normalizeId("agents", value) ?? undefined;
}

function coerce(value: unknown, type: FieldType, ctx: { db: any }): unknown {
  if (value === null || value === undefined) return undefined;
  switch (type) {
    case "number":
      return toNumber(value);
    case "boolean":
      return toBoolean(value);
    case "string[]":
      return toStringArray(value);
    case "agentId":
      return toAgentId(value, ctx);
    default:
      return toStringValue(value);
  }
}

/**
 * Keep only the schema-declared fields of `payload`, coerced to their declared
 * types.
 *
 * - `mode: "create"` fills every required field that is missing or uncoercible
 *   with its default, so a partially filled admin form still saves.
 * - `mode: "patch"` drops missing fields entirely, so `update` never clears a
 *   column the caller did not touch.
 */
export function pickFields(
  ctx: { db: any },
  payload: unknown,
  spec: FieldSpec,
  mode: "create" | "patch",
): Record<string, unknown> {
  const source = (payload ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [field, config] of Object.entries(spec)) {
    const present = field in source;
    const coerced = present ? coerce(source[field], config.type, ctx) : undefined;

    if (coerced !== undefined) {
      result[field] = coerced;
      continue;
    }

    // A patch leaves untouched (or uncoercible) columns alone.
    if (mode === "create" && config.required) {
      result[field] = config.default;
    }
  }

  return result;
}

/**
 * Shape a Convex document the way the app's data layer expects it: a plain
 * `id` string alongside the original system fields.
 */
export function serialize<T extends Record<string, any> | null>(doc: T) {
  if (!doc) return null;
  return { ...doc, id: doc._id as string };
}

/** Compare two documents by an arbitrary column, numbers and strings alike. */
export function compareBy(field: string, descending: boolean) {
  return (a: Record<string, any>, b: Record<string, any>) => {
    const left = a?.[field] ?? a?.created_at ?? a?._creationTime;
    const right = b?.[field] ?? b?.created_at ?? b?._creationTime;

    let order: number;
    if (typeof left === "number" && typeof right === "number") {
      order = left - right;
    } else {
      order = String(left ?? "").localeCompare(String(right ?? ""));
    }

    return descending ? -order : order;
  };
}
