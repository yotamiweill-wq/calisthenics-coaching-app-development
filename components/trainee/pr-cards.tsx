'use client'

import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import { TrophyIcon } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { exerciseLabel, formatShortDate, progressionLabel } from '@/lib/calisthenics'
import { personalRecords } from '@/lib/progress'

const chartConfig = {
  hold: { label: 'זמן החזקה (שנ׳)', color: 'var(--chart-1)' },
} satisfies ChartConfig

interface Entry {
  exercise: string
  progression: string
  hold_seconds: number
  created_at: string
}

export function PrCards({ entries, title = 'שיאים אישיים' }: { entries: Entry[]; title?: string }) {
  const records = personalRecords(entries)

  return (
    <section aria-labelledby="pr-title" className="flex flex-col gap-3">
      <h2 id="pr-title" className="flex items-center gap-2 text-lg font-bold">
        <TrophyIcon className="size-5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      {records.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          שיאים יופיעו כאן אחרי הסרטון הראשון.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {records.map((record) => (
            <li key={record.exercise} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{exerciseLabel(record.exercise)}</span>
                  <span className="text-xs text-muted-foreground">
                    {record.progression !== 'none' ? `${progressionLabel(record.progression)} · ` : ''}
                    {formatShortDate(record.achievedAt)}
                  </span>
                </div>
                <span className="text-3xl font-black tabular-nums text-primary">
                  {record.best}
                  <span className="ms-1 text-sm font-bold text-muted-foreground">שנ׳</span>
                </span>
              </div>
              {record.series.length > 1 ? (
                <div dir="ltr">
                  <ChartContainer config={chartConfig} className="aspect-auto h-20 w-full">
                    <AreaChart data={record.series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Area
                        dataKey="hold"
                        type="monotone"
                        stroke="var(--color-hold)"
                        fill="var(--color-hold)"
                        fillOpacity={0.15}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">עוד נתון אחד ויופיע גרף התקדמות.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
