'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowUpRightIcon,
  CircleIcon,
  ImagePlusIcon,
  Loader2Icon,
  MinusIcon,
  PauseIcon,
  PencilIcon,
  PencilLineIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react'
import { formatClock } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tool = 'pen' | 'line' | 'arrow' | 'circle'
interface Point {
  x: number
  y: number
}
interface Stroke {
  tool: Tool
  color: string
  points: Point[]
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const FRAME = 1 / 30
const RATES = [0.1, 0.25, 0.5, 1]
const COLORS = [
  { value: '#c6f432', label: 'ליים' },
  { value: '#ff4d4d', label: 'אדום' },
  { value: '#ffffff', label: 'לבן' },
  { value: '#38bdf8', label: 'תכלת' },
]
const TOOLS: { value: Tool; label: string; icon: typeof PencilIcon }[] = [
  { value: 'pen', label: 'עט חופשי', icon: PencilIcon },
  { value: 'line', label: 'קו ישר', icon: MinusIcon },
  { value: 'arrow', label: 'חץ', icon: ArrowUpRightIcon },
  { value: 'circle', label: 'עיגול', icon: CircleIcon },
]

function contentRect(boxW: number, boxH: number, videoW: number, videoH: number): Rect {
  if (!videoW || !videoH) return { x: 0, y: 0, w: boxW, h: boxH }
  const scale = Math.min(boxW / videoW, boxH / videoH)
  const w = videoW * scale
  const h = videoH * scale
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h }
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], rect: Rect, lineWidth: number) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lineWidth

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue
    const pts = stroke.points.map((p) => ({ x: rect.x + p.x * rect.w, y: rect.y + p.y * rect.h }))
    const first = pts[0]
    const last = pts[pts.length - 1]
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.beginPath()

    if (stroke.tool === 'pen') {
      ctx.moveTo(first.x, first.y)
      if (pts.length === 1) ctx.lineTo(first.x + 0.01, first.y)
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else if (stroke.tool === 'line' || stroke.tool === 'arrow') {
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(last.x, last.y)
      ctx.stroke()
      if (stroke.tool === 'arrow') {
        const angle = Math.atan2(last.y - first.y, last.x - first.x)
        const head = lineWidth * 4.5
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(last.x - head * Math.cos(angle - Math.PI / 6), last.y - head * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(last.x - head * Math.cos(angle + Math.PI / 6), last.y - head * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      }
    } else {
      const cx = (first.x + last.x) / 2
      const cy = (first.y + last.y) / 2
      ctx.ellipse(cx, cy, Math.abs(last.x - first.x) / 2, Math.abs(last.y - first.y) / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

export function VideoAnnotator({
  videoUrl,
  error,
  onSendFrame,
}: {
  videoUrl: string | undefined
  error: boolean
  onSendFrame: (blob: Blob) => Promise<void>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const [useCors, setUseCors] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [box, setBox] = useState({ w: 0, h: 0 })

  const [drawMode, setDrawMode] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0].value)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [draft, setDraft] = useState<Stroke | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setUseCors(true)
    setPlaying(false)
    setTime(0)
    setStrokes([])
    setDraft(null)
  }, [videoUrl])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      if (videoRef.current) setTime(videoRef.current.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, videoUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !box.w || !box.h) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(box.w * ratio)
    canvas.height = Math.round(box.h * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, box.w, box.h)
    const rect = contentRect(box.w, box.h, dims.w, dims.h)
    drawStrokes(ctx, draft ? [...strokes, draft] : strokes, rect, 4)
  }, [strokes, draft, box, dims])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setDrawMode(false)
      void video.play()
    } else {
      video.pause()
    }
  }, [])

  function seek(next: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(Math.max(next, 0), duration || next)
    setTime(video.currentTime)
  }

  function step(direction: 1 | -1) {
    const video = videoRef.current
    if (!video) return
    video.pause()
    seek(video.currentTime + direction * FRAME)
  }

  function toggleDraw() {
    if (!drawMode) videoRef.current?.pause()
    setDrawMode((value) => !value)
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect()
    const rect = contentRect(bounds.width, bounds.height, dims.w, dims.h)
    const x = (event.clientX - bounds.left - rect.x) / rect.w
    const y = (event.clientY - bounds.top - rect.y) / rect.h
    return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) }
  }

  function handleDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawMode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraft({ tool, color, points: [pointFromEvent(event)] })
  }

  function handleMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!draft) return
    const point = pointFromEvent(event)
    setDraft((current) => {
      if (!current) return current
      return current.tool === 'pen'
        ? { ...current, points: [...current.points, point] }
        : { ...current, points: [current.points[0], point] }
    })
  }

  function handleUp() {
    if (!draft) return
    setStrokes((current) => [...current, draft])
    setDraft(null)
  }

  async function sendFrame() {
    const video = videoRef.current
    if (!video || !dims.w) return
    video.pause()
    setSending(true)
    try {
      const width = Math.min(dims.w, 1280)
      const height = Math.round((width * dims.h) / dims.w)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no context')
      ctx.drawImage(video, 0, 0, width, height)
      drawStrokes(ctx, strokes, { x: 0, y: 0, w: width, h: height }, Math.max(4, width / 160))
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
      if (!blob) throw new Error('no blob')
      await onSendFrame(blob)
      setStrokes([])
    } catch {
      toast.error(
  useCors
  ? 'לא ניתן לצלם את הפריים הזה. נסו לרענן ולנסות שוב.'
  : 'הדפדפן חוסם צילום פריים מהסרטון הזה (CORS). רעננו את העמוד ונסו שוב.',
  )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={boxRef}
        className="relative aspect-video overflow-hidden rounded-xl border bg-black"
        dir="ltr"
      >
        {videoUrl ? (
          <video
            key={`${videoUrl}-${useCors}`}
            ref={videoRef}
            src={videoUrl}
            crossOrigin={useCors ? 'anonymous' : undefined}
            playsInline
            preload="auto"
            className="absolute inset-0 size-full object-contain"
            onLoadedMetadata={(e) => {
              setDims({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })
              setDuration(e.currentTarget.duration)
              e.currentTarget.playbackRate = rate
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false)
              if (videoRef.current) setTime(videoRef.current.currentTime)
            }}
            onEnded={() => setPlaying(false)}
            onSeeked={(e) => setTime(e.currentTarget.currentTime)}
            onError={() => useCors && setUseCors(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            {error ? 'לא ניתן לטעון את הסרטון.' : <Loader2Icon className="animate-spin" aria-label="טוען" />}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={cn('absolute inset-0 size-full', drawMode ? 'cursor-crosshair touch-none' : 'pointer-events-none')}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          aria-label="שכבת סימון על הסרטון"
        />
        {!drawMode && videoUrl && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'השהיה' : 'ניגון'}
            className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-ring"
          />
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-3" dir="ltr">
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{formatClock(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={FRAME}
            value={Math.min(time, duration || 1)}
            onChange={(e) => {
              videoRef.current?.pause()
              seek(Number(e.target.value))
            }}
            aria-label="מיקום בסרטון"
            className="h-2 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-14 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
            {formatClock(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-lg" onClick={() => step(-1)} aria-label="פריים אחורה">
              <SkipBackIcon />
            </Button>
            <Button size="icon-lg" onClick={togglePlay} aria-label={playing ? 'השהיה' : 'ניגון'} disabled={!videoUrl}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button variant="secondary" size="icon-lg" onClick={() => step(1)} aria-label="פריים קדימה">
              <SkipForwardIcon />
            </Button>
          </div>

          <div role="radiogroup" aria-label="מהירות ניגון" className="flex items-center gap-1">
            {RATES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rate === value}
                onClick={() => setRate(value)}
                className={cn(
                  'h-9 min-w-12 rounded-lg border px-2 text-xs font-bold tabular-nums transition-colors',
                  rate === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                )}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant={drawMode ? 'default' : 'secondary'}
            size="lg"
            className="h-10 font-bold"
            onClick={toggleDraw}
            aria-pressed={drawMode}
          >
            <PencilLineIcon />
            {drawMode ? 'מצב סימון פעיל' : 'סימון על הפריים'}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setStrokes((current) => current.slice(0, -1))}
              disabled={strokes.length === 0}
              aria-label="ביטול סימון אחרון"
            >
              <Undo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setStrokes([])}
              disabled={strokes.length === 0}
              aria-label="ניקוי כל הסימונים"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>

        {drawMode && (
          <div className="flex flex-wrap items-center gap-4">
            <div role="radiogroup" aria-label="כלי סימון" className="flex gap-1">
              {TOOLS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={tool === item.value}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => setTool(item.value)}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg border transition-colors',
                    tool === item.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-accent',
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="צבע" className="flex gap-2">
              {COLORS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={color === item.value}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => setColor(item.value)}
                  style={{ backgroundColor: item.value }}
                  className={cn(
                    'size-8 rounded-full border-2 transition-transform',
                    color === item.value ? 'scale-110 border-foreground' : 'border-transparent',
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          className="h-11 font-bold"
          onClick={sendFrame}
          disabled={!videoUrl || sending}
        >
          {sending ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
          {strokes.length > 0 ? 'שליחת הפריים המסומן כמשוב' : 'שליחת הפריים הנוכחי כתמונה'}
        </Button>
      </div>
    </div>
  )
}
