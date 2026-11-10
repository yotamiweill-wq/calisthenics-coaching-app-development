'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { TrendingUpIcon } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  EXERCISES,
  exerciseLabel,
  formatShortDate,
  progressionLabel,
  type Submission,
} from '@/lib/calisthenics'
import { cn } from '@/lib/utils'

const chartConfig = {
  hold: { label: 'זמן החזקה (שנ׳)', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function ProgressChart({ submissions }: { submissions: Submission[] }) {
  const available = useMemo(
    () => EXERCISES.filter((e) => submissions.some((s) => s.exercise === e.value)),
    [submissions],
  )
  const [selected, setSelected] = useState<string | null>(null)
  const exercise = selected ?? submissions[0]?.exercise ?? available[0]?.value

  const data = useMemo(
    () =>
      submissions
        .filter((s) => s.exercise === exercise)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((s) => ({
          id: s.id,
          date: formatShortDate(s.created_at),
          hold: s.hold_seconds,
          progression: progressionLabel(s.progression),
        })),
    [submissions, exercise],
  )

  const first = data[0]?.hold
  const last = data[data.length - 1]?.hold
  const delta = first !== undefined && last !== undefined ? last - first : 0

  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="progress-title" className="text-lg font-bold">
            ההתקדמות שלי
          </h2>
          <p className="text-sm text-muted-foreground">
            {exercise ? exerciseLabel(exercise) : 'בחרו תרגיל'} · זמן החזקה לאורך זמן
          </p>
        </div>
        {data.length > 1 && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              delta >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
            )}
          >
            <TrendingUpIcon className="size-3.5" aria-hidden="true" />
            <span dir="ltr">{delta >= 0 ? `+${delta}` : delta} שנ׳</span>
          </span>
        )}
      </div>

      {available.length > 1 && (
        <div role="radiogroup" aria-label="בחירת תרגיל" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {available.map((e) => (
            <button
              key={e.value}
              type="button"
              role="radio"
              aria-checked={exercise === e.value}
              onClick={() => setSelected(e.value)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
                exercise === e.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
          <p className="font-semibold">עוד אין מה להציג</p>
          <p className="text-sm text-muted-foreground">אחרי הסרטון הראשון יופיע כאן הגרף שלך.</p>
        </div>
      ) : (
        <div dir="ltr">
          <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} width={44} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as { date: string; progression: string } | undefined
                      return point ? `${point.date} · ${point.progression}` : ''
                    }}
                  />
                }
              />
              <Line
                dataKey="hold"
                type="monotone"
                stroke="var(--color-hold)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-hold)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </section>
  )
}
