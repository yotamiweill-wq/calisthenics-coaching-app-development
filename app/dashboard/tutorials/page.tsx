import { requireTrainee } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Folder, Tutorial } from '@/lib/calisthenics'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { TutorialLibrary } from '@/components/tutorials/tutorial-library'

export const metadata = { title: 'הדרכות | STATIC LAB' }

export default async function TraineeTutorialsPage() {
  const profile = await requireTrainee()
  const supabase = await createClient()

  const [{ data }, { data: folderRows }] = await Promise.all([
    supabase
      .from('tutorials')
      .select('id, title, description, exercise, progression, video_path, folder_id, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('folders').select('id, parent_id, name, sort_order').order('sort_order', { ascending: true }),
  ])

  return (
    <div className="min-h-dvh bg-background">
      <TraineeHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">הדרכות</h1>
          <p className="text-muted-foreground">למדו את הטכניקה לפני שמעלים את ההחזקה הבאה.</p>
        </div>
        <TutorialLibrary tutorials={(data ?? []) as Tutorial[]} folders={(folderRows ?? []) as Folder[]} />
      </main>
    </div>
  )
}
