'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FilmIcon, Loader2Icon, PlusIcon, UploadCloudIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BASICS, EXERCISES, PROGRESSIONS } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_BYTES = 50 * 1024 * 1024

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span id={`${label}-label`} className="text-sm font-medium">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`${label}-label`} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 rounded-xl border px-4 text-sm font-semibold transition-colors',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function UploadDialog({
  userId,
  variant = 'default',
}: {
  userId: string
  variant?: 'default' | 'hero'
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [exercise, setExercise] = useState<string | null>(BASICS)
  const [progression, setProgression] = useState<string | null>(null)
  const [seconds, setSeconds] = useState('')
  const [reps, setReps] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const isBasics = exercise === BASICS

  function selectExercise(value: string) {
    setExercise(value)
    if (value === BASICS) setSeconds('')
  }

  function reset() {
    setFile(null)
    setExercise(BASICS)
    setProgression(null)
    setSeconds('')
    setReps('')
    setNote('')
    setError(null)
  }

  function handleFile(selected: File | undefined) {
    if (!selected) return
    if (!selected.type.startsWith('video/')) {
      setError('אפשר להעלות רק קבצי וידאו.')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError(`הקובץ גדול מדי (${formatSize(selected.size)}). המקסימום הוא 50 MB.`)
      return
    }
    setError(null)
    setFile(selected)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const holdText = isBasics ? '' : seconds.trim()
    const repsText = reps.trim()
    const hold = holdText ? Number(holdText) : null
    const repCount = repsText ? Number(repsText) : null

    if (!file) return setError('בחרו סרטון להעלאה.')
    if (!exercise) return setError('בחרו תרגיל.')
    if (!isBasics && !progression) return setError('בחרו רמת התקדמות.')
    if (hold !== null && (!Number.isInteger(hold) || hold < 1 || hold > 600)) {
      return setError('זמן החזקה חייב להיות בין 1 ל-600 שניות, או שאפשר להשאיר ריק.')
    }
    if (repCount !== null && (!Number.isInteger(repCount) || repCount < 1 || repCount > 1000)) {
      return setError('מספר חזרות חייב להיות בין 1 ל-1000, או שאפשר להשאיר ריק.')
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
    const path = `${userId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setError('ההעלאה נכשלה. בדקו את החיבור ונסו שוב.')
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('submissions').insert({
      trainee_id: userId,
      exercise,
      progression: isBasics ? 'none' : progression,
      hold_seconds: hold,
      reps: repCount,
      note: note.trim() || null,
      video_path: path,
    })

    if (insertError) {
      await supabase.storage.from('submissions').remove([path])
      setError('לא הצלחנו לשמור את הסרטון. נסו שוב.')
      setUploading(false)
      return
    }

    toast.success('הסרטון הועלה! המאמן יקבל אותו לבדיקה.')
    setUploading(false)
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'font-bold',
          variant === 'hero' ? 'h-14 w-full text-base' : 'h-11 px-5 text-sm',
        )}
      >
        <PlusIcon />
        העלאת סרטון חדש
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
            <DialogTitle className="text-xl font-black">סרטון החזקה חדש</DialogTitle>
            <DialogDescription>
              צלמו את ההחזקה מהצד, בלי חיתוכים, ושלחו למאמן לקבלת משוב.
            </DialogDescription>
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
                  <span className="text-xs text-muted-foreground">
                    {formatSize(file.size)} · לחצו להחלפה
                  </span>
                </>
              ) : (
                <>
                  <UploadCloudIcon className="size-7 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-semibold">בחרו או צלמו סרטון</span>
                  <span className="text-xs text-muted-foreground">עד 50 MB</span>
                </>
              )}
            </button>

            <ChoiceGroup label="תרגיל" options={EXERCISES} value={exercise} onChange={selectExercise} />
            {!isBasics && (
              <ChoiceGroup
                label="רמת התקדמות"
                options={PROGRESSIONS}
                value={progression}
                onChange={setProgression}
              />
            )}

            <div className={cn('grid gap-3', !isBasics && 'sm:grid-cols-2')}>
              {!isBasics && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="hold">זמן החזקה (שניות, לא חובה)</Label>
                  <Input
                    id="hold"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    dir="ltr"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    className="h-12 text-start text-base"
                    placeholder="10"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="reps">חזרות (לא חובה)</Label>
                <Input
                  id="reps"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  dir="ltr"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="h-12 text-start text-base"
                  placeholder="8"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">הערה למאמן (לא חובה)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="מה הרגשת? איפה נתקעת?"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={uploading} className="h-12 text-base font-bold">
              {uploading ? <Loader2Icon className="animate-spin" /> : <UploadCloudIcon />}
              {uploading ? 'מעלה…' : 'שליחה למאמן'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
