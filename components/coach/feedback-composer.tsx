'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ImageIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  MicIcon,
  MonitorIcon,
  RotateCcwIcon,
  SendIcon,
  SquareIcon,
} from 'lucide-react'
import { sendFeedback } from '@/lib/send-feedback'
import { FEEDBACK_PRESETS } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScreenRecorder, type ScreenRecording } from '@/components/coach/screen-recorder'
import { cn } from '@/lib/utils'

type Mode = 'text' | 'voice' | 'screen' | 'image'

const MODES: { value: Mode; label: string; icon: typeof MicIcon }[] = [
  { value: 'text', label: 'טקסט', icon: MessageSquareTextIcon },
  { value: 'voice', label: 'הקלטה', icon: MicIcon },
  { value: 'screen', label: 'מסך', icon: MonitorIcon },
  { value: 'image', label: 'תמונה', icon: ImageIcon },
]

const MAX_RECORD_SECONDS = 180
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function pickAudioMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))
}

function extensionFor(mime: string) {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

interface ComposerProps {
  submissionIds: string[]
  traineeId: string
  coachId: string
  onSent: () => void
}

function VoiceRecorder({ onSubmit, busy }: { onSubmit: (blob: Blob, mime: string) => void; busy: boolean }) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<{ blob: Blob; url: string; mime: string } | null>(null)

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(() => {
    if (recording && seconds >= MAX_RECORD_SECONDS) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording])

  useEffect(() => {
    return () => {
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url)
    }
  }, [result])

  async function start() {
    const mime = pickAudioMime()
    if (!mime) {
      toast.error('הדפדפן לא תומך בהקלטת שמע.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data)
      recorder.onstop = () => {
        const type = mime.split(';')[0]
        const blob = new Blob(chunksRef.current, { type })
        setResult({ blob, url: URL.createObjectURL(blob), mime: type })
        stream.getTracks().forEach((track) => track.stop())
      }
      recorderRef.current = recorder
      setSeconds(0)
      setResult(null)
      recorder.start()
      setRecording(true)
    } catch {
      toast.error('אין גישה למיקרופון. אשרו הרשאה בדפדפן ונסו שוב.')
    }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setRecording(false)
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <audio controls src={result.url} className="h-10 w-full" />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="h-11 flex-1 font-bold"
            onClick={() => setResult(null)}
            disabled={busy}
          >
            <RotateCcwIcon />
            הקלטה מחדש
          </Button>
          <Button
            size="lg"
            className="h-11 flex-1 font-bold"
            onClick={() => onSubmit(result.blob, result.mime)}
            disabled={busy}
          >
            {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            שליחה
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-5">
      <Button
        size="icon-lg"
        variant={recording ? 'destructive' : 'default'}
        className="size-16 rounded-full"
        onClick={recording ? stop : start}
        aria-label={recording ? 'עצירת הקלטה' : 'התחלת הקלטה'}
      >
        {recording ? <SquareIcon className="size-6" /> : <MicIcon className="size-6" />}
      </Button>
      <span
        className={cn('text-lg font-black tabular-nums', recording && 'text-destructive')}
        aria-live="polite"
      >
        {recording ? `מקליט… ${clock}` : 'לחצו כדי להקליט משוב קולי'}
      </span>
    </div>
  )
}

export function FeedbackComposer({ submissionIds, traineeId, coachId, onSent }: ComposerProps) {
  const imageInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('text')
  const [text, setText] = useState('')
  const [image, setImage] = useState<{ file: File; url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.url)
    }
  }, [image])

  async function submit(input: Parameters<typeof sendFeedback>[0]) {
    setBusy(true)
    const failure = await sendFeedback(input)
    setBusy(false)
    if (failure) {
      toast.error(failure)
      return false
    }
    toast.success(submissionIds.length > 1 ? 'המשוב נשלח עבור כל האימון.' : 'המשוב נשלח למתאמן.')
    onSent()
    return true
  }

  const base = { submissionIds, traineeId, coachId }

  async function sendText(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    if (await submit({ ...base, kind: 'text', body: text })) setText('')
  }

  async function sendVoice(blob: Blob, mime: string) {
    await submit({
      ...base,
      kind: 'voice',
      media: { blob, contentType: mime, extension: extensionFor(mime) },
    })
  }

  async function sendScreen(recording: ScreenRecording) {
    await submit({
      ...base,
      kind: 'video',
      body: recording.caption,
      media: { blob: recording.blob, contentType: recording.contentType, extension: recording.extension },
    })
  }

  async function sendImage() {
    if (!image) return
    const isPng = image.file.type === 'image/png'
    const done = await submit({
      ...base,
      kind: 'image',
      body: caption,
      media: { blob: image.file, contentType: image.file.type, extension: isPng ? 'png' : 'jpg' },
    })
    if (done) {
      setImage(null)
      setCaption('')
    }
  }

  function pickImage(file: File | undefined) {
    if (!file) return
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      toast.error('אפשר לשלוח רק תמונות PNG או JPG.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('התמונה גדולה מדי. המקסימום הוא 10 MB.')
      return
    }
    setImage({ file, url: URL.createObjectURL(file) })
  }

  return (
    <section aria-label="כתיבת משוב" className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div role="tablist" aria-label="סוג משוב" className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={mode === item.value}
            onClick={() => setMode(item.value)}
            className={cn(
              'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-all active:scale-95',
              mode === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'text' && (
        <form onSubmit={sendText} className="flex flex-col gap-3">
          <label htmlFor="feedback-text" className="sr-only">
            טקסט המשוב
          </label>
          <div role="group" aria-label="תגיות משוב מהירות" className="flex flex-wrap gap-2">
            {FEEDBACK_PRESETS.map((preset) => {
              const active = text.includes(preset)
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setText((current) =>
                      active
                        ? current
                            .split('\n')
                            .filter((line) => line.trim() !== `• ${preset}`)
                            .join('\n')
                            .trim()
                        : `${current.trim()}${current.trim() ? '\n' : ''}• ${preset}`,
                    )
                  }
                  className={cn(
                    'h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-accent',
                  )}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          <Textarea
            id="feedback-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="מה עובד טוב? מה לתקן בהחזקה הבאה?"
          />
          <Button type="submit" size="lg" className="h-11 font-bold" disabled={busy || !text.trim()}>
            {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            שליחת משוב
          </Button>
        </form>
      )}

      {mode === 'voice' && <VoiceRecorder onSubmit={sendVoice} busy={busy} />}

      {mode === 'screen' && <ScreenRecorder onSubmit={sendScreen} busy={busy} />}

      {mode === 'image' && (
        <div className="flex flex-col gap-3">
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="תצוגה מקדימה של התמונה" className="max-h-56 w-full rounded-lg object-contain" />
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="הערה לתמונה (לא חובה)"
                aria-label="הערה לתמונה"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-11 flex-1 font-bold"
                  onClick={() => setImage(null)}
                  disabled={busy}
                >
                  החלפה
                </Button>
                <Button size="lg" className="h-11 flex-1 font-bold" onClick={sendImage} disabled={busy}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                  שליחה
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-secondary/40 p-4 text-center transition-colors hover:bg-secondary"
            >
              <ImageIcon className="size-7 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">בחרו תמונה לשליחה</span>
              <span className="text-xs text-muted-foreground">
                אפשר גם לשלוח פריים מסומן ישירות מנגן הסרטון
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
