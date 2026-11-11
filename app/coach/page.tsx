import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { CoachSubmission, Profile } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { CoachDashboard } from '@/components/coach/coach-dashboard'

export const metadata = { title: 'אזור המאמן | STATIC LAB' }

export default async function CoachPage() {
  const profile = await requireCoach()
  const supabase = await createClient()

  const [{ data: traineeRows }, { data: submissionRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, disabled_at')
      .eq('role', 'trainee')
      .is('removed_at', null)
      .order('full_name', { ascending: true }),
    supabase
      .from('submissions')
      .select(
        'id, trainee_id, exercise, progression, hold_seconds, reps, note, status, video_path, created_at, reviewed_at, feedback(id, kind, body, media_path, batch_id, created_at)',
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const trainees = (traineeRows ?? []) as Profile[]
  const submissions = (submissionRows ?? []) as unknown as CoachSubmission[]
  const firstName = profile.full_name.split(' ')[0] || 'מאמן'

  return (
    <div className="min-h-dvh bg-background">
      <CoachHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">שלום {firstName}</h1>
          <p className="text-muted-foreground">בדקו סרטונים, סמנו על הפריים ושלחו משוב אישי.</p>
        </div>
        <CoachDashboard coachId={profile.id} trainees={trainees} submissions={submissions} />
      </main>
    </div>
  )
}
