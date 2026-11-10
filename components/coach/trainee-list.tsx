'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchIcon, UsersIcon } from 'lucide-react'
import { exerciseLabel, formatShortDate, type CoachSubmission, type Profile } from '@/lib/calisthenics'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function TraineeList({
  trainees,
  submissions,
  onSelect,
}: {
  trainees: Profile[]
  submissions: CoachSubmission[]
  onSelect: (traineeId: string) => void
}) {
  const [query, setQuery] = useState('')

  const rows = trainees
    .filter((t) => {
      const needle = query.trim().toLowerCase()
      return !needle || t.full_name.toLowerCase().includes(needle) || t.email.toLowerCase().includes(needle)
    })
    .map((t) => {
      const own = submissions.filter((s) => s.trainee_id === t.id)
      const best = own.reduce<CoachSubmission | null>(
        (top, s) => (!top || s.hold_seconds > top.hold_seconds ? s : top),
        null,
      )
      const last = own.reduce<string | null>((latest, s) => (!latest || s.created_at > latest ? s.created_at : latest), null)
      return { trainee: t, total: own.length, pending: own.filter((s) => s.status === 'pending').length, best, last }
    })
    .sort((a, b) => b.pending - a.pending || a.trainee.full_name.localeCompare(b.trainee.full_name, 'he'))

  return (
    <section aria-label="רשימת מתאמנים" className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם או אימייל"
          aria-label="חיפוש מתאמן"
          className="h-11 ps-9"
        />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <UsersIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-bold">{trainees.length === 0 ? 'עוד אין מתאמנים רשומים' : 'לא נמצאו מתאמנים'}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {trainees.length === 0 ? 'מתאמנים שיצטרפו דרך הזמנה יופיעו כאן.' : 'נסו חיפוש אחר.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ trainee, total, pending, best, last }) => (
            <li key={trainee.id}>
              <button
                type="button"
                onClick={() => onSelect(trainee.id)}
                className="flex h-full w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-start transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-black text-primary"
                  >
                    {trainee.full_name.trim().charAt(0) || '?'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-bold">{trainee.full_name || 'ללא שם'}</span>
                    <span className="truncate text-xs text-muted-foreground" dir="ltr">
                      {trainee.email}
                    </span>
                  </span>
                  {trainee.disabled_at ? (
                    <Badge variant="destructive">מושבת</Badge>
                  ) : (
                    pending > 0 && <Badge>{pending} ממתינים</Badge>
                  )}
                </span>
                <span className="grid grid-cols-3 gap-2 text-center">
                  <span className="flex flex-col rounded-xl bg-secondary/60 py-2">
                    <span className="text-lg font-black tabular-nums">{total}</span>
                    <span className="text-[11px] text-muted-foreground">סרטונים</span>
                  </span>
                  <span className="flex flex-col rounded-xl bg-secondary/60 py-2">
                    <span className="text-lg font-black tabular-nums text-primary">{best ? best.hold_seconds : '—'}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {best ? `שיא · ${exerciseLabel(best.exercise)}` : 'שיא'}
                    </span>
                  </span>
                  <span className="flex flex-col rounded-xl bg-secondary/60 py-2">
                    <span className="text-lg font-black tabular-nums">{last ? formatShortDate(last) : '—'}</span>
                    <span className="text-[11px] text-muted-foreground">העלאה אחרונה</span>
                  </span>
                </span>
              </button>
              <Link
                href={`/coach/trainees/${trainee.id}`}
                className="mt-1.5 flex h-10 items-center justify-center rounded-xl bg-secondary text-sm font-bold transition-colors hover:bg-accent"
              >
                פרופיל, תוכנית וצ׳אט
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
