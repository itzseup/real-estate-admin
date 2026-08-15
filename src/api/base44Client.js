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

// Track IDs that have been deleted (for when Supabase returns stale data)
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

      try {
        const sortObj = parseSort(sortParam)
        let query = supabase.from(tableName).select('*')

        for (const [column, options] of Object.entries(sortObj)) {
          query = query.order(column, options)
        }

        query = query.limit(limit)

        const { data, error } = await query
        if (error) {
          console.error(`Error listing ${entityName}:`, error)
          return filterDeletedIds(entityName, getEntityData(entityName))
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
        // Filter out any items that have been soft-deleted
        return filterDeletedIds(entityName, merged)
      } catch (supabaseError) {
        console.warn(`Supabase list for ${entityName} failed, using localStorage fallback:`, supabaseError.message)
        return filterDeletedIds(entityName, getEntityData(entityName))
      }
    },

    // get(id) - mimics base44.entities.Entity.get(id)
    get: async (id) => {
      if (!isSupabaseReady()) {
        const items = getEntityData(entityName)
        return items.find((item) => item.id === id) || null
      }

      try {
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
      } catch (supabaseError) {
        console.warn(`Supabase get for ${entityName} (${id}) failed, using localStorage fallback:`, supabaseError.message)
        const items = filterDeletedIds(entityName, getEntityData(entityName))
        return items.find((item) => item.id === id) || null
      }
    },

    // create(payload) - mimics base44.entities.Entity.create({...})
    create: async (payload) => {
      const record = { ...payload, id: payload.id || generateId(), created_at: payload.created_at || new Date().toISOString() }

      // Always write to localStorage fallback so list() (which merges) picks it up
      const items = getEntityData(entityName)
      if (!items.some((item) => item.id === record.id)) {
        items.push(record)
        setEntityData(entityName, items)
      }

      if (!isSupabaseReady()) {
        return record
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(record)
          .select()
          .single()

        if (error) {
          console.error(`Error creating ${entityName}:`, error)
          return record
        }
        return data || record
      } catch (supabaseError) {
        console.warn(`Supabase create for ${entityName} failed, using localStorage fallback:`, supabaseError.message)
        return record
      }
    },

    // update(id, payload) - mimics base44.entities.Entity.update(id, {...})
    update: async (id, payload) => {
      const record = { ...payload, updated_at: new Date().toISOString() }

      // Always update localStorage fallback so list() (which merges) picks it up
      const localItems = getEntityData(entityName)
      const localIdx = localItems.findIndex((item) => item.id === id)
      if (localIdx >= 0) {
        localItems[localIdx] = { ...localItems[localIdx], ...payload }
        setEntityData(entityName, localItems)
      }

      if (!isSupabaseReady()) {
        return localItems[localIdx] || null
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error(`Error updating ${entityName}:`, error)
          return localItems[localIdx] || null
        }
        return data || localItems[localIdx] || null
      } catch (supabaseError) {
        console.warn(`Supabase update for ${entityName} (${id}) failed, using localStorage fallback:`, supabaseError.message)
        return localItems[localIdx] || null
      }
    },

    // delete(id) - mimics base44.entities.Entity.delete(id)
    delete: async (id) => {
      // Always track deleted ID (handles case where Supabase returns stale data
      // and list() merges it back in)
      addDeletedId(entityName, id)

      // Always remove from localStorage fallback (handles the case where
      // isSupabaseReady() is true but Supabase is a mock/unreachable, and
      // list() merges localStorage data back in)
      const localItems = getEntityData(entityName)
      if (localItems.some((item) => item.id === id)) {
        const filtered = localItems.filter((item) => item.id !== id)
        setEntityData(entityName, filtered)
      }

      if (!isSupabaseReady()) {
        return true
      }

      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id)

        if (error) {
          console.error(`Error deleting ${entityName} from Supabase:`, error)
        }
      } catch (supabaseError) {
        // Supabase mock client may not support full chaining (e.g., .delete().eq())
        // The localStorage deletion and deleted-ID tracking above already handled
        // the local copy, so this error can be safely swallowed.
        console.warn(`Supabase delete for ${entityName} (${id}) skipped:`, supabaseError.message)
      }
      return true
    },

    // count() - get total count
    count: async () => {
      if (!isSupabaseReady()) {
        return getEntityData(entityName).length
      }

      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.error(`Error counting ${entityName}:`, error)
          return filterDeletedIds(entityName, getEntityData(entityName)).length
        }
        return count
      } catch (supabaseError) {
        console.warn(`Supabase count for ${entityName} failed, using localStorage fallback:`, supabaseError.message)
        return filterDeletedIds(entityName, getEntityData(entityName)).length
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
  return !isSupabaseReady()
}
