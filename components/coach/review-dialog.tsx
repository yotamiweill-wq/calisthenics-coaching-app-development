'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { CheckCheckIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react'
import {
  effortLabel,
  exerciseEnglish,
  exerciseLabel,
  formatDateTime,
  progressionLabel,
} from '@/lib/calisthenics'
import type { WorkoutDay } from '@/lib/workout-days'
import { signedUrl } from '@/lib/signed-url'
import { sendFeedback, setReviewed } from '@/lib/send-feedback'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VideoAnnotator } from '@/components/coach/video-annotator'
import { FeedbackComposer } from '@/components/coach/feedback-composer'
import { FeedbackThread } from '@/components/coach/feedback-thread'
import { cn } from '@/lib/utils'

const dayFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Jerusalem',
})

function DayReview({
  day,
  traineeName,
  coachId,
}: {
  day: WorkoutDay
  traineeName: string
  coachId: string
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const active = day.submissions[activeIndex] ?? day.submissions[0]
  const reviewed = day.status === 'reviewed'
  const allIds = day.submissions.map((s) => s.id)

  const { data: videoUrl, error: videoError } = useSWR(
    ['submissions', active.video_path],
    signedUrl,
    { revalidateOnFocus: false },
  )

  async function sendFrame(blob: Blob) {
    const failure = await sendFeedback({
      submissionIds: [active.id],
      traineeId: day.traineeId,
      coachId,
      kind: 'image',
      media: { blob, contentType: 'image/jpeg', extension: 'jpg' },
    })
    if (failure) {
      toast.error(failure)
      throw new Error(failure)
    }
    toast.success('הפריים נשלח למתאמן.')
    router.refresh()
  }

  async function toggleReviewed() {
    setToggling(true)
    const failure = await setReviewed(allIds, !reviewed)
    setToggling(false)
    if (failure) return toast.error(failure)
    router.refresh()
  }

  const dateLabel = dayFormat.format(new Date(day.firstUploadAt))

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2 pe-8">
          <DialogTitle className="text-xl font-black">
            {traineeName} · אימון {dateLabel}
          </DialogTitle>
          <Badge variant={reviewed ? 'default' : 'secondary'}>{reviewed ? 'נבדק' : 'ממתין לבדיקה'}</Badge>
        </div>
        <DialogDescription>
          {day.submissions.length === 1 ? 'סרטון אחד' : `${day.submissions.length} סרטונים`} באימון הזה. משוב אחד
          נשלח עבור כל האימון.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {day.submissions.length > 1 && (
            <div
              role="tablist"
              aria-label="סרטוני האימון"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {day.submissions.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'flex shrink-0 cursor-pointer flex-col items-start rounded-xl border px-3 py-2 text-start text-sm transition-all active:scale-95',
                    index === activeIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-accent',
                  )}
                >
                  <span className="font-bold">
                    {index + 1}. {exerciseLabel(s.exercise)}
                  </span>
                  <span className="text-xs opacity-80">{effortLabel(s)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {exerciseLabel(active.exercise)}
              <span className="ms-2 text-xs font-medium text-muted-foreground" dir="ltr">
                {exerciseEnglish(active.exercise)}
              </span>
            </span>
            <span>
              {progressionLabel(active.progression)} · {effortLabel(active)} · {formatDateTime(active.created_at)}
            </span>
          </div>

          <VideoAnnotator videoUrl={videoUrl} error={!!videoError} onSendFrame={sendFrame} />

          {active.note && (
            <div className="rounded-xl bg-secondary p-3 text-sm">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">הערת המתאמן</span>
              {active.note}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-bold">משוב לכל האימון</h3>
            <FeedbackComposer
              submissionIds={allIds}
              traineeId={day.traineeId}
              coachId={coachId}
              onSent={() => router.refresh()}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">משוב שנשלח ({day.feedback.length})</h3>
              <Button variant="ghost" size="sm" onClick={toggleReviewed} disabled={toggling}>
                {toggling ? (
                  <Loader2Icon className="animate-spin" />
                ) : reviewed ? (
                  <RotateCcwIcon />
                ) : (
                  <CheckCheckIcon />
                )}
                {reviewed ? 'החזרה לתור' : 'סימון כנבדק'}
              </Button>
            </div>
            <FeedbackThread items={day.feedback} />
          </div>
        </div>
      </div>
    </>
  )
}

export function ReviewDialog({
  day,
  traineeName,
  coachId,
  onClose,
}: {
  day: WorkoutDay | null
  traineeName: string
  coachId: string
  onClose: () => void
}) {
  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] gap-4 overflow-y-auto sm:max-w-5xl">
        {day && <DayReview key={day.key} day={day} traineeName={traineeName} coachId={coachId} />}
      </DialogContent>
    </Dialog>
  )
}
