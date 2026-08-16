import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { compareBy, FieldSpec, pickFields, serialize } from './fields'

const DEFAULT_LIMIT = 100
const MAX_SCAN = 2000

/**
 * Build the query/mutation set every entity in this app exposes.
 *
 * The shape mirrors the Base44-style contract the admin UI already uses
 * (`list(sort, limit)`, `get(id)`, `count()`, `create`, `update`, `delete`), so
 * src/api/base44Client.js can talk to Convex without the pages changing.
 *
 * Payloads arrive as a single `payload` object rather than named args because
 * the admin form spreads whole records (`{ ...item }`), which carry `id`,
 * `_id`, `_creationTime` and numeric fields typed as strings. pickFields
 * whitelists and coerces them; a strict per-field validator would reject them.
 *
 * `delete` is a reserved word in JS, so the mutation is exported as `remove`.
 */
export function entityApi(table: string, spec: FieldSpec) {
  const list = query({
    args: {
      sortField: v.optional(v.string()),
      sortOrder: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_SCAN))
      const descending = args.sortOrder !== 'asc'
      const sortField = args.sortField || 'created_at'

      // created_at is stamped at insert time, so insertion order and created_at
      // order agree — let the database sort and apply the limit.
      if (sortField === 'created_at' || sortField === '_creationTime') {
        const docs = await ctx.db
          .query(table as any)
          .order(descending ? 'desc' : 'asc')
          .take(limit)
        return docs.map((doc: any) => serialize(doc))
      }

      const docs = await ctx.db.query(table as any).take(MAX_SCAN)
      return docs
        .sort(compareBy(sortField, descending))
        .slice(0, limit)
        .map((doc: any) => serialize(doc))
    },
  })

  const get = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
      // Records created by the localStorage fallback carry plain UUIDs, not
      // Convex ids — normalizeId returns null for those instead of throwing.
      const id = ctx.db.normalizeId(table as any, args.id)
      if (!id) return null
      return serialize(await ctx.db.get(id))
    },
  })

  const count = query({
    args: {},
    handler: async (ctx) => {
      const docs = await ctx.db.query(table as any).collect()
      return docs.length
    },
  })

  const create = mutation({
    args: { payload: v.any() },
    handler: async (ctx, args) => {
      const now = Date.now()
      const record = {
        ...pickFields(ctx, args.payload, spec, 'create'),
        created_at: now,
        updated_at: now,
      }
      const id = await ctx.db.insert(table as any, record as any)
      return serialize(await ctx.db.get(id))
    },
  })

  const update = mutation({
    args: { id: v.string(), payload: v.any() },
    handler: async (ctx, args) => {
      const id = ctx.db.normalizeId(table as any, args.id)
      if (!id) return null

      const patch = {
        ...pickFields(ctx, args.payload, spec, 'patch'),
        updated_at: Date.now(),
      }
      await ctx.db.patch(id, patch as any)
      return serialize(await ctx.db.get(id))
    },
  })

  const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
      const id = ctx.db.normalizeId(table as any, args.id)
      if (!id) return false
      await ctx.db.delete(id)
      return true
    },
  })

  return { list, get, count, create, update, remove }
}
