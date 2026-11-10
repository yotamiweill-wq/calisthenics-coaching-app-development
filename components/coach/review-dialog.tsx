'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { CheckCheckIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react'
import {
  exerciseEnglish,
  exerciseLabel,
  formatDateTime,
  progressionLabel,
  type CoachSubmission,
} from '@/lib/calisthenics'
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

export function ReviewDialog({
  submission,
  traineeName,
  coachId,
  onClose,
}: {
  submission: CoachSubmission | null
  traineeName: string
  coachId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)

  const { data: videoUrl, error: videoError } = useSWR(
    submission ? ['submissions', submission.video_path] : null,
    signedUrl,
    { revalidateOnFocus: false },
  )

  async function sendFrame(blob: Blob) {
    if (!submission) return
    const failure = await sendFeedback({
      submissionId: submission.id,
      traineeId: submission.trainee_id,
      coachId,
      alreadyReviewed: submission.status === 'reviewed',
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
    if (!submission) return
    setToggling(true)
    const failure = await setReviewed(submission.id, submission.status !== 'reviewed')
    setToggling(false)
    if (failure) return toast.error(failure)
    router.refresh()
  }

  const reviewed = submission?.status === 'reviewed'

  return (
    <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] gap-4 overflow-y-auto sm:max-w-5xl">
        {submission && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pe-8">
                <DialogTitle className="text-xl font-black">
                  {traineeName} · {exerciseLabel(submission.exercise)}
                  <span className="ms-2 text-sm font-medium text-muted-foreground" dir="ltr">
                    {exerciseEnglish(submission.exercise)}
                  </span>
                </DialogTitle>
                <Badge variant={reviewed ? 'default' : 'secondary'}>{reviewed ? 'נבדק' : 'ממתין לבדיקה'}</Badge>
              </div>
              <DialogDescription>
                {progressionLabel(submission.progression)} · {submission.hold_seconds} שניות ·{' '}
                {formatDateTime(submission.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <VideoAnnotator videoUrl={videoUrl} error={!!videoError} onSendFrame={sendFrame} />

              <div className="flex flex-col gap-4">
                {submission.note && (
                  <div className="rounded-xl bg-secondary p-3 text-sm">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">הערת המתאמן</span>
                    {submission.note}
                  </div>
                )}

                <FeedbackComposer
                  submissionId={submission.id}
                  traineeId={submission.trainee_id}
                  coachId={coachId}
                  alreadyReviewed={reviewed}
                  onSent={() => router.refresh()}
                />

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">משוב שנשלח ({submission.feedback.length})</h3>
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
                  <FeedbackThread items={submission.feedback} />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
