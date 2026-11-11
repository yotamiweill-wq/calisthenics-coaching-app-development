import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRightIcon } from 'lucide-react'
import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Program } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { TraineeWorkspace } from '@/components/coach/trainee-workspace'

export const metadata = { title: 'פרופיל מתאמן | STATIC LAB' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TraineeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const coach = await requireCoach()
  const supabase = await createClient()

  const { data: trainee } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', id)
    .eq('role', 'trainee')
    .is('removed_at', null)
    .maybeSingle()
  if (!trainee) notFound()

  const [{ data: submissions }, { data: workouts }, { data: program }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, exercise, progression, hold_seconds, reps, created_at')
      .eq('trainee_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('workouts').select('done_on').eq('trainee_id', id),
    supabase.from('programs').select('id, trainee_id, title, notes, rows, pdf_path, pdf_name, updated_at').eq('trainee_id', id).maybeSingle(),
  ])

  return (
    <div className="min-h-dvh bg-background">
      <div className="print:hidden">
        <CoachHeader fullName={coach.full_name} />
      </div>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 pb-16">
        <Link
          href="/coach"
          className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground print:hidden"
        >
          <ArrowRightIcon className="size-4" aria-hidden="true" />
          חזרה לרשימה
        </Link>
        <div className="flex flex-col gap-1 print:hidden">
          <h1 className="text-3xl font-black tracking-tight text-balance">{trainee.full_name || 'מתאמן'}</h1>
          <p className="text-muted-foreground" dir="ltr" style={{ textAlign: 'start' }}>
            {trainee.email}
          </p>
        </div>
        <TraineeWorkspace
          coachId={coach.id}
          trainee={{ id: trainee.id, full_name: trainee.full_name }}
          submissions={submissions ?? []}
          workoutDays={(workouts ?? []).map((w) => w.done_on as string)}
          program={(program as Program | null) ?? null}
        />
      </main>
    </div>
  )
}
