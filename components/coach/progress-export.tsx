'use client'

import { useMemo, useState } from 'react'
import { FlameIcon, PrinterIcon, TrophyIcon, VideoIcon } from 'lucide-react'
import { exerciseLabel, formatShortDate, progressionLabel } from '@/lib/calisthenics'
import { computeStreaks, dateInIsrael, formatMonth, monthKey, todayInIsrael } from '@/lib/progress'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'

interface Entry {
  id: string
  exercise: string
  progression: string
  hold_seconds: number
  created_at: string
}

export function ProgressExport({
  traineeName,
  submissions,
  workoutDays,
}: {
  traineeName: string
  submissions: Entry[]
  workoutDays: string[]
}) {
  const today = todayInIsrael()
  const months = useMemo(() => {
    const keys = new Set<string>([monthKey(today)])
    submissions.forEach((s) => keys.add(monthKey(dateInIsrael(s.created_at))))
    workoutDays.forEach((d) => keys.add(monthKey(d)))
    return [...keys].sort().reverse()
  }, [submissions, workoutDays, today])
  const [month, setMonth] = useState(months[0])

  const summary = useMemo(() => {
    const inMonth = submissions.filter((s) => monthKey(dateInIsrael(s.created_at)) === month)
    const before = submissions.filter((s) => monthKey(dateInIsrael(s.created_at)) < month)
    const exercises = [...new Set(inMonth.map((s) => s.exercise))]
    const gains = exercises.map((exercise) => {
      const best = Math.max(...inMonth.filter((s) => s.exercise === exercise).map((s) => s.hold_seconds))
      const previous = Math.max(0, ...before.filter((s) => s.exercise === exercise).map((s) => s.hold_seconds))
      return { exercise, best, previous, gain: best - previous }
    })
    const monthDays = workoutDays.filter((d) => monthKey(d) === month)
    const endOfMonth = month === monthKey(today) ? today : `${month}-31`
    const streaks = computeStreaks(monthDays, endOfMonth)
    return { inMonth, gains, workouts: monthDays.length, longest: streaks.longest }
  }, [submissions, workoutDays, month, today])

  return (
    <section aria-label="ייצוא סיכום התקדמות" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h2 className="text-lg font-bold">סיכום חודשי</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="export-month" className="sr-only">
            חודש
          </label>
          <select
            id="export-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm font-semibold"
          >
            {months.map((key) => (
              <option key={key} value={key}>
                {formatMonth(key)}
              </option>
            ))}
          </select>
          <Button className="h-10 font-bold" onClick={() => window.print()}>
            <PrinterIcon />
            הדפסה / PDF
          </Button>
        </div>
      </div>

      <article className="flex flex-col gap-4 rounded-2xl border bg-card p-5 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-2xl font-black text-balance">{traineeName}</h3>
            <p className="text-sm text-muted-foreground">סיכום התקדמות · {formatMonth(month)}</p>
          </div>
          <BrandMark />
        </header>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary/60 py-3">
            <VideoIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <dd className="text-2xl font-black tabular-nums">{summary.inMonth.length}</dd>
            <dt className="text-[11px] text-muted-foreground">סרטונים</dt>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary/60 py-3">
            <FlameIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <dd className="text-2xl font-black tabular-nums">{summary.workouts}</dd>
            <dt className="text-[11px] text-muted-foreground">ימי אימון</dt>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary/60 py-3">
            <FlameIcon className="size-4 text-primary" aria-hidden="true" />
            <dd className="text-2xl font-black tabular-nums text-primary">{summary.longest}</dd>
            <dt className="text-[11px] text-muted-foreground">רצף שיא בחודש</dt>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-bold">
            <TrophyIcon className="size-4 text-primary" aria-hidden="true" />
            שיפור שיאים
          </h4>
          {summary.gains.length === 0 ? (
            <p className="text-sm text-muted-foreground">לא הועלו סרטונים בחודש זה.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {summary.gains.map((item) => (
                <li key={item.exercise} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span className="font-semibold">{exerciseLabel(item.exercise)}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="font-black">{item.best} שנ׳</span>
                    <span
                      dir="ltr"
                      className={item.gain > 0 ? 'font-bold text-primary' : 'text-muted-foreground'}
                    >
                      {item.previous === 0 ? 'חדש' : item.gain > 0 ? `+${item.gain}` : item.gain === 0 ? '=' : item.gain}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {summary.inMonth.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold">סרטונים שהוגשו</h4>
            <ul className="flex flex-col divide-y rounded-xl border text-sm">
              {summary.inMonth.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {exerciseLabel(s.exercise)}
                    {s.progression !== 'none' && (
                      <span className="text-muted-foreground"> · {progressionLabel(s.progression)}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span className="font-bold">{s.hold_seconds} שנ׳</span>
                    <span className="text-xs text-muted-foreground">{formatShortDate(s.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </section>
  )
}
