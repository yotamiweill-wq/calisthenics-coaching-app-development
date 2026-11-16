'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2Icon,
  Maximize2Icon,
  MonitorIcon,
  PictureInPicture2Icon,
  RotateCcwIcon,
  SendIcon,
  SquareIcon,
  VideoIcon,
  VideoOffIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_SECONDS = 240
const MAX_BYTES = 50 * 1024 * 1024
const VIDEO_BITS_PER_SECOND = 1_800_000
const AUDIO_BITS_PER_SECOND = 64_000
const FRAME_WIDTH = 1280
const FRAME_HEIGHT = 720
const FPS = 30
const PIP_WIDTH = 288
const PIP_HEIGHT = 162
const PIP_MARGIN = 20

type CameraLayout = 'pip' | 'full'

function pickVideoMime() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return candidates.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))
}

// Browsers throttle timers in background tabs, which would freeze the composited recording while the coach
// works in another window. A worker timer keeps ticking at full rate.
function startTicker(onTick: () => void, intervalMs: number) {
  try {
    const url = URL.createObjectURL(
      new Blob([`setInterval(() => postMessage(0), ${intervalMs})`], { type: 'text/javascript' }),
    )
    const worker = new Worker(url)
    worker.onmessage = onTick
    return () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }
  } catch {
    const id = setInterval(onTick, intervalMs)
    return () => clearInterval(id)
  }
}

function drawFit(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number, cover: boolean) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = cover ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh)
  if (cover) {
    const sw = w / scale
    const sh = h / scale
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, x, y, w, h)
  } else {
    const dw = vw * scale
    const dh = vh * scale
    ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  }
}

