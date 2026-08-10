import { supabase } from './supabaseClient.js'

// Map Base44 entity names to Supabase table names
const entityTableMap = {
  Agent: 'agents',
  Property: 'properties',
  BlogPost: 'blog_posts',
  Testimonial: 'testimonials',
  Inquiry: 'inquiries',
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

// Create a Supabase-based entity client compatible with Base44 API
function createEntity(entityName) {
  const tableName = entityTableMap[entityName] || entityName.toLowerCase() + 's'
  
  return {
    // list(sortParam, limit) - mimics base44.entities.Entity.list("-created_date", 20)
    list: async (sortParam = '-created_date', limit = 100) => {
      const sortObj = parseSort(sortParam)
      let query = supabase.from(tableName).select('*')
      
      for (const [column, options] of Object.entries(sortObj)) {
        query = query.order(column, options)
      }
      
      query = query.limit(limit)
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    
    // get(id) - mimics base44.entities.Entity.get(id)
    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    
    // create(payload) - mimics base44.entities.Entity.create({...})
    create: async (payload) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    // update(id, payload) - mimics base44.entities.Entity.update(id, {...})
    update: async (id, payload) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    // delete(id) - mimics base44.entities.Entity.delete(id)
    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    },
    
    // count() - get total count
    count: async () => {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) throw error
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
  },
}
