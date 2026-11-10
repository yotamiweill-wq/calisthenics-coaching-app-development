'use client'

import { useState } from 'react'
import type { Program } from '@/lib/calisthenics'
import { PrCards } from '@/components/trainee/pr-cards'
import { ActivityCalendar } from '@/components/trainee/workout-checkin'
import { ProgressExport } from '@/components/coach/progress-export'
import { ProgramEditor } from '@/components/coach/program-editor'
import { ChatThread } from '@/components/chat/chat-thread'
import { computeStreaks, todayInIsrael } from '@/lib/progress'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'program' | 'chat'

interface Entry {
  id: string
  exercise: string
  progression: string
  hold_seconds: number
  created_at: string
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'סקירה והתקדמות' },
  { value: 'program', label: 'תוכנית אימונים' },
  { value: 'chat', label: 'צ׳אט' },
]

export function TraineeWorkspace({
  coachId,
  trainee,
  submissions,
  workoutDays,
  program,
}: {
  coachId: string
  trainee: { id: string; full_name: string }
  submissions: Entry[]
  workoutDays: string[]
  program: Program | null
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const today = todayInIsrael()
  const streaks = computeStreaks(workoutDays, today)
  const name = trainee.full_name || 'מתאמן'

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="תצוגת מתאמן" className="grid max-w-xl grid-cols-3 gap-1 rounded-xl bg-secondary p-1 print:hidden">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              'h-10 rounded-lg text-sm font-bold transition-colors',
              tab === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 print:hidden">
            <PrCards entries={submissions} />
            <section aria-label="פעילות" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">פעילות אימונים</h2>
                <span className="text-sm text-muted-foreground">
                  רצף נוכחי: <b className="tabular-nums text-foreground">{streaks.current}</b> · שיא:{' '}
                  <b className="tabular-nums text-foreground">{streaks.longest}</b>
                </span>
              </div>
              <ActivityCalendar days={new Set(workoutDays)} month={today.slice(0, 7)} />
            </section>
          </div>
          <ProgressExport traineeName={name} submissions={submissions} workoutDays={workoutDays} />
        </div>
      )}

      {tab === 'program' && <ProgramEditor traineeId={trainee.id} coachId={coachId} program={program} />}

      {tab === 'chat' && <ChatThread traineeId={trainee.id} currentUserId={coachId} otherName={name} />}
    </div>
  )
}
