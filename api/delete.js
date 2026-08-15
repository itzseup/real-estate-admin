// Vercel Serverless Function — Delete records from Supabase using the service role key.
// This bypasses RLS policies that may block the anon key from deleting records.
//
// Requires SUPABASE_SERVICE_ROLE_KEY to be set in Vercel Environment Variables.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate request body
  const { table, id } = req.body
  if (!table || !id) {
    return res.status(400).json({ error: 'Missing table or id' })
  }

  // Validate table name (whitelist to prevent injection)
  const allowedTables = ['agents', 'properties', 'blog_posts', 'testimonials', 'inquiries', 'users']
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Invalid table name' })
  }

  // Check if service role key is configured
  if (!supabaseAdmin) {
    return res.status(500).json({
      error: 'Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in environment variables.',
      fallback: 'Client will use localStorage only',
    })
  }

  try {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting from ${table}:`, error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Delete error:', err)
    return res.status(500).json({ error: err.message })
  }
}
