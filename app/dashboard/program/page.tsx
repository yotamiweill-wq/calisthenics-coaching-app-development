import { requireTrainee } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Program } from '@/lib/calisthenics'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { ProgramView } from '@/components/program/program-view'

export const metadata = { title: 'התוכנית שלי | STATIC LAB' }

export default async function ProgramPage() {
  const profile = await requireTrainee()
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select('id, trainee_id, title, notes, rows, pdf_path, pdf_name, updated_at')
    .eq('trainee_id', profile.id)
    .maybeSingle()

  return (
    <div className="min-h-dvh bg-background">
      <TraineeHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">התוכנית שלי</h1>
          <p className="text-muted-foreground">תוכנית האימונים האישית שהמאמן הכין עבורך.</p>
        </div>
        <ProgramView program={(data as Program | null) ?? null} />
      </main>
    </div>
  )
}
