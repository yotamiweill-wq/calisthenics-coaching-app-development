'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronLeftIcon,
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  Loader2Icon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  exerciseEnglish,
  exerciseLabel,
  progressionLabel,
  type Folder,
  type Tutorial,
} from '@/lib/calisthenics'
import { flattenFolders } from '@/lib/progress'
import { TutorialUploadDialog } from '@/components/coach/tutorial-upload-dialog'
import { TutorialPlayerDialog } from '@/components/tutorials/tutorial-player-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

function TutorialCard({
  tutorial,
  folderOptions,
  canManage,
  onPlay,
}: {
  tutorial: Tutorial
  folderOptions: { id: string; label: string }[]
  canManage: boolean
  onPlay: () => void
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('tutorials').delete().eq('id', tutorial.id)
      if (error) {
        toast.error('המחיקה נכשלה. נסו שוב.')
        setConfirming(false)
        return
      }
      await supabase.storage.from('tutorials').remove([tutorial.video_path])
      toast.success('ההדרכה נמחקה')
      router.refresh()
    })
  }

  function move(folderId: string) {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tutorials')
        .update({ folder_id: folderId || null })
        .eq('id', tutorial.id)
      if (error) {
        toast.error('ההעברה נכשלה. נסו שוב.')
        return
      }
      toast.success('הסרטון הועבר')
      router.refresh()
    })
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={onPlay}
        className="group relative flex aspect-video items-center justify-center overflow-hidden bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`צפייה בהדרכה: ${tutorial.title}`}
      >
        <span
          aria-hidden="true"
          dir="ltr"
          className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1/4 text-center text-5xl font-black uppercase tracking-tighter text-foreground/5"
        >
          {exerciseEnglish(tutorial.exercise)}
        </span>
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
          <PlayIcon className="size-6 fill-current" aria-hidden="true" />
        </span>
        <Badge variant="secondary" className="absolute start-3 top-3 bg-background/80">
          {exerciseLabel(tutorial.exercise)}
          {tutorial.progression !== 'none' && ` · ${progressionLabel(tutorial.progression)}`}
        </Badge>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-snug text-balance">{tutorial.title}</h3>
        {tutorial.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{tutorial.description}</p>
        )}
        {canManage && (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              העברה לתיקייה
              <select
                value={tutorial.folder_id ?? ''}
                onChange={(e) => move(e.target.value)}
                disabled={pending}
                className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm text-foreground"
              >
                <option value="">ללא תיקייה</option>
                {folderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-end">
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="lg" onClick={remove} disabled={pending}>
                    {pending && <Loader2Icon className="animate-spin" />}
                    למחוק לצמיתות
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => setConfirming(false)} disabled={pending}>
                    חזרה
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setConfirming(true)}
                  aria-label={`מחיקת ההדרכה ${tutorial.title}`}
                >
                  <Trash2Icon />
                  מחיקה
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

function FolderNameDialog({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  initial: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (!clean) return
    setBusy(true)
    await onSave(clean)
    setBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{title}</DialogTitle>
            <DialogDescription>שם התיקייה יוצג למתאמנים.</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
            aria-label="שם התיקייה"
            className="h-12 text-base"
          />
          <DialogFooter>
            <Button type="submit" disabled={busy || !name.trim()} className="h-11 font-bold">
              {busy && <Loader2Icon className="animate-spin" />}
              שמירה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TutorialLibrary({
  tutorials,
  folders,
  coachId,
}: {
  tutorials: Tutorial[]
  folders: Folder[]
  coachId?: string
}) {
  const router = useRouter()
  const canManage = !!coachId
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState<Tutorial | null>(null)
  const [dialog, setDialog] = useState<{ mode: 'create' | 'rename'; folder?: Folder } | null>(null)
  const [deleting, setDeleting] = useState<Folder | null>(null)
  const [deletePending, startDelete] = useTransition()

  const folderOptions = useMemo(() => flattenFolders(folders), [folders])
  const current = folders.find((f) => f.id === currentId) ?? null

  const trail = useMemo(() => {
    const list: Folder[] = []
    let cursor = current
    while (cursor) {
      list.unshift(cursor)
      const parentId: string | null = cursor.parent_id
      cursor = parentId ? (folders.find((f) => f.id === parentId) ?? null) : null
    }
    return list
  }, [current, folders])

  const subfolders = folders
    .filter((f) => f.parent_id === currentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'he'))
  const visible = tutorials.filter((t) => (t.folder_id ?? null) === currentId)

  function countIn(folderId: string): number {
    const children = folders.filter((f) => f.parent_id === folderId)
    return (
      tutorials.filter((t) => t.folder_id === folderId).length +
      children.reduce((sum, child) => sum + countIn(child.id), 0)
    )
  }

  async function saveFolder(name: string) {
    const supabase = createClient()
    if (dialog?.mode === 'rename' && dialog.folder) {
      const { error } = await supabase.from('folders').update({ name }).eq('id', dialog.folder.id)
      if (error) return void toast.error('שינוי השם נכשל.')
    } else {
      const { error } = await supabase.from('folders').insert({
        name,
        parent_id: currentId,
        sort_order: subfolders.length + 10,
        created_by: coachId,
      })
      if (error) return void toast.error('יצירת התיקייה נכשלה.')
    }
    setDialog(null)
    router.refresh()
  }

  function removeFolder() {
    if (!deleting) return
    startDelete(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('folders').delete().eq('id', deleting.id)
      if (error) return void toast.error('המחיקה נכשלה.')
      if (currentId === deleting.id) setCurrentId(deleting.parent_id)
      setDeleting(null)
      toast.success('התיקייה נמחקה. הסרטונים שבתוכה הועברו לראשי.')
      router.refresh()
    })
  }

  const empty = subfolders.length === 0 && visible.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="נתיב תיקיות" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setCurrentId(null)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 font-semibold hover:bg-accent"
            aria-current={currentId === null ? 'page' : undefined}
          >
            <HomeIcon className="size-4" aria-hidden="true" />
            כל ההדרכות
          </button>
          {trail.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronLeftIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setCurrentId(folder.id)}
                aria-current={folder.id === currentId ? 'page' : undefined}
                className="h-9 rounded-lg px-2 font-semibold hover:bg-accent"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {current && (
              <>
                <Button variant="secondary" size="lg" onClick={() => setDialog({ mode: 'rename', folder: current })}>
                  <PencilIcon />
                  שינוי שם
                </Button>
                <Button variant="ghost" size="lg" onClick={() => setDeleting(current)}>
                  <Trash2Icon />
                  מחיקת תיקייה
                </Button>
              </>
            )}
            <Button variant="secondary" size="lg" onClick={() => setDialog({ mode: 'create' })}>
              <FolderPlusIcon />
              {current ? 'תת-תיקייה' : 'תיקייה חדשה'}
            </Button>
            <TutorialUploadDialog coachId={coachId} folders={folderOptions} currentFolderId={currentId} />
          </div>
        )}
      </div>

      {subfolders.length > 0 && (
        <ul aria-label="תיקיות" className="grid gap-3 sm:grid-cols-2">
          {subfolders.map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                onClick={() => setCurrentId(folder.id)}
                className="flex h-full w-full items-center gap-3 rounded-2xl border bg-card p-4 text-start transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FolderIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{countIn(folder.id)} סרטונים</span>
                </span>
                <ChevronLeftIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              folderOptions={folderOptions}
              canManage={canManage}
              onPlay={() => setPlaying(tutorial)}
            />
          ))}
        </ul>
      )}

      {empty && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-bold">{current ? 'התיקייה ריקה' : 'ספריית ההדרכות ריקה'}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canManage
              ? 'צרו תיקיות והעלו הדרכות כדי שהמתאמנים יוכלו ללמוד מהן.'
              : 'המאמן עוד לא הוסיף הדרכות לכאן.'}
          </p>
        </div>
      )}

      {dialog && (
        <FolderNameDialog
          key={dialog.folder?.id ?? 'new'}
          open
          title={dialog.mode === 'rename' ? 'שינוי שם תיקייה' : current ? 'תת-תיקייה חדשה' : 'תיקייה חדשה'}
          initial={dialog.mode === 'rename' ? (dialog.folder?.name ?? '') : ''}
          onClose={() => setDialog(null)}
          onSave={saveFolder}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(next) => !next && !deletePending && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">למחוק את &quot;{deleting?.name}&quot;?</DialogTitle>
            <DialogDescription>
              תת-התיקיות יימחקו גם הן. הסרטונים לא יימחקו, אלא יועברו לראשי.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={removeFolder} disabled={deletePending} className="h-11 font-bold">
              {deletePending && <Loader2Icon className="animate-spin" />}
              מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TutorialPlayerDialog tutorial={playing} onClose={() => setPlaying(null)} />
    </div>
  )
}
