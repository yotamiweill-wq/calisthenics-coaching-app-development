import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { CoachChatInbox, type InboxEntry } from '@/components/coach/coach-chat-inbox'

export const metadata = { title: 'צ׳אט עם מתאמנים | STATIC LAB' }

export default async function CoachChatPage({
  searchParams,
}: {
  searchParams: Promise<{ trainee?: string }>
}) {
  const [profile, { trainee }] = await Promise.all([requireCoach(), searchParams])
  const supabase = await createClient()

  const [{ data: traineeRows }, { data: messageRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, disabled_at')
      .eq('role', 'trainee')
      .is('disabled_at', null)
      .order('full_name', { ascending: true }),
    supabase
      .from('messages')
      .select('trainee_id, sender_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const lastByTrainee = new Map<string, { body: string; created_at: string; mine: boolean }>()
  for (const message of messageRows ?? []) {
    if (!lastByTrainee.has(message.trainee_id)) {
      lastByTrainee.set(message.trainee_id, {
        body: message.body,
        created_at: message.created_at,
        mine: message.sender_id === profile.id,
      })
    }
  }

  const entries: InboxEntry[] = ((traineeRows ?? []) as Profile[])
    .map((t) => ({
      id: t.id,
      name: t.full_name || t.email,
      last: lastByTrainee.get(t.id) ?? null,
    }))
    .sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? '') || a.name.localeCompare(b.name, 'he'))

  return (
    <div className="min-h-dvh bg-background">
      <CoachHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">צ׳אט עם מתאמנים</h1>
          <p className="text-muted-foreground">שיחה פרטית אחד על אחד עם כל מתאמן, בזמן אמת.</p>
        </div>
        <CoachChatInbox coachId={profile.id} entries={entries} initialTraineeId={trainee ?? null} />
      </main>
    </div>
  )
}
