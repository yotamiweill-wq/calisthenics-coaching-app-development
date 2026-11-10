'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckIcon, FlameIcon, Loader2Icon, Undo2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computeStreaks, todayInIsrael } from '@/lib/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export function ActivityCalendar({ days, month }: { days: Set<string>; month: string }) {
  const [year, monthIndex] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthIndex - 1, 1))
  const length = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()
  const offset = first.getUTCDay()
  const label = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  const today = todayInIsrael()

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">{label}</h3>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`לוח פעילות, ${label}`}>
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: length }, (_, i) => {
          const day = i + 1
          const key = `${month}-${String(day).padStart(2, '0')}`
          const done = days.has(key)
          return (
            <span
              key={key}
              role="gridcell"
              aria-label={`${day} ${done ? 'אימון הושלם' : ''}`.trim()}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg text-xs font-semibold tabular-nums',
                done ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground',
                key === today && !done && 'ring-2 ring-primary',
              )}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function WorkoutCheckin({ userId, initialDays }: { userId: string; initialDays: string[] }) {
  const [days, setDays] = useState(() => new Set(initialDays))
  const [busy, setBusy] = useState(false)
  const today = todayInIsrael()
  const doneToday = days.has(today)
  const streaks = useMemo(() => computeStreaks([...days], today), [days, today])

  async function toggle() {
    setBusy(true)
    const supabase = createClient()
    const { error } = doneToday
      ? await supabase.from('workouts').delete().eq('trainee_id', userId).eq('done_on', today)
      : await supabase.from('workouts').insert({ trainee_id: userId, done_on: today })
    setBusy(false)
    if (error) {
      toast.error('העדכון נכשל. נסו שוב.')
      return
    }
    setDays((current) => {
      const next = new Set(current)
      if (doneToday) next.delete(today)
      else next.add(today)
      return next
    })
    if (!doneToday) toast.success('כל הכבוד! האימון סומן.')
  }

  return (
    <section aria-labelledby="checkin-title" className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="checkin-title" className="text-lg font-bold">
            יומן אימונים
          </h2>
          <p className="text-sm text-muted-foreground">סמנו כל יום שבו התאמנתם ושמרו על הרצף.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-primary">
          <FlameIcon className="size-4" aria-hidden="true" />
          <span className="text-sm font-black tabular-nums">{streaks.current}</span>
          <span className="text-xs font-semibold">ימים ברצף</span>
        </span>
      </div>

      <Button
        size="lg"
        variant={doneToday ? 'secondary' : 'default'}
        className="h-12 font-bold"
        onClick={toggle}
        disabled={busy}
        aria-pressed={doneToday}
      >
        {busy ? <Loader2Icon className="animate-spin" /> : doneToday ? <Undo2Icon /> : <CheckIcon />}
        {doneToday ? 'האימון של היום סומן - לחצו לביטול' : 'סימון אימון כהושלם'}
      </Button>

      <ActivityCalendar days={days} month={today.slice(0, 7)} />

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'רצף נוכחי', value: streaks.current },
          { label: 'רצף שיא', value: streaks.longest },
          { label: 'ימי אימון', value: streaks.total },
        ].map((item) => (
          <div key={item.label} className="flex flex-col rounded-xl bg-secondary/60 py-2">
            <dd className="text-xl font-black tabular-nums">{item.value}</dd>
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
