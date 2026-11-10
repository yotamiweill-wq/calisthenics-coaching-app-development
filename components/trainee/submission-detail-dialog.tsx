'use client'

import useSWR from 'swr'
import { Loader2Icon, MicIcon, MessageSquareTextIcon, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  exerciseEnglish,
  exerciseLabel,
  formatDateTime,
  progressionLabel,
  type FeedbackItem,
  type Submission,
} from '@/lib/calisthenics'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

async function signedUrl([bucket, path]: [string, string]) {
  const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="תמונת משוב מהמאמן" className="max-h-72 w-full rounded-lg object-contain" />
  )
}

function FeedbackEntry({ item }: { item: FeedbackItem }) {
  const Icon = item.kind === 'voice' ? MicIcon : item.kind === 'image' ? ImageIcon : MessageSquareTextIcon
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

export function SubmissionDetailDialog({
  submission,
  onClose,
}: {
  submission: Submission | null
  onClose: () => void
}) {
  const { data: videoUrl, error: videoError } = useSWR(
    submission ? ['submissions', submission.video_path] : null,
    signedUrl,
    { revalidateOnFocus: false },
  )

  const feedback = submission
    ? [...submission.feedback].sort((a, b) => a.created_at.localeCompare(b.created_at))
    : []

  return (
    <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-lg">
        {submission && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {exerciseLabel(submission.exercise)}
                <span className="ms-2 text-sm font-medium text-muted-foreground" dir="ltr">
                  {exerciseEnglish(submission.exercise)}
                </span>
              </DialogTitle>
              <DialogDescription>
                {progressionLabel(submission.progression)} · {submission.hold_seconds} שניות ·{' '}
                {formatDateTime(submission.created_at)}
              </DialogDescription>
            </DialogHeader>

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
                  {videoError ? 'לא ניתן לטעון את הסרטון.' : <Loader2Icon className="animate-spin" aria-label="טוען" />}
                </div>
              )}
            </div>

            {submission.note && (
              <div className="rounded-xl bg-secondary p-3 text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">ההערה שלי</span>
                {submission.note}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">משוב מהמאמן</h3>
                <Badge variant={submission.status === 'reviewed' ? 'default' : 'secondary'}>
                  {submission.status === 'reviewed' ? 'נבדק' : 'ממתין לבדיקה'}
                </Badge>
              </div>
              {feedback.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  המאמן עוד לא הגיב. נעדכן כאן ברגע שיהיה משוב.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {feedback.map((item) => (
                    <FeedbackEntry key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
