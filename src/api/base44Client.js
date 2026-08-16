import { anyApi } from 'convex/server'
import { convexClient } from './supabaseClient.js'

// `anyApi` resolves `api.properties.list` to a `module:function` reference at
// call time — the same mechanism convex/_generated/api.js uses, without
// requiring codegen to have run before `vite build`.
const api = anyApi

// Map Base44 entity names to Convex table names (also the localStorage keys)
const entityTableMap = {
  Agent: 'agents',
  Property: 'properties',
  BlogPost: 'blog_posts',
  Testimonial: 'testimonials',
  Inquiry: 'inquiries',
  User: 'users',
}

// Every entity except User has a Convex module (all built on the shared
// entityApi factory in convex/lib/entity.ts). User has no Convex table, so it
// stays on the localStorage fallback.
const entityConvexModule = {
  Agent: 'agents',
  Property: 'properties',
  Inquiry: 'inquiries',
  BlogPost: 'blogPosts',
  Testimonial: 'testimonials',
}

// Convert Base44 sort syntax to a { field, descending } pair
// e.g., "-created_date" -> { field: 'created_at', descending: true }
function parseSort(sortParam) {
  if (!sortParam) return { field: 'created_at', descending: true }

  if (sortParam.startsWith('-')) {
    const field = sortParam.substring(1).replace('_date', '_at')
    return { field, descending: true }
  }

  const field = sortParam.replace('_date', '_at')
  return { field, descending: false }
}

// Convex is usable when a client exists and the entity has a Convex module
function isConvexReady(entityName) {
  return !!(convexClient && entityConvexModule[entityName])
}

// LocalStorage fallback storage
const STORAGE_KEY = 'base44_fallback_data'

function getLocalStorageData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalStorageData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function getEntityData(entityName) {
  const all = getLocalStorageData()
  const key = entityTableMap[entityName] || entityName.toLowerCase() + 's'
  return all[key] || []
}

function setEntityData(entityName, items) {
  const all = getLocalStorageData()
  const key = entityTableMap[entityName] || entityName.toLowerCase() + 's'
  all[key] = items
  setLocalStorageData(all)
}

// Track IDs that have been deleted so a stale localStorage cache (or a record
// the backend still returns) never reappears in the UI.
function getDeletedIds(entityName) {
  const key = (entityTableMap[entityName] || entityName.toLowerCase() + 's') + ':deleted'
  const all = getLocalStorageData()
  return all[key] || []
}

function addDeletedId(entityName, id) {
  const key = (entityTableMap[entityName] || entityName.toLowerCase() + 's') + ':deleted'
  const all = getLocalStorageData()
  const deleted = all[key] || []
  if (!deleted.includes(id)) {
    deleted.push(id)
    all[key] = deleted
    setLocalStorageData(all)
  }
}

function filterDeletedIds(entityName, items) {
  const deletedIds = getDeletedIds(entityName)
  return items.filter((item) => !deletedIds.includes(item.id))
}

