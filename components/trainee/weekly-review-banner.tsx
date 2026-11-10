import { CalendarClockIcon } from 'lucide-react'

export function WeeklyReviewBanner({ lastSubmissionAt }: { lastSubmissionAt: string | null }) {
  const days = lastSubmissionAt
    ? Math.floor((Date.now() - new Date(lastSubmissionAt).getTime()) / 86_400_000)
    : null
  if (days !== null && days < 7) return null

  return (
    <aside
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"
    >
      <CalendarClockIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <p className="font-bold">הגיע הזמן לסקירה השבועית</p>
        <p className="text-sm text-muted-foreground">
          {days === null
            ? 'עוד לא העלית סרטון. צלמו החזקה והעלו אותה כדי שהמאמן יוכל לתת משוב.'
            : `עברו ${days} ימים מאז הסרטון האחרון. העלו החזקה חדשה כדי לעדכן שיאים ולקבל משוב.`}
        </p>
      </div>
    </aside>
  )
}
