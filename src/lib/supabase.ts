import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { keepaliveForEvents } from './keepalive'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The browser's Supabase client, or null when the env vars aren't set (the app then runs in
 * device-only demo mode). The publishable key is safe in the browser: row-level security, not
 * the key, protects the data.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { fetch: keepaliveForEvents((...args) => fetch(...args)) },
      })
    : null

export const isCloudConfigured = (): boolean => supabase !== null
