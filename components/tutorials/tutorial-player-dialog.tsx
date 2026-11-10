'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Loader2Icon } from 'lucide-react'
import {
  exerciseEnglish,
  exerciseLabel,
  progressionLabel,
  type Tutorial,
} from '@/lib/calisthenics'
import { signedUrl } from '@/lib/signed-url'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const RATES = [0.25, 0.5, 1] as const

function PlayerBody({ tutorial }: { tutorial: Tutorial }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [rate, setRate] = useState<number>(1)
  const { data: url, error } = useSWR(['tutorials', tutorial.video_path], signedUrl, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, url])

  return (
    <>
      <div className="aspect-video overflow-hidden rounded-xl bg-black" dir="ltr">
        {url ? (
          <video
            key={url}
            ref={videoRef}
            src={url}
            controls
            playsInline
            preload="metadata"
            className="size-full object-contain"
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = rate
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-white/70">
            {error ? 'לא ניתן לטעון את הסרטון.' : <Loader2Icon className="animate-spin" aria-label="טוען" />}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">מהירות ניגון</span>
        <div role="group" aria-label="מהירות ניגון" className="flex gap-1" dir="ltr">
          {RATES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={rate === value}
              onClick={() => setRate(value)}
              className={cn(
                'h-9 min-w-14 rounded-lg px-3 text-sm font-bold tabular-nums transition-colors',
                rate === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      {tutorial.description && (
        <p className="whitespace-pre-wrap rounded-xl bg-secondary p-3 text-sm leading-relaxed">
          {tutorial.description}
        </p>
      )}
    </>
  )
}

export function TutorialPlayerDialog({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!tutorial} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-2xl">
        {tutorial && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-balance">{tutorial.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>{exerciseLabel(tutorial.exercise)}</span>
                <span dir="ltr" className="text-xs">
                  {exerciseEnglish(tutorial.exercise)}
                </span>
                <Badge variant="secondary">{progressionLabel(tutorial.progression)}</Badge>
              </DialogDescription>
            </DialogHeader>
            <PlayerBody key={tutorial.id} tutorial={tutorial} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