function generateId() {
  // UUID v4 compatible string, used only by the localStorage fallback.
  // Convex assigns its own ids to records that reach the backend.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Timestamps may be epoch numbers (Convex) or ISO strings (older localStorage
// records), so compare them on a common scale.
function toComparable(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return value ?? 0
}

function sortItemsLocally(items, field, descending) {
  return [...items].sort((a, b) => {
    const aVal = toComparable(a[field] ?? a.created_at)
    const bVal = toComparable(b[field] ?? b.created_at)
    if (aVal === bVal) return 0
    const cmp = aVal > bVal ? 1 : -1
    return descending ? -cmp : cmp
  })
}

function localFallbackRecord(payload) {
  return {
    ...payload,
    id: payload.id || generateId(),
    created_at: payload.created_at || Date.now(),
  }
}

// Create a Convex-backed entity client with a localStorage fallback
function createEntity(entityName) {
  const moduleName = entityConvexModule[entityName]

  return {
    // list(sortParam, limit) - mimics base44.entities.Entity.list("-created_date", 20)
    list: async (sortParam = '-created_date', limit = 100) => {
      const { field, descending } = parseSort(sortParam)

      if (!isConvexReady(entityName)) {
        const items = filterDeletedIds(
          entityName,
          sortItemsLocally(getEntityData(entityName), field, descending),
        )
        return limit && items.length > limit ? items.slice(0, limit) : items
      }

      try {
        const docs = await convexClient.query(api[moduleName].list, {
          sortField: field,
          sortOrder: descending ? 'desc' : 'asc',
          limit,
        })
        // Convex is the source of truth here — no merge with localStorage, so
        // the two id schemes can't produce duplicates.
        return filterDeletedIds(entityName, docs || [])
      } catch (convexError) {
        console.warn(`Convex list for ${entityName} failed, using localStorage fallback:`, convexError.message)
        return filterDeletedIds(
          entityName,
          sortItemsLocally(getEntityData(entityName), field, descending),
        )
      }
    },

    // get(id) - mimics base44.entities.Entity.get(id)
    get: async (id) => {
      const fromLocal = () => getEntityData(entityName).find((item) => item.id === id) || null

      if (!isConvexReady(entityName)) return fromLocal()

      try {
        // Returns null for ids the backend doesn't recognise (e.g. a UUID
        // minted by the fallback), so try localStorage before giving up.
        const doc = await convexClient.query(api[moduleName].get, { id: String(id) })
        return doc || fromLocal()
      } catch (convexError) {
        console.warn(`Convex get for ${entityName} (${id}) failed, using localStorage fallback:`, convexError.message)
        return fromLocal()
      }
    },

    // create(payload) - mimics base44.entities.Entity.create({...})
    create: async (payload) => {
      if (!isConvexReady(entityName)) {
        const record = localFallbackRecord(payload)
        const items = getEntityData(entityName)
        items.push(record)
        setEntityData(entityName, items)
        return record
      }

      try {
        // The mutation whitelists and coerces the payload server-side, so the
        // raw form object (extra keys, numbers typed as strings) is safe here.
        return await convexClient.mutation(api[moduleName].create, { payload })
      } catch (convexError) {
        console.error(`Error creating ${entityName} in Convex:`, convexError)
        const record = localFallbackRecord(payload)
        const items = getEntityData(entityName)
        items.push(record)
        setEntityData(entityName, items)
        return record
      }
    },

    // update(id, payload) - mimics base44.entities.Entity.update(id, {...})
    update: async (id, payload) => {
      // Keep the localStorage fallback in sync either way
      const localItems = getEntityData(entityName)
      const localIdx = localItems.findIndex((item) => item.id === id)
      if (localIdx >= 0) {
        localItems[localIdx] = { ...localItems[localIdx], ...payload, updated_at: Date.now() }
        setEntityData(entityName, localItems)
      }

      if (!isConvexReady(entityName)) {
        return localIdx >= 0 ? localItems[localIdx] : null
      }

      try {
        const doc = await convexClient.mutation(api[moduleName].update, {
          id: String(id),
          payload,
        })
        return doc || (localIdx >= 0 ? localItems[localIdx] : null)
      } catch (convexError) {
        console.error(`Error updating ${entityName} (${id}) in Convex:`, convexError)
        return localIdx >= 0 ? localItems[localIdx] : null
      }
    },

    // delete(id) - mimics base44.entities.Entity.delete(id)
    delete: async (id) => {
      // Record the deletion first so list() filters it out even if the backend
      // call fails or the record lingers in a stale cache.
      addDeletedId(entityName, id)

      const localItems = getEntityData(entityName)
      if (localItems.some((item) => item.id === id)) {
        setEntityData(entityName, localItems.filter((item) => item.id !== id))
      }

      if (!isConvexReady(entityName)) return true

      try {
        await convexClient.mutation(api[moduleName].remove, { id: String(id) })
      } catch (convexError) {
        console.error(`Error deleting ${entityName} (${id}) from Convex:`, convexError)
      }
      return true
    },

    // count() - get total count
    count: async () => {
      if (!isConvexReady(entityName)) {
        return getEntityData(entityName).length
      }

      try {
        return await convexClient.query(api[moduleName].count, {})
      } catch (convexError) {
        console.warn(`Convex count for ${entityName} failed, using localStorage fallback:`, convexError.message)
        return getEntityData(entityName).length
      }
    },
  }
}

// Create the compatible base44-like client
export const base44 = {
  entities: {
    Agent: createEntity('Agent'),
    Property: createEntity('Property'),
    BlogPost: createEntity('BlogPost'),
    Testimonial: createEntity('Testimonial'),
    Inquiry: createEntity('Inquiry'),
    User: createEntity('User'),
  },
}

// Export helper to clear localStorage fallback (for testing)
export function clearLocalFallback() {
  localStorage.removeItem(STORAGE_KEY)
}

// Export helper to check if we're in fallback mode
export function isUsingFallback() {
  return !convexClient
}
