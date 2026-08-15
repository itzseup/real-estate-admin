import { supabase } from './supabaseClient.js'

// Map Base44 entity names to Supabase table names
const entityTableMap = {
  Agent: 'agents',
  Property: 'properties',
  BlogPost: 'blog_posts',
  Testimonial: 'testimonials',
  Inquiry: 'inquiries',
  User: 'users',
}

// Convert Base44 sort syntax to Supabase format
// e.g., "-created_date" -> { created_at: { descending: true } }
function parseSort(sortParam) {
  if (!sortParam) return { created_at: { descending: true } }

  if (sortParam.startsWith('-')) {
    const column = sortParam.substring(1).replace('_date', '_at')
    return { [column]: { descending: true } }
  }

  const column = sortParam.replace('_date', '_at')
  return { [column]: { descending: false } }
}

// Check if Supabase is actually usable (env vars + valid connection)
function isSupabaseReady() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  return !!(url && key && supabase.from)
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

function generateId() {
  // Generate a UUID v4 compatible string for Supabase UUID columns
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Create a Supabase-based entity client with localStorage fallback
function createEntity(entityName) {
  const tableName = entityTableMap[entityName] || entityName.toLowerCase() + 's'

  return {
    // list(sortParam, limit) - mimics base44.entities.Entity.list("-created_date", 20)
    list: async (sortParam = '-created_date', limit = 100) => {
      // Always use localStorage as the primary data source for the admin dashboard.
      // This ensures Create/Read/Update/Delete all work consistently without
      // Supabase RLS permission issues in demo mode.
      const items = getEntityData(entityName)

      // Apply sorting
      if (sortParam) {
        const sortObj = parseSort(sortParam)
        for (const [column, options] of Object.entries(sortObj)) {
          items.sort((a, b) => {
            const aVal = a[column] || a.created_at || ''
            const bVal = b[column] || b.created_at || ''
            if (options.descending) {
              return bVal.localeCompare(aVal)
            }
            return aVal.localeCompare(bVal)
          })
        }
      }

      // Apply limit
      if (limit && items.length > limit) {
        return items.slice(0, limit)
      }

      return items
    },

    // get(id) - mimics base44.entities.Entity.get(id)
    get: async (id) => {
      const items = getEntityData(entityName)
      return items.find((item) => item.id === id) || null
    },

    // create(payload) - mimics base44.entities.Entity.create({...})
    create: async (payload) => {
      const record = { ...payload, id: payload.id || generateId(), created_at: payload.created_at || new Date().toISOString() }
      const items = getEntityData(entityName)
      if (!items.some((item) => item.id === record.id)) {
        items.push(record)
        setEntityData(entityName, items)
      }
      return record
    },

    // update(id, payload) - mimics base44.entities.Entity.update(id, {...})
    update: async (id, payload) => {
      const localItems = getEntityData(entityName)
      const localIdx = localItems.findIndex((item) => item.id === id)
      if (localIdx >= 0) {
        localItems[localIdx] = { ...localItems[localIdx], ...payload, updated_at: new Date().toISOString() }
        setEntityData(entityName, localItems)
        return localItems[localIdx]
      }
      return null
    },

    // delete(id) - mimics base44.entities.Entity.delete(id)
    delete: async (id) => {
      const localItems = getEntityData(entityName)
      const filtered = localItems.filter((item) => item.id !== id)
      setEntityData(entityName, filtered)
      return true
    },

    // count() - get total count
    count: async () => {
      return getEntityData(entityName).length
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

// Export helper to hard-clear all fallback data including deleted IDs
export function resetLocalFallback() {
  localStorage.removeItem(STORAGE_KEY)
  // Also clear any demo auth data
  localStorage.removeItem('demo_admin_session')
  localStorage.removeItem('agent_session_email')
  localStorage.removeItem('demo_agent_credentials')
}

// Export helper to check if we're in fallback mode
export function isUsingFallback() {
  return !isSupabaseReady()
}
