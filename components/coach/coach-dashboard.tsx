'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { ClockIcon, MessageSquareTextIcon, UsersIcon, VideoIcon } from 'lucide-react'
import type { CoachSubmission, Profile } from '@/lib/calisthenics'
import { groupWorkoutDays, dedupeFeedback } from '@/lib/workout-days'
import { ReviewQueue, type QueueFilter } from '@/components/coach/review-queue'
import { TraineeList } from '@/components/coach/trainee-list'
import { ReviewDialog } from '@/components/coach/review-dialog'
import { cn } from '@/lib/utils'

type Tab = 'queue' | 'trainees'

export function CoachDashboard({
  coachId,
  trainees,
  submissions,
}: {
  coachId: string
  trainees: Profile[]
  submissions: CoachSubmission[]
}) {
  const [tab, setTab] = useState<Tab>('queue')
  // The tab highlight updates immediately; the heavy list renders at lower priority so clicks never block.
  const visibleTab = useDeferredValue(tab)
  const [filter, setFilter] = useState<QueueFilter>('pending')
  const [traineeFilter, setTraineeFilter] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const names = useMemo(() => new Map(trainees.map((t) => [t.id, t.full_name || t.email])), [trainees])
  const days = useMemo(() => groupWorkoutDays(submissions), [submissions])
  const active = days.find((d) => d.key === openId) ?? null

  const pending = days.filter((d) => d.status === 'pending').length
  const feedbackCount = dedupeFeedback(submissions.flatMap((s) => s.feedback)).length
  const activeTrainees = trainees.filter((t) => !t.disabled_at).length

  const stats = [
    { label: 'אימונים לבדיקה', value: pending, icon: ClockIcon, highlight: true },
    { label: 'מתאמנים פעילים', value: activeTrainees, icon: UsersIcon },
    { label: 'סרטונים בסך הכול', value: submissions.length, icon: VideoIcon },
    { label: 'משובים שנשלחו', value: feedbackCount, icon: MessageSquareTextIcon },
  ]

  function selectTrainee(id: string) {
    setTraineeFilter(id)
    setFilter('all')
    setTab('queue')
  }

  return (
    <>
      <section aria-label="סיכום" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col gap-3 rounded-2xl border p-4',
              stat.highlight ? 'border-primary/40 bg-primary/10' : 'bg-card',
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{stat.label}</span>
              <stat.icon className="size-4" aria-hidden="true" />
            </div>
            <span className={cn('text-4xl font-black tabular-nums', stat.highlight && 'text-primary')}>
              {stat.value}
            </span>
          </div>
        ))}
      </section>

      <div role="tablist" aria-label="תצוגה" className="grid max-w-md grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(
          [
            { value: 'queue', label: 'תור בדיקה' },
            { value: 'trainees', label: `מתאמנים (${trainees.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              'h-10 cursor-pointer rounded-lg text-sm font-bold transition-all active:scale-95',
              tab === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleTab === 'queue' ? (
        <ReviewQueue
          days={days}
          names={names}
          filter={filter}
          onFilterChange={setFilter}
          traineeFilter={traineeFilter}
          onClearTrainee={() => setTraineeFilter(null)}
          onOpen={setOpenId}
        />
      ) : (
        <TraineeList trainees={trainees} submissions={submissions} onSelect={selectTrainee} />
      )}

      <ReviewDialog
        day={active}
        traineeName={active ? (names.get(active.traineeId) ?? 'מתאמן') : ''}
        coachId={coachId}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
