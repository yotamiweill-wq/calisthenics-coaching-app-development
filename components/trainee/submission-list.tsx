'use client'

import { useState } from 'react'
import { ChevronLeftIcon, MessageSquareTextIcon, PlayIcon } from 'lucide-react'
import {
  exerciseLabel,
  formatShortDate,
  progressionLabel,
  type Submission,
} from '@/lib/calisthenics'
import { Badge } from '@/components/ui/badge'
import { SubmissionDetailDialog } from '@/components/trainee/submission-detail-dialog'

export function SubmissionList({ submissions }: { submissions: Submission[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const active = submissions.find((s) => s.id === openId) ?? null

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h2 id="history-title" className="text-lg font-bold">
        הסרטונים שלי
      </h2>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <PlayIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-bold">עוד לא העלית סרטונים</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            העלו את סרטון ההחזקה הראשון שלכם וקבלו משוב אישי מהמאמן.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {submissions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setOpenId(s.id)}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-start transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-lg font-black leading-none tabular-nums">
                    {s.hold_seconds ?? s.reps ?? '—'}
                  </span>
                  <span className="text-[10px] font-semibold">
                    {s.hold_seconds != null ? 'שנ׳' : s.reps != null ? 'חזרות' : ''}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-bold">
                    {exerciseLabel(s.exercise)} · {progressionLabel(s.progression)}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={s.created_at}>{formatShortDate(s.created_at)}</time>
                    {s.feedback.length > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <MessageSquareTextIcon className="size-3" aria-hidden="true" />
                        {s.feedback.length} משוב
                      </span>
                    )}
                  </span>
                </span>
                <Badge variant={s.status === 'reviewed' ? 'default' : 'secondary'}>
                  {s.status === 'reviewed' ? 'נבדק' : 'ממתין'}
                </Badge>
                <ChevronLeftIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SubmissionDetailDialog submission={active} onClose={() => setOpenId(null)} />
    </section>
  )
}
