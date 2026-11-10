import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Folder, Tutorial } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { TutorialLibrary } from '@/components/tutorials/tutorial-library'

export const metadata = { title: 'ניהול הדרכות | STATIC LAB' }

export default async function CoachTutorialsPage() {
  const profile = await requireCoach()
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
      <CoachHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">ספריית הדרכות</h1>
          <p className="text-muted-foreground">
            סרטוני הדגמה לפי תרגיל ורמת התקדמות. המתאמנים רואים אותם בלשונית ההדרכות.
          </p>
        </div>
        <TutorialLibrary tutorials={(data ?? []) as Tutorial[]} folders={(folderRows ?? []) as Folder[]} coachId={profile.id} />
      </main>
    </div>
  )
}
