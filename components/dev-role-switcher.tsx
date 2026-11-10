import { getProfile } from '@/lib/auth'
import { DevRoleSwitcherLinks } from '@/components/dev-role-switcher-links'

// TEMPORARY: lets a signed-in coach preview the trainee screens. Renders nothing in production
// or for non-coach accounts; requireTrainee() enforces the same rule on the server.
export async function DevRoleSwitcher() {
  if (process.env.NODE_ENV === 'production') return null
  const profile = await getProfile()
  if (profile?.role !== 'coach') return null
  return <DevRoleSwitcherLinks />
}
