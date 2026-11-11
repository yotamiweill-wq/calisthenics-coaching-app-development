'use client'

import { ChevronLeftIcon, InboxIcon, MessageSquareTextIcon, XIcon } from 'lucide-react'
import { exerciseLabel, formatShortDate, waitingLabel } from '@/lib/calisthenics'
import type { WorkoutDay } from '@/lib/workout-days'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type QueueFilter = 'pending' | 'all'

export function ReviewQueue({
  days,
  names,
  filter,
  onFilterChange,
  traineeFilter,
  onClearTrainee,
  onOpen,
}: {
  days: WorkoutDay[]
  names: Map<string, string>
  filter: QueueFilter
  onFilterChange: (value: QueueFilter) => void
  traineeFilter: string | null
  onClearTrainee: () => void
  onOpen: (id: string) => void
}) {
  const scoped = traineeFilter ? days.filter((d) => d.traineeId === traineeFilter) : days
  const pendingCount = scoped.filter((d) => d.status === 'pending').length

  const visible =
    filter === 'pending'
      ? scoped.filter((d) => d.status === 'pending').sort((a, b) => a.firstUploadAt.localeCompare(b.firstUploadAt))
      : [...scoped].sort((a, b) => b.lastUploadAt.localeCompare(a.lastUploadAt))

  return (
    <section aria-label="תור בדיקה" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="סינון אימונים" className="flex gap-1 rounded-xl bg-secondary p-1">
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
                'h-9 cursor-pointer rounded-lg px-4 text-sm font-bold transition-all active:scale-95',
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
          <p className="font-bold">{filter === 'pending' ? 'התור ריק. כל הכבוד!' : 'אין אימונים להצגה'}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filter === 'pending'
              ? 'אימונים חדשים של המתאמנים יופיעו כאן לבדיקה.'
              : 'כשמתאמנים יעלו סרטונים, הם יקובצו כאן לפי יום אימון.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {visible.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => onOpen(d.key)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 text-start transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98]"
              >
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-lg font-black leading-none tabular-nums">{d.submissions.length}</span>
                  <span className="text-[10px] font-semibold">סרטונים</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-bold">{names.get(d.traineeId) ?? 'מתאמן'}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {[...new Set(d.submissions.map((s) => exerciseLabel(s.exercise)))].join(' · ')}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={d.firstUploadAt}>{formatShortDate(d.firstUploadAt)}</time>
                    {d.status === 'pending' && (
                      <span className="text-primary" suppressHydrationWarning>
                        {waitingLabel(d.firstUploadAt)}
                      </span>
                    )}
                    {d.feedback.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquareTextIcon className="size-3" aria-hidden="true" />
                        {d.feedback.length}
                      </span>
                    )}
                  </span>
                </span>
                <Badge variant={d.status === 'reviewed' ? 'default' : 'secondary'}>
                  {d.status === 'reviewed' ? 'נבדק' : 'ממתין'}
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
