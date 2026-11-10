import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/calisthenics'

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, disabled_at')
    .eq('id', user.id)
    .maybeSingle()

  return (data as Profile | null) ?? null
})

export async function requireCoach(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (profile.disabled_at) redirect('/auth/disabled')
  if (profile.role !== 'coach') redirect('/dashboard')
  return profile
}

export async function requireTrainee(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (profile.disabled_at) redirect('/auth/disabled')
  // Outside production a coach may open the trainee views (dev role switcher).
  if (profile.role === 'coach' && process.env.NODE_ENV === 'production') redirect('/coach')
  return profile
}
