import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client. Bypasses RLS, so only use it after verifying the caller is a coach.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
