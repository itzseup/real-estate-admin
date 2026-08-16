import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Roles understood by the app's role-based access control.
export const roles = ['admin', 'agent', 'customer'] as const
export type Role = (typeof roles)[number]

export default defineSchema({
  // Login accounts. `password_hash` is a bcrypt digest produced in
  // convex/lib/password.ts — a plaintext password never reaches this table.
  // The `role` field drives role-based access control (see convex/lib/authz.ts).
  users: defineTable({
    name: v.string(),
    email: v.string(),
    password_hash: v.string(),
    role: v.optional(
      v.union(
        v.literal('admin'),
        v.literal('agent'),
        v.literal('customer'),
      ),
    ),
    // Link a `user` (auth identity) to an `agents` profile row when role==="agent".
    agent_id: v.optional(v.id('agents')),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  // Issued auth session tokens. Kept out of `users` so a token can expire and be
  // revoked independently, and so one account can hold several sessions.
  sessions: defineTable({
    token: v.string(),
    user_id: v.id('users'),
    expires_at: v.number(),
    created_at: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['user_id']),

  agents: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    properties_count: v.optional(v.number()),
    // Agents log in too. Both are optional because existing agent rows predate
    // auth — a required column here would fail schema validation on them.
    password_hash: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal('admin'),
        v.literal('agent'),
        v.literal('customer'),
      ),
    ),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  }).index('by_email', ['email']),

  properties: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip_code: v.string(),
    country: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    area_sqft: v.optional(v.number()),
    property_type: v.string(),
    status: v.string(),
    featured: v.boolean(),
    agent_id: v.optional(v.id('agents')),
    image_urls: v.optional(v.array(v.string())),
    featured_image: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index('by_agent', ['agent_id'])
    .index('by_status', ['status'])
    .index('by_featured', ['featured']),

  inquiries: defineTable({
    full_name: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    inquiry_type: v.optional(v.string()),
    status: v.optional(v.string()),
    agent_assigned: v.optional(v.id('agents')),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index('by_agent', ['agent_assigned'])
    .index('by_status', ['status']),

  // Customer appointments ("bookings"). A customer (role === "customer") books
  // a slot; an agent (role === "agent") is assigned to serve it.
  bookings: defineTable({
    agent_id: v.optional(v.id('agents')),
    customer_name: v.string(),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    title: v.optional(v.string()),
    start_time: v.number(),
    end_time: v.number(),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('confirmed'),
        v.literal('cancelled'),
      ),
    ),
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index('by_agent', ['agent_id'])
    .index('by_status', ['status'])
    .index('by_time', ['start_time']),

  blog_posts: defineTable({
    title: v.string(),
    content: v.optional(v.string()),
    slug: v.string(),
    published: v.boolean(),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  }).index('by_slug', ['slug']),

  testimonials: defineTable({
    name: v.string(),
    content: v.string(),
    role: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  }),
})
