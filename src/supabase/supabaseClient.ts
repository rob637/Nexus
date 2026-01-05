import { createClient } from '@supabase/supabase-js'

// These environment variables will be set in your hosting provider (Firebase or Cloudflare)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Motus99: Supabase credentials not found. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
