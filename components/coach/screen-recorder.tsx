'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, MonitorIcon, RotateCcwIcon, SendIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_SECONDS = 240
const MAX_BYTES = 50 * 1024 * 1024
const VIDEO_BITS_PER_SECOND = 1_200_000
const AUDIO_BITS_PER_SECOND = 64_000

function pickVideoMime() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return candidates.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))
}

export interface ScreenRecording {
  blob: Blob
  contentType: string
  extension: string
  caption: string
}

export function ScreenRecorder({
  onSubmit,
  busy,
}: {
  onSubmit: (recording: ScreenRecording) => void
  busy: boolean
}) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const chunksRef = useRef<Blob[]>([])
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [caption, setCaption] = useState('')
  const [result, setResult] = useState<{ blob: Blob; url: string; mime: string } | null>(null)

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
        typeof MediaRecorder !== 'undefined',
    )
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setRecording(false)
  }, [])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stop()
  }, [seconds, recording, stop])

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      cleanupRef.current()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url)
    }
  }, [result])

  async function start() {
    const mime = pickVideoMime()
    if (!mime) {
      toast.error('הדפדפן לא תומך בהקלטת מסך.')
      return
    }

    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: true })
    } catch {
      toast.error('לא ניתן להתחיל הקלטת מסך. אשרו שיתוף מסך בדפדפן ונסו שוב.')
      return
    }

    let mic: MediaStream | null = null
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      toast.warning('המיקרופון לא זמין, ההקלטה תכלול רק את אודיו המסך.')
    }

    const audioContext = new AudioContext()
    const destination = audioContext.createMediaStreamDestination()
    let hasAudio = false
    for (const source of [display, mic]) {
      if (source && source.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(source).connect(destination)
        hasAudio = true
      }
    }

    const combined = new MediaStream([
      ...display.getVideoTracks(),
      ...(hasAudio ? destination.stream.getAudioTracks() : []),
    ])

    cleanupRef.current = () => {
      display.getTracks().forEach((track) => track.stop())
      mic?.getTracks().forEach((track) => track.stop())
      void audioContext.close()
      cleanupRef.current = () => {}
    }

    const recorder = new MediaRecorder(combined, {
      mimeType: mime,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    })
    chunksRef.current = []
    recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data)
    recorder.onstop = () => {
      const type = mime.split(';')[0]
      const blob = new Blob(chunksRef.current, { type })
      cleanupRef.current()
      setRecording(false)
      if (blob.size === 0) {
        toast.error('ההקלטה ריקה. נסו שוב.')
        return
      }
      if (blob.size > MAX_BYTES) {
        toast.error('ההקלטה גדולה מדי (מעל 50 MB). הקליטו קטע קצר יותר.')
        return
      }
      setResult({ blob, url: URL.createObjectURL(blob), mime: type })
    }

    // The browser's own "stop sharing" button ends the track; treat it as stopping the recording.
    display.getVideoTracks()[0]?.addEventListener('ended', stop)

    recorderRef.current = recorder
    setSeconds(0)
    setResult(null)
    recorder.start(1000)
    setRecording(true)
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  if (!supported) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        הקלטת מסך זמינה בדפדפן במחשב (Chrome, Edge, Firefox או Safari). בנייד אפשר להשתמש בהקלטה קולית.
      </p>
    )
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <video controls playsInline src={result.url} className="max-h-64 w-full rounded-lg bg-black object-contain" />
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="הערה להקלטה (לא חובה)"
          aria-label="הערה להקלטה"
        />
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
            disabled={busy}
            onClick={() =>
              onSubmit({
                blob: result.blob,
                contentType: result.mime,
                extension: result.mime.includes('mp4') ? 'mp4' : 'webm',
                caption,
              })
            }
          >
            {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            שליחה
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-5 text-center">
      <Button
        size="icon-lg"
        variant={recording ? 'destructive' : 'default'}
        className="size-16 rounded-full"
        onClick={recording ? stop : start}
        aria-label={recording ? 'עצירת הקלטת מסך' : 'התחלת הקלטת מסך'}
      >
        {recording ? <SquareIcon className="size-6" /> : <MonitorIcon className="size-6" />}
      </Button>
      <span className={cn('text-lg font-black tabular-nums', recording && 'text-destructive')} aria-live="polite">
        {recording ? `מקליט מסך… ${clock}` : 'לחצו כדי להקליט את המסך והקול'}
      </span>
      <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        בחרו &quot;הכרטיסייה הזו&quot; כדי להקליט את הסרטונים והסימונים תוך כדי הסבר בקול. עד 4 דקות.
      </span>
    </div>
  )
}
