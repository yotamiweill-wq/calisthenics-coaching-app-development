'use client'

import { ChevronLeftIcon, InboxIcon, MessageSquareTextIcon, XIcon } from 'lucide-react'
import {
  exerciseLabel,
  formatShortDate,
  progressionLabel,
  waitingLabel,
  type CoachSubmission,
} from '@/lib/calisthenics'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type QueueFilter = 'pending' | 'all'

export function ReviewQueue({
  submissions,
  names,
  filter,
  onFilterChange,
  traineeFilter,
  onClearTrainee,
  onOpen,
}: {
  submissions: CoachSubmission[]
  names: Map<string, string>
  filter: QueueFilter
  onFilterChange: (value: QueueFilter) => void
  traineeFilter: string | null
  onClearTrainee: () => void
  onOpen: (id: string) => void
}) {
  const scoped = traineeFilter ? submissions.filter((s) => s.trainee_id === traineeFilter) : submissions
  const pendingCount = scoped.filter((s) => s.status === 'pending').length

  const visible =
    filter === 'pending'
      ? scoped.filter((s) => s.status === 'pending').sort((a, b) => a.created_at.localeCompare(b.created_at))
      : [...scoped].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <section aria-label="תור בדיקה" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="סינון סרטונים" className="flex gap-1 rounded-xl bg-secondary p-1">
          {(
            [
              { value: 'pending', label: `ממתינים (${pendingCount})` },
              { value: 'all', label: `הכול (${scoped.length})` },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={filter === option.value}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                'h-9 rounded-lg px-4 text-sm font-bold transition-colors',
                filter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {traineeFilter && (
          <button
            type="button"
            onClick={onClearTrainee}
            className="flex h-9 items-center gap-1.5 rounded-full border bg-card ps-3 pe-2 text-sm font-semibold hover:bg-accent"
          >
            {names.get(traineeFilter) ?? 'מתאמן'}
            <XIcon className="size-4" aria-label="הסרת סינון" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <InboxIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-bold">{filter === 'pending' ? 'התור ריק. כל הכבוד!' : 'אין סרטונים להצגה'}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filter === 'pending'
              ? 'סרטונים חדשים של המתאמנים יופיעו כאן לבדיקה.'
              : 'כשמתאמנים יעלו סרטונים הם יופיעו כאן.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {visible.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-start transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-lg font-black leading-none tabular-nums">{s.hold_seconds}</span>
                  <span className="text-[10px] font-semibold">שנ׳</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-bold">{names.get(s.trainee_id) ?? 'מתאמן'}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {exerciseLabel(s.exercise)} · {progressionLabel(s.progression)}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={s.created_at}>{formatShortDate(s.created_at)}</time>
                    {s.status === 'pending' && <span className="text-primary" suppressHydrationWarning>{waitingLabel(s.created_at)}</span>}
                    {s.feedback.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquareTextIcon className="size-3" aria-hidden="true" />
                        {s.feedback.length}
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
    </section>
  )
}
