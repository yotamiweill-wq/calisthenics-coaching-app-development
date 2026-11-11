import Link from 'next/link'
import { ArrowRightIcon, MailCheckIcon, ShieldCheckIcon } from 'lucide-react'
import { requireCoach } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasEmailVerificationSince } from '@/lib/password-reset'
import { CoachHeader } from '@/components/coach/coach-header'
import { ResetPasswordForm } from '@/components/coach/reset-password-form'

export const metadata = { title: 'איפוס סיסמה למתאמן | STATIC LAB' }

export default async function ResetPasswordPage() {
  const coach = await requireCoach()
  const admin = createAdminClient()

  const { data: requests } = await admin
    .from('password_reset_requests')
    .select('id, created_at, expires_at, trainee:profiles!password_reset_requests_trainee_id_fkey(full_name, email)')
    .eq('coach_id', coach.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const items = await Promise.all(
    (requests ?? []).map(async (request) => {
      const trainee = request.trainee as unknown as { full_name: string; email: string } | null
      return {
        id: request.id,
        name: trainee?.full_name || trainee?.email || 'מתאמן',
        verified: await hasEmailVerificationSince(request.created_at),
      }
    }),
  )

  return (
    <div className="min-h-dvh bg-background">
      <CoachHeader fullName={coach.full_name} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 pb-16">
        <Link
          href="/coach"
          className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowRightIcon className="size-4" aria-hidden="true" />
          חזרה לרשימה
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">איפוס סיסמה למתאמן</h1>
          <p className="text-sm text-muted-foreground">
            כדי להגדיר סיסמה חדשה יש לאשר את הבקשה דרך הקישור שנשלח למייל שלכם.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <MailCheckIcon className="size-5" aria-hidden="true" />
            </span>
            <p className="font-bold">אין בקשות איפוס פעילות</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              בחרו &quot;איפוס סיסמה&quot; בתפריט של מתאמן כדי לשלוח בקשת אישור למייל.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon
                    className={item.verified ? 'size-4 text-primary' : 'size-4 text-muted-foreground'}
                    aria-hidden="true"
                  />
                  <span className="font-bold">{item.name}</span>
                </div>
                {item.verified ? (
                  <ResetPasswordForm requestId={item.id} traineeName={item.name} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    ממתין לאישור. פתחו את המייל שנשלח אליכם ולחצו על הקישור כדי להמשיך.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
