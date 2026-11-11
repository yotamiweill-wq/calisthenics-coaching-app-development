import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import type { Profile } from '@/lib/calisthenics'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns the signed-in, enabled coach, or null. Never redirects, so server actions can return errors. */
export async function getActiveCoach(): Promise<Profile | null> {
  const profile = await getProfile()
  if (!profile || profile.role !== 'coach' || profile.disabled_at) return null
  return profile
}

/**
 * True when the current session was created by clicking the emailed link (recovery / one-time-password
 * sign-in) after the given moment. This is what proves the coach read the approval email.
 */
export async function hasEmailVerificationSince(sinceIso: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const amr = (data?.claims as { amr?: Array<{ method?: string; timestamp?: number }> } | undefined)?.amr
  if (!Array.isArray(amr)) return false
  const since = Math.floor(new Date(sinceIso).getTime() / 1000) - 5
  return amr.some((entry) => (entry.method === 'recovery' || entry.method === 'otp') && (entry.timestamp ?? 0) >= since)
}
