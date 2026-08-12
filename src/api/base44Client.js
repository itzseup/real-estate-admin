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
      if (!isSupabaseReady()) {
        // localStorage fallback
        const items = getEntityData(entityName)
        return items
      }

      const sortObj = parseSort(sortParam)
      let query = supabase.from(tableName).select('*')

      for (const [column, options] of Object.entries(sortObj)) {
        query = query.order(column, options)
      }

      query = query.limit(limit)

      const { data, error } = await query
      if (error) {
        console.error(`Error listing ${entityName}:`, error)
        return getEntityData(entityName)
      }
      const items = data || []
      // Merge with localStorage (to include records saved via fallback)
      const localItems = getEntityData(entityName)
      const merged = [...items]
      for (const localItem of localItems) {
        if (!merged.find((item) => item.id === localItem.id)) {
          merged.push(localItem)
        }
      }
      setEntityData(entityName, merged)
      return merged
    },

    // get(id) - mimics base44.entities.Entity.get(id)
    get: async (id) => {
      if (!isSupabaseReady()) {
        const items = getEntityData(entityName)
        return items.find((item) => item.id === id) || null
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error(`Error getting ${entityName}:`, error)
        const items = getEntityData(entityName)
        return items.find((item) => item.id === id) || null
      }
      return data
    },

    // create(payload) - mimics base44.entities.Entity.create({...})
    create: async (payload) => {
      const record = { ...payload, id: payload.id || generateId(), created_at: payload.created_at || new Date().toISOString() }

      if (!isSupabaseReady()) {
        const items = getEntityData(entityName)
        items.push(record)
        setEntityData(entityName, items)
        return record
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()

      if (error) {
        console.error(`Error creating ${entityName}:`, error)
        const items = getEntityData(entityName)
        items.push(record)
        setEntityData(entityName, items)
        return record
      }
      return data
    },

    // update(id, payload) - mimics base44.entities.Entity.update(id, {...})
    update: async (id, payload) => {
      if (!isSupabaseReady()) {
        const items = getEntityData(entityName)
        const idx = items.findIndex((item) => item.id === id)
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...payload }
          setEntityData(entityName, items)
          return items[idx]
        }
        return null
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating ${entityName}:`, error)
        const items = getEntityData(entityName)
        const idx = items.findIndex((item) => item.id === id)
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...payload }
          setEntityData(entityName, items)
          return items[idx]
        }
        return null
      }
      return data
    },

    // delete(id) - mimics base44.entities.Entity.delete(id)
    delete: async (id) => {
      if (!isSupabaseReady()) {
        const items = getEntityData(entityName)
        const filtered = items.filter((item) => item.id !== id)
        setEntityData(entityName, filtered)
        return true
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Error deleting ${entityName}:`, error)
        const items = getEntityData(entityName)
        const filtered = items.filter((item) => item.id !== id)
        setEntityData(entityName, filtered)
        return true
      }
      return true
    },

    // count() - get total count
    count: async () => {
      if (!isSupabaseReady()) {
        return getEntityData(entityName).length
      }

      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error(`Error counting ${entityName}:`, error)
        return getEntityData(entityName).length
      }
      return count
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
  return !isSupabaseReady()
}
