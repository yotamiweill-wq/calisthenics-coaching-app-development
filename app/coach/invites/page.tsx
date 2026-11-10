import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { InviteRow, InviteStatus } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { InviteManager } from '@/components/coach/invite-manager'

export const metadata = { title: 'הזמנות | STATIC LAB' }

export default async function InvitesPage() {
  const profile = await requireCoach()
  const supabase = await createClient()

  const { data } = await supabase
    .from('invites')
    .select('id, full_name, email, created_at, expires_at, accepted_at')
    .eq('role', 'trainee')
    .order('created_at', { ascending: false })
    .limit(200)

  const now = Date.now()
  const invites: InviteRow[] = (data ?? []).map((row) => {
    const status: InviteStatus = row.accepted_at
      ? 'accepted'
      : row.expires_at && new Date(row.expires_at).getTime() <= now
        ? 'expired'
        : 'pending'
    return { ...row, status }
  })

  return (
    <div className="min-h-dvh bg-background">
      <CoachHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">הזמנות למתאמנים</h1>
          <p className="text-muted-foreground">הרשמה אפשרית רק עם קישור הזמנה חד-פעמי שיצרתם כאן.</p>
        </div>
        <InviteManager invites={invites} />
      </main>
    </div>
  )
}
