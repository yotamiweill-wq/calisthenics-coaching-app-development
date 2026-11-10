'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FilmIcon, Loader2Icon, PlusIcon, UploadCloudIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BASICS, EXERCISES, PROGRESSIONS } from '@/lib/calisthenics'
import type { FolderOption } from '@/lib/progress'
import { ChoiceGroup } from '@/components/trainee/upload-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_BYTES = 50 * 1024 * 1024

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TutorialUploadDialog({
  coachId,
  folders,
  currentFolderId,
}: {
  coachId: string
  folders: FolderOption[]
  currentFolderId: string | null
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState<string>('')
  const [exercise, setExercise] = useState<string | null>(BASICS)
  const [progression, setProgression] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function reset() {
    setFile(null)
    setTitle('')
    setExercise(BASICS)
    setProgression(null)
    setDescription('')
    setError(null)
  }

  function handleFile(selected: File | undefined) {
    if (!selected) return
    if (!selected.type.startsWith('video/')) return setError('אפשר להעלות רק קבצי וידאו.')
    if (selected.size > MAX_BYTES) {
      return setError(`הקובץ גדול מדי (${formatSize(selected.size)}). המקסימום הוא 50 MB.`)
    }
    setError(null)
    setFile(selected)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const cleanTitle = title.trim()

    if (!file) return setError('בחרו סרטון להעלאה.')
    if (!cleanTitle) return setError('הזינו כותרת להדרכה.')
    if (!exercise) return setError('בחרו תרגיל.')
    const isBasics = exercise === BASICS
    if (!isBasics && !progression) return setError('בחרו רמת התקדמות.')

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
    const path = `${coachId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('tutorials')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setError('ההעלאה נכשלה. בדקו את החיבור ונסו שוב.')
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('tutorials').insert({
      title: cleanTitle,
      exercise,
      progression: isBasics ? 'none' : progression,
      folder_id: folderId || null,
      description: description.trim() || null,
      video_path: path,
      created_by: coachId,
    })

    if (insertError) {
      await supabase.storage.from('tutorials').remove([path])
      setError('לא הצלחנו לשמור את ההדרכה. נסו שוב.')
      setUploading(false)
      return
    }

    toast.success('ההדרכה נוספה לספרייה')
    setUploading(false)
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => {
          setFolderId(currentFolderId ?? '')
          setOpen(true)
        }}
        className="h-11 px-5 text-sm font-bold"
      >
        <PlusIcon />
        הדרכה חדשה
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (uploading) return
          setOpen(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">העלאת הדרכה</DialogTitle>
            <DialogDescription>סרטון הדגמה שכל המתאמנים יוכלו לצפות בו בספריית ההדרכות.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              ref={fileInput}
              type="file"
              accept="video/*"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-secondary/40 p-4 text-center transition-colors hover:bg-secondary"
            >
              {file ? (
                <>
                  <FilmIcon className="size-7 text-primary" aria-hidden="true" />
                  <span className="max-w-full truncate text-sm font-semibold" dir="ltr">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatSize(file.size)} · לחצו להחלפה</span>
                </>
              ) : (
                <>
                  <UploadCloudIcon className="size-7 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-semibold">בחרו סרטון הדרכה</span>
                  <span className="text-xs text-muted-foreground">עד 50 MB</span>
                </>
              )}
            </button>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tutorial-title">כותרת</Label>
              <Input
                id="tutorial-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="h-12 text-base"
                placeholder="למשל: מיקום הכתפיים בטאק פלאנץ'"
              />
            </div>

            <ChoiceGroup label="תרגיל" options={EXERCISES} value={exercise} onChange={setExercise} />
            {exercise !== BASICS && (
              <ChoiceGroup
                label="רמת התקדמות"
                options={PROGRESSIONS}
                value={progression}
                onChange={setProgression}
              />
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="tutorial-folder">תיקייה</Label>
              <select
                id="tutorial-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="h-12 rounded-xl border bg-background px-3 text-base"
              >
                <option value="">ללא תיקייה</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tutorial-description">תיאור (לא חובה)</Label>
              <Textarea
                id="tutorial-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="על מה להסתכל, טעויות נפוצות, טיפים"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={uploading} className="h-12 text-base font-bold">
              {uploading ? <Loader2Icon className="animate-spin" /> : <UploadCloudIcon />}
              {uploading ? 'מעלה…' : 'פרסום ההדרכה'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