function createVideoElement(stream: MediaStream) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  return video
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraOnRef = useRef(false)
  const layoutRef = useRef<CameraLayout>('pip')
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [starting, setStarting] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [caption, setCaption] = useState('')
  const [cameraOn, setCameraOnState] = useState(false)
  const [layout, setLayoutState] = useState<CameraLayout>('pip')
  const [result, setResult] = useState<{ blob: Blob; url: string; mime: string } | null>(null)

  const setCameraOn = useCallback((value: boolean) => {
    cameraOnRef.current = value
    setCameraOnState(value)
  }, [])

  const setLayout = useCallback((value: CameraLayout) => {
    layoutRef.current = value
    setLayoutState(value)
  }, [])

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
        typeof MediaRecorder !== 'undefined',
    )
  }, [])

  const releaseCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    cameraVideoRef.current = null
  }, [])

  const acquireCamera = useCallback(async () => {
    if (cameraStreamRef.current) return true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      const video = createVideoElement(stream)
      await video.play()
      cameraStreamRef.current = stream
      cameraVideoRef.current = video
      return true
    } catch {
      toast.error('המצלמה לא זמינה. אשרו גישה למצלמה בדפדפן ונסו שוב.')
      return false
    }
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setRecording(false)
  }, [])

  async function toggleCamera() {
    if (cameraOn) {
      setCameraOn(false)
      if (recording) releaseCamera()
      return
    }
    if (recording && !(await acquireCamera())) return
    setCameraOn(true)
  }

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
    const canvas = canvasRef.current
    if (!mime || !canvas) {
      toast.error('הדפדפן לא תומך בהקלטת מסך.')
      return
    }

    setStarting(true)
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: FPS }, audio: true })
    } catch {
      setStarting(false)
      toast.error('לא ניתן להתחיל הקלטת מסך. אשרו שיתוף מסך בדפדפן ונסו שוב.')
      return
    }

    let mic: MediaStream | null = null
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      toast.warning('המיקרופון לא זמין, ההקלטה תכלול רק את אודיו המסך.')
    }

    if (cameraOnRef.current && !(await acquireCamera())) setCameraOn(false)

    const screenVideo = createVideoElement(display)
    await screenVideo.play().catch(() => {})
    screenVideoRef.current = screenVideo

    const audioContext = new AudioContext()
    void audioContext.resume()
    const destination = audioContext.createMediaStreamDestination()
    let hasAudio = false
    for (const source of [display, mic]) {
      if (source && source.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(source).connect(destination)
        hasAudio = true
      }
    }

    canvas.width = FRAME_WIDTH
    canvas.height = FRAME_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      display.getTracks().forEach((track) => track.stop())
      mic?.getTracks().forEach((track) => track.stop())
      void audioContext.close()
      setStarting(false)
      toast.error('הדפדפן לא תומך בהקלטת מסך.')
      return
    }

    const drawFrame = () => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)
      const camera = cameraOnRef.current ? cameraVideoRef.current : null

      if (camera && layoutRef.current === 'full') {
        drawFit(ctx, camera, 0, 0, FRAME_WIDTH, FRAME_HEIGHT, true)
        return
      }

      drawFit(ctx, screenVideo, 0, 0, FRAME_WIDTH, FRAME_HEIGHT, false)
      if (camera) {
        const x = FRAME_WIDTH - PIP_WIDTH - PIP_MARGIN
        const y = PIP_MARGIN
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(x, y, PIP_WIDTH, PIP_HEIGHT, 20)
        ctx.clip()
        drawFit(ctx, camera, x, y, PIP_WIDTH, PIP_HEIGHT, true)
        ctx.restore()
        ctx.lineWidth = 4
        ctx.strokeStyle = '#fff'
        ctx.beginPath()
        ctx.roundRect(x, y, PIP_WIDTH, PIP_HEIGHT, 20)
        ctx.stroke()
      }
    }

    drawFrame()
    const stopTicker = startTicker(drawFrame, Math.round(1000 / FPS))

    const combined = new MediaStream([
      ...canvas.captureStream(FPS).getVideoTracks(),
      ...(hasAudio ? destination.stream.getAudioTracks() : []),
    ])

    cleanupRef.current = () => {
      stopTicker()
      display.getTracks().forEach((track) => track.stop())
      mic?.getTracks().forEach((track) => track.stop())
      releaseCamera()
      screenVideoRef.current = null
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
    setStarting(false)
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
      <canvas
        ref={canvasRef}
        aria-label="תצוגה חיה של ההקלטה"
        className={cn('aspect-video w-full max-w-xs rounded-lg bg-black', recording ? 'block' : 'hidden')}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant={cameraOn ? 'default' : 'secondary'}
          className="h-10 gap-2 font-bold"
          aria-pressed={cameraOn}
          onClick={toggleCamera}
          disabled={starting}
        >
          {cameraOn ? <VideoOffIcon aria-hidden="true" /> : <VideoIcon aria-hidden="true" />}
          {cameraOn ? 'כבה מצלמה' : 'הפעל מצלמה'}
        </Button>

        {cameraOn && (
          <div role="group" aria-label="מיקום המצלמה בהקלטה" className="flex gap-1 rounded-xl bg-secondary p-1">
            <Button
              type="button"
              variant={layout === 'pip' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 font-bold"
              aria-pressed={layout === 'pip'}
              onClick={() => setLayout('pip')}
            >
              <PictureInPicture2Icon aria-hidden="true" />
              מצלמה בצד
            </Button>
            <Button
              type="button"
              variant={layout === 'full' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 font-bold"
              aria-pressed={layout === 'full'}
              onClick={() => setLayout('full')}
            >
              <Maximize2Icon aria-hidden="true" />
              מסך מלא
            </Button>
          </div>
        )}
      </div>

      <Button
        size="icon-lg"
        variant={recording ? 'destructive' : 'default'}
        className="size-16 rounded-full"
        onClick={recording ? stop : start}
        disabled={starting}
        aria-label={recording ? 'עצירת הקלטת מסך' : 'התחלת הקלטת מסך'}
      >
        {starting ? (
          <Loader2Icon className="size-6 animate-spin" />
        ) : recording ? (
          <SquareIcon className="size-6" />
        ) : (
          <MonitorIcon className="size-6" />
        )}
      </Button>
      <span className={cn('text-lg font-black tabular-nums', recording && 'text-destructive')} aria-live="polite">
        {recording ? `מקליט מסך… ${clock}` : 'לחצו כדי להקליט את המסך והקול'}
      </span>
      <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {recording
          ? 'אפשר להפעיל או לכבות את המצלמה ולעבור בין מצלמה בצד למסך מלא בכל רגע, והשינוי יישמר בהקלטה.'
          : 'בחרו חלון או כרטיסייה עם הסרטונים כדי להסביר בקול. כדי להדגים תרגיל, הפעילו מצלמה ועברו למסך מלא. עד 4 דקות.'}
      </span>
    </div>
  )
}
