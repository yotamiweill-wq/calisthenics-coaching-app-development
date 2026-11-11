import { requireTrainee } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Submission } from '@/lib/calisthenics'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { StatsRow } from '@/components/trainee/stats-row'
import { ProgressChart } from '@/components/trainee/progress-chart'
import { SubmissionList } from '@/components/trainee/submission-list'
import { UploadDialog } from '@/components/trainee/upload-dialog'
import { WorkoutCheckin } from '@/components/trainee/workout-checkin'
import { PrCards } from '@/components/trainee/pr-cards'
import { WeeklyReviewBanner } from '@/components/trainee/weekly-review-banner'

export const metadata = { title: 'הדשבורד שלי | STATIC LAB' }

export default async function DashboardPage() {
  const profile = await requireTrainee()
  const supabase = await createClient()

  const { data } = await supabase
    .from('submissions')
    .select(
      'id, exercise, progression, hold_seconds, reps, note, status, video_path, created_at, reviewed_at, feedback(id, kind, body, media_path, batch_id, created_at)',
    )
    .eq('trainee_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: workouts } = await supabase.from('workouts').select('done_on').eq('trainee_id', profile.id)
  const submissions = (data ?? []) as unknown as Submission[]
  const firstName = profile.full_name.split(' ')[0] || 'מתאמן'

  return (
    <div className="min-h-dvh bg-background">
      <TraineeHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">שלום {firstName}</h1>
          <p className="text-muted-foreground">
            {submissions.length === 0
              ? 'מוכנים להתחיל? העלו את ההחזקה הראשונה שלכם.'
              : 'ככה נראית ההתקדמות שלך עד עכשיו.'}
          </p>
        </div>

        <WeeklyReviewBanner lastSubmissionAt={submissions[0]?.created_at ?? null} />
        <UploadDialog userId={profile.id} variant="hero" />
        <WorkoutCheckin userId={profile.id} initialDays={(workouts ?? []).map((w) => w.done_on as string)} />
        <StatsRow submissions={submissions} />
        <PrCards entries={submissions} />
        <ProgressChart submissions={submissions} />
        <SubmissionList submissions={submissions} />
      </main>
    </div>
  )
}
