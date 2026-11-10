import { requireTrainee } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Announcement } from '@/lib/calisthenics'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { AnnouncementFeed } from '@/components/announcements/announcement-feed'

export const metadata = { title: 'עדכונים | STATIC LAB' }

export default async function TraineeAnnouncementsPage() {
  const profile = await requireTrainee()
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, link_url, media_path, media_kind, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-dvh bg-background">
      <TraineeHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">עדכונים מהמאמן</h1>
          <p className="text-muted-foreground">ערוץ הודעות לקריאה בלבד.</p>
        </div>
        <AnnouncementFeed announcements={(data ?? []) as Announcement[]} />
      </main>
    </div>
  )
}
