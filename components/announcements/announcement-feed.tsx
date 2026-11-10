'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ExternalLinkIcon, Loader2Icon, MegaphoneIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signedUrl } from '@/lib/signed-url'
import { formatDateTime, type Announcement } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const MAX_MEDIA_BYTES = 50 * 1024 * 1024

function Media({ item }: { item: Announcement }) {
  const { data: url } = useSWR(item.media_path ? ['announcements', item.media_path] : null, signedUrl, {
    revalidateOnFocus: false,
  })
  if (!item.media_path) return null
  if (!url) return <div className="h-48 animate-pulse rounded-xl bg-secondary" aria-hidden="true" />
  if (item.media_kind === 'video') {
    return <video controls playsInline preload="metadata" src={url} className="max-h-96 w-full rounded-xl bg-black" />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`תמונה מתוך העדכון: ${item.title}`} className="max-h-96 w-full rounded-xl object-contain" />
  )
}

function AnnouncementForm({
  coachId,
  editing,
  onDone,
}: {
  coachId: string
  editing: Announcement | null
  onDone: () => void
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(editing?.title ?? '')
  const [body, setBody] = useState(editing?.body ?? '')
  const [link, setLink] = useState(editing?.link_url ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [removeMedia, setRemoveMedia] = useState(false)
  const [busy, setBusy] = useState(false)

  function pick(next: File | undefined) {
    if (!next) return
    if (!next.type.startsWith('image/') && !next.type.startsWith('video/')) {
      toast.error('אפשר לצרף רק תמונה או סרטון.')
      return
    }
    if (next.size > MAX_MEDIA_BYTES) {
      toast.error('הקובץ גדול מדי. המקסימום הוא 50 MB.')
      return
    }
    setFile(next)
    setRemoveMedia(false)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      toast.error('הקישור חייב להתחיל ב-https://')
      return
    }
    setBusy(true)
    const supabase = createClient()
    let mediaPath = editing?.media_path ?? null
    let mediaKind = editing?.media_kind ?? null

    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
      const path = `${coachId}/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('announcements').upload(path, file, { contentType: file.type })
      if (error) {
        setBusy(false)
        toast.error('העלאת הקובץ נכשלה. נסו שוב.')
        return
      }
      if (editing?.media_path) await supabase.storage.from('announcements').remove([editing.media_path])
      mediaPath = path
      mediaKind = file.type.startsWith('video/') ? 'video' : 'image'
    } else if (removeMedia && editing?.media_path) {
      await supabase.storage.from('announcements').remove([editing.media_path])
      mediaPath = null
      mediaKind = null
    }

    const values = {
      title: title.trim(),
      body: body.trim() || null,
      link_url: link.trim() || null,
      media_path: mediaPath,
      media_kind: mediaKind,
    }
    const { error } = editing
      ? await supabase
          .from('announcements')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
      : await supabase.from('announcements').insert({ ...values, author_id: coachId })

    setBusy(false)
    if (error) {
      toast.error('שמירת העדכון נכשלה.')
      return
    }
    toast.success(editing ? 'העדכון נשמר.' : 'העדכון פורסם והמתאמנים קיבלו התראה.')
    router.refresh()
    onDone()
  }

  const hasMedia = !removeMedia && (file || editing?.media_path)

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        כותרת
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className="h-11" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        תוכן
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        קישור (לא חובה)
        <Input
          type="url"
          dir="ltr"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://"
          className="h-11"
        />
      </label>
      <div className="flex flex-col gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {hasMedia ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border bg-secondary/40 p-3 text-sm">
            <span className="truncate font-medium">{file ? file.name : 'מדיה מצורפת'}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null)
                setRemoveMedia(true)
              }}
            >
              <XIcon />
              הסרה
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" className="h-11" onClick={() => fileInput.current?.click()}>
            <PlusIcon />
            צירוף תמונה או סרטון
          </Button>
        )}
      </div>
      <Button type="submit" size="lg" className="h-11 font-bold" disabled={busy || !title.trim()}>
        {busy && <Loader2Icon className="animate-spin" />}
        {editing ? 'שמירת שינויים' : 'פרסום עדכון'}
      </Button>
    </form>
  )
}

export function AnnouncementFeed({
  announcements,
  coachId,
}: {
  announcements: Announcement[]
  coachId?: string
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  async function remove(item: Announcement) {
    const supabase = createClient()
    const { error } = await supabase.from('announcements').delete().eq('id', item.id)
    if (error) {
      toast.error('המחיקה נכשלה.')
      return
    }
    if (item.media_path) await supabase.storage.from('announcements').remove([item.media_path])
    toast.success('העדכון נמחק.')
    router.refresh()
  }

  return (
    <section aria-label="עדכוני המאמן" className="flex flex-col gap-4">
      {coachId && (
        <Button
          size="lg"
          className="h-12 self-start font-bold"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon />
          עדכון חדש
        </Button>
      )}

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <MegaphoneIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-bold">עוד אין עדכונים</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {coachId ? 'פרסמו את העדכון הראשון למתאמנים.' : 'עדכונים מהמאמן יופיעו כאן.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {announcements.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-lg font-bold text-balance">{item.title}</h2>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
                </div>
                {coachId && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label="עריכת העדכון"
                      onClick={() => {
                        setEditing(item)
                        setFormOpen(true)
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-lg" aria-label="מחיקת העדכון" onClick={() => setDeleting(item)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                )}
              </div>
              {item.body && <p className="whitespace-pre-wrap text-pretty leading-relaxed">{item.body}</p>}
              <Media item={item} />
              {item.link_url && (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold hover:bg-accent"
                >
                  <ExternalLinkIcon className="size-4" aria-hidden="true" />
                  <span dir="ltr" className="max-w-64 truncate">
                    {item.link_url.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {coachId && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'עריכת עדכון' : 'עדכון חדש'}</DialogTitle>
              <DialogDescription>טקסט, קישור ומדיה. המתאמנים רואים את העדכון במצב קריאה בלבד.</DialogDescription>
            </DialogHeader>
            {formOpen && (
              <AnnouncementForm
                key={editing?.id ?? 'new'}
                coachId={coachId}
                editing={editing}
                onDone={() => setFormOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את העדכון?</AlertDialogTitle>
            <AlertDialogDescription>העדכון יוסר מכל המתאמנים. לא ניתן לשחזר.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) void remove(deleting)
                setDeleting(null)
              }}
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
