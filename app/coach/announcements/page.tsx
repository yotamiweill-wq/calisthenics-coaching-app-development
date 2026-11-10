import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Announcement } from '@/lib/calisthenics'
import { CoachHeader } from '@/components/coach/coach-header'
import { AnnouncementFeed } from '@/components/announcements/announcement-feed'

export const metadata = { title: 'עדכונים | STATIC LAB' }

export default async function CoachAnnouncementsPage() {
  const profile = await requireCoach()
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, link_url, media_path, media_kind, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-dvh bg-background">
      <CoachHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">עדכונים למתאמנים</h1>
          <p className="text-muted-foreground">פרסמו טקסט, קישורים ומדיה. המתאמנים רואים אותם בלבד, ללא יכולת תגובה.</p>
        </div>
        <AnnouncementFeed announcements={(data ?? []) as Announcement[]} coachId={profile.id} />
      </main>
    </div>
  )
}
