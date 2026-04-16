import { createClient } from '@supabase/supabase-js'
import { getDeviceId } from './device'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-device-id': getDeviceId(),
    },
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
