import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { requireAgent } from './lib/authz'
import { entityApi } from './lib/entity'
import { INQUIRY_FIELDS } from './lib/fields'

// CRUD entity surface (unchanged contract — Admin/Inquiry pages rely on it).
export const { list, get, count, create, update, remove } = entityApi(
  'inquiries',
  INQUIRY_FIELDS,
)

/**
 * Role-scoped inquiry feed.
 *
 * - `admin`     → every inquiry (full access).
 * - `agent`     → only inquiries assigned to this agent (agent_assigned set),
 *                 so an agent cannot read another agent's leads through the API.
 * - `customer`  → rejected at the gate (only agents/admins manage inquiries).
 *
 * This is the server-side enforcement of "manage own listings / view assigned
 * inquiries"; the AgentDashboard now calls inquiries.assigned(token) instead of
 * the public entityApi.list + client-side filter, which previously let any
 * caller read every inquiry.
 */
export const assigned = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.auth.findSessionUser, {
      token: args.token,
    })
    // Admit admins and agents; customers get a 403, not an empty list, so the
    // UI can distinguish "no assignments" from "not allowed".
    requireAgent(user)

    let docs: any[]
    if (user!.role === 'admin') {
      docs = await ctx.db
        .query('inquiries')
        .order('desc')
        .take(200)
    } else {
      const agentId = user!.agent_id
      docs = agentId
        ? await ctx.db
            .query('inquiries')
            .withIndex('by_agent', (q: any) => q.eq('agent_assigned', agentId))
            .collect()
        : []
    }

    // Stable serialisable shape (strip the Convex _creationTime, expose id).
    return docs.map((d: any) => ({ ...d, id: d._id as string }))
  },
})

/** Admin/agent-only bulk reassignment of an inquiry to an agent. */
export const assignToAgent = mutation({
  args: {
    token: v.string(),
    inquiry_id: v.string(),
    agent_id: v.optional(v.id('agents')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.auth.findSessionUser, {
      token: args.token,
    })
    requireAgent(user)

    const inquiryId = ctx.db.normalizeId('inquiries', args.inquiry_id)
    if (!inquiryId) throw new ConvexError('Invalid inquiry id.')
    const targetId = args.agent_id
    await ctx.db.patch(inquiryId, {
      agent_assigned: targetId ?? undefined,
      updated_at: Date.now(),
    })
    return true
  },
})
