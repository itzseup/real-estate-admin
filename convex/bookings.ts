import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

/**
 * List bookings filtered by agent, date range, or status.
 * Used by: admin dashboard (all bookings), agent portal (own bookings).
 */
export const list = query({
  args: {
    agent_id: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled')),
    ),
    start_after: v.optional(v.number()),
    end_before: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query('bookings')

    if (args.agent_id) {
      const id = ctx.db.normalizeId('agents', args.agent_id)
      if (id) {
        q = q.withIndex('by_agent', (q) => q.eq('agent_id', id))
      }
    }

    if (args.status) {
      q = q.withIndex('by_status', (q) => q.eq('status', args.status))
    }

    if (args.start_after) {
      q = q.withIndex('by_time', (q) =>
        q.gte('start_time', args.start_after as number),
      )
    }

    const docs = await q.take(args.limit ?? 200)

    // Apply remaining filters client-side (Composite indexes not available)
    let items = docs.filter((doc) => {
      if (args.end_before && doc.start_time > args.end_before) return false
      return true
    })

    // Filter out deleted ids
    items = items.filter((doc) => doc)

    return items.map((doc) => ({ ...doc, id: doc._id as unknown as string }))
  },
})

/** Get a single booking by id. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('bookings', args.id)
    if (!id) return null
    const doc = await ctx.db.get(id)
    return doc ? { ...doc, id: doc._id as unknown as string } : null
  },
})

/** Count bookings (optionally by agent or status). */
export const count = query({
  args: {
    agent_id: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled')),
    ),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query('bookings')
    if (args.agent_id) {
      const id = ctx.db.normalizeId('agents', args.agent_id)
      if (id) q = q.withIndex('by_agent', (q) => q.eq('agent_id', id))
    } else {
      q = q.take(2000)
    }
    let items = await q.collect()
    if (args.status) {
      items = items.filter((item) => item.status === args.status)
    }
    return items.length
  },
})

/** Create / update / delete a booking. */
export const create = mutation({
  args: {
    agent_id: v.string(),
    customer_name: v.string(),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    title: v.optional(v.string()),
    start_time: v.number(),
    end_time: v.number(),
    status: v.optional(
      v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled')),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const id = await ctx.db.insert('bookings', {
      agent_id: ctx.db.normalizeId('agents', args.agent_id),
      customer_name: args.customer_name,
      customer_email: args.customer_email,
      customer_phone: args.customer_phone,
      title: args.title,
      start_time: args.start_time,
      end_time: args.end_time,
      status: args.status ?? 'pending',
      notes: args.notes,
      created_at: now,
      updated_at: now,
    })
    const doc = await ctx.db.get(id)
    return { ...doc, id: doc?._id as unknown as string }
  },
})

export const update = mutation({
  args: {
    id: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('bookings', args.id)
    if (!id) return null
    await ctx.db.patch(id, { ...args.payload, updated_at: Date.now() })
    const doc = await ctx.db.get(id)
    return { ...doc, id: doc?._id as unknown as string }
  },
})

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('bookings', args.id)
    if (!id) return false
    await ctx.db.delete(id)
    return true
  },
})

/** Assign a booking to a different agent. */
export const assignToAgent = mutation({
  args: { id: v.string(), agent_id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('bookings', args.id)
    if (!id) throw new Error('Booking not found')
    const agentId = ctx.db.normalizeId('agents', args.agent_id)
    if (!agentId) throw new Error('Agent not found')
    await ctx.db.patch(id, { agent_id: agentId, updated_at: Date.now() })
    return true
  },
})

/** Bulk-import bookings (used by the data migration script). */
export const importBookings = mutation({
  args: { bookings: v.array(v.any()) },
  handler: async (ctx, args) => {
    const now = Date.now()
    const results: string[] = []
    for (const b of args.bookings) {
      const agentId = b.agent_id
        ? ctx.db.normalizeId('agents', String(b.agent_id))
        : undefined
      const id = await ctx.db.insert('bookings', {
        agent_id: agentId,
        customer_name: b.customer_name,
        customer_email: b.customer_email,
        customer_phone: b.customer_phone,
        title: b.title,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status ?? 'pending',
        notes: b.notes,
        created_at: b.created_at ?? now,
        updated_at: b.updated_at ?? now,
      })
      results.push(id as unknown as string)
    }
    return { count: results.length }
  },
})
