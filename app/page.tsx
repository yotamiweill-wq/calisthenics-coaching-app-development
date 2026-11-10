import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function HomePage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (profile.disabled_at) redirect('/auth/disabled')
  redirect(profile.role === 'coach' ? '/coach' : '/dashboard')
}
