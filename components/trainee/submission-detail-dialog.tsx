'use client'

import { useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import {
  ImageIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  MicIcon,
  MonitorIcon,
  VideoIcon,
} from 'lucide-react'
import {
  effortLabel,
  exerciseEnglish,
  exerciseLabel,
  formatDateTime,
  progressionLabel,
  type FeedbackItem,
  type Submission,
} from '@/lib/calisthenics'
import { dateInIsrael } from '@/lib/progress'
import { signedUrl } from '@/lib/signed-url'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const dayFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Jerusalem',
})

const byCreatedAt = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at.localeCompare(b.created_at)

/** Feedback written once for the whole workout is stored per video with a shared batch_id; show it once. */
function splitFeedback(session: Submission[]) {
  const summary: FeedbackItem[] = []
  const seenBatches = new Set<string>()
  for (const item of session.flatMap((s) => s.feedback).sort(byCreatedAt)) {
    if (!item.batch_id || seenBatches.has(item.batch_id)) continue
    seenBatches.add(item.batch_id)
    summary.push(item)
  }
  // The session recording leads, followed by any voice, image and written notes.
  const rank = (item: FeedbackItem) => (item.kind === 'video' ? 0 : 1)
  return summary.sort((a, b) => rank(a) - rank(b) || byCreatedAt(a, b))
}

function FeedbackMedia({ item }: { item: FeedbackItem }) {
  const { data: url, isLoading } = useSWR(
    item.media_path ? ['feedback', item.media_path] : null,
    signedUrl,
    { revalidateOnFocus: false },
  )

  if (isLoading || !url) {
    return (
      <div className="flex h-12 items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-label="טוען" />
      </div>
    )
  }
  if (item.kind === 'voice') {
    return <audio controls preload="none" src={url} className="h-10 w-full" />
  }
  if (item.kind === 'video') {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        src={url}
        className="max-h-80 w-full rounded-lg bg-black object-contain"
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="תמונת משוב מהמאמן" className="max-h-80 w-full rounded-lg object-contain" />
  )
}

function FeedbackEntry({ item }: { item: FeedbackItem }) {
  const Icon =
    item.kind === 'voice'
      ? MicIcon
      : item.kind === 'image'
        ? ImageIcon
        : item.kind === 'video'
          ? MonitorIcon
          : MessageSquareTextIcon
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <Icon className="size-3.5" aria-hidden="true" />
          המאמן
        </span>
        <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
      </div>
      {item.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>}
      {item.media_path && <FeedbackMedia item={item} />}
    </li>
  )
}

function ExerciseVideo({ submission }: { submission: Submission }) {
  const { data: videoUrl, error } = useSWR(['submissions', submission.video_path], signedUrl, {
    revalidateOnFocus: false,
  })
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-muted">
      {videoUrl ? (
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="size-full bg-black object-contain"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          {error ? 'לא ניתן לטעון את הסרטון.' : <Loader2Icon className="animate-spin" aria-label="טוען" />}
        </div>
      )}
    </div>
  )
}

function ExerciseSection({
  submission,
  index,
  feedback,
  focused,
}: {
  submission: Submission
  index: number
  feedback: FeedbackItem[]
  focused: boolean
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'start' })
  }, [focused])

  return (
    <section
      ref={ref}
      aria-labelledby={`exercise-${submission.id}`}
      className="flex scroll-mt-2 flex-col gap-3 rounded-2xl border bg-card p-3"
    >
      <div className="flex flex-col gap-0.5">
        <h4 id={`exercise-${submission.id}`} className="text-lg font-black">
          {index + 1}. {exerciseLabel(submission.exercise)}
          <span className="ms-2 text-sm font-medium text-muted-foreground" dir="ltr">
            {exerciseEnglish(submission.exercise)}
          </span>
        </h4>
        <p className="text-sm text-muted-foreground">
          {progressionLabel(submission.progression)} · {effortLabel(submission)}
        </p>
      </div>

      <ExerciseVideo submission={submission} />

      {submission.note && (
        <div className="rounded-xl bg-secondary p-3 text-sm">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">ההערה שלי</span>
          {submission.note}
        </div>
      )}

      {feedback.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {feedback.map((item) => (
            <FeedbackEntry key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
          אין משוב ספציפי לתרגיל הזה.
        </p>
      )}
    </section>
  )
}

function WorkoutSession({
  focusedId,
  session,
}: {
  focusedId: string
  session: Submission[]
}) {
  const summary = useMemo(() => splitFeedback(session), [session])
  const reviewed = session.every((s) => s.status === 'reviewed')
  const dateLabel = dayFormat.format(new Date(session[0].created_at))

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2 pe-8">
          <DialogTitle className="text-xl font-black">אימון {dateLabel}</DialogTitle>
          <Badge variant={reviewed ? 'default' : 'secondary'}>{reviewed ? 'נבדק' : 'ממתין לבדיקה'}</Badge>
        </div>
        <DialogDescription>
          {session.length === 1 ? 'תרגיל אחד' : `${session.length} תרגילים`} באימון הזה, עם כל המשוב מלמעלה למטה.
        </DialogDescription>
      </DialogHeader>

      <section aria-labelledby="session-summary" className="flex flex-col gap-3">
        <h3 id="session-summary" className="flex items-center gap-2 font-bold">
          <VideoIcon className="size-4 text-primary" aria-hidden="true" />
          סיכום האימון מהמאמן
        </h3>
        {summary.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            המאמן עוד לא שלח סיכום לאימון. נעדכן כאן ברגע שיהיה משוב.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.map((item) => (
              <FeedbackEntry key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <h3 className="font-bold">התרגילים באימון</h3>
        {session.map((submission, index) => (
          <ExerciseSection
            key={submission.id}
            submission={submission}
            index={index}
            focused={submission.id === focusedId && session.length > 1}
            feedback={submission.feedback.filter((f) => !f.batch_id).sort(byCreatedAt)}
          />
        ))}
      </div>
    </>
  )
}

export function SubmissionDetailDialog({
  submission,
  allSubmissions,
  onClose,
}: {
  submission: Submission | null
  allSubmissions: Submission[]
  onClose: () => void
}) {
  const session = useMemo(() => {
    if (!submission) return []
    const day = dateInIsrael(submission.created_at)
    return allSubmissions.filter((s) => dateInIsrael(s.created_at) === day).sort(byCreatedAt)
  }, [submission, allSubmissions])

  return (
    <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-xl">
        {submission && session.length > 0 && (
          <WorkoutSession key={dateInIsrael(submission.created_at)} focusedId={submission.id} session={session} />
        )}
      </DialogContent>
    </Dialog>
  )
}
