import { ClockIcon, MessageSquareTextIcon, TimerIcon, VideoIcon } from 'lucide-react'
import { exerciseLabel, type Submission } from '@/lib/calisthenics'

export function StatsRow({ submissions }: { submissions: Submission[] }) {
  const total = submissions.length
  const pending = submissions.filter((s) => s.status === 'pending').length
  const feedbackCount = submissions.reduce((sum, s) => sum + s.feedback.length, 0)
  const best = submissions.reduce<Submission | null>(
    (top, s) => (!top || s.hold_seconds > top.hold_seconds ? s : top),
    null,
  )

  const stats = [
    {
      label: 'שיא החזקה',
      value: best ? `${best.hold_seconds}` : '—',
      unit: best ? 'שנ׳' : undefined,
      hint: best ? exerciseLabel(best.exercise) : 'עוד אין נתונים',
      icon: TimerIcon,
      highlight: true,
    },
    { label: 'סרטונים שהועלו', value: `${total}`, icon: VideoIcon },
    { label: 'ממתינים לבדיקה', value: `${pending}`, icon: ClockIcon },
    { label: 'הודעות מהמאמן', value: `${feedbackCount}`, icon: MessageSquareTextIcon },
  ]

  return (
    <section aria-label="סיכום" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={
            stat.highlight
              ? 'flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4'
              : 'flex flex-col gap-3 rounded-2xl border bg-card p-4'
          }
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{stat.label}</span>
            <stat.icon className="size-4" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={
                stat.highlight
                  ? 'text-4xl font-black tabular-nums text-primary'
                  : 'text-4xl font-black tabular-nums'
              }
            >
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-sm font-semibold text-muted-foreground">{stat.unit}</span>
            )}
          </div>
          {stat.hint && <span className="-mt-2 text-xs text-muted-foreground">{stat.hint}</span>}
        </div>
      ))}
    </section>
  )
}
