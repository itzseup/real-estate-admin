import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  agents: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    properties_count: v.optional(v.number()),
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
