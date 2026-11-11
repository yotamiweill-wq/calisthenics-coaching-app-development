'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UUID_PATTERN, getActiveCoach, hasEmailVerificationSince } from '@/lib/password-reset'

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

const NO_PERMISSION = 'אין לך הרשאה לבצע פעולה זו.'
const THROTTLE_SECONDS = 60

async function findActiveTrainee(traineeId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email, role, removed_at')
    .eq('id', traineeId)
    .eq('role', 'trainee')
    .is('removed_at', null)
    .maybeSingle()
  return data
}

export async function requestTraineePasswordReset(traineeId: string): Promise<ActionResult> {
  const coach = await getActiveCoach()
  if (!coach) return { ok: false, error: NO_PERMISSION }
  if (!UUID_PATTERN.test(String(traineeId))) return { ok: false, error: 'המתאמן לא נמצא.' }

  const trainee = await findActiveTrainee(traineeId)
  if (!trainee) return { ok: false, error: 'המתאמן לא נמצא.' }

  const admin = createAdminClient()

  const since = new Date(Date.now() - THROTTLE_SECONDS * 1000).toISOString()
  const { count } = await admin
    .from('password_reset_requests')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coach.id)
    .gt('created_at', since)
  if ((count ?? 0) > 0) {
    return { ok: false, error: 'נשלחה בקשה לפני רגע. המתינו דקה ונסו שוב.' }
  }

  const { data: request, error: insertError } = await admin
    .from('password_reset_requests')
    .insert({ trainee_id: trainee.id, coach_id: coach.id })
    .select('id')
    .single()
  if (insertError || !request) return { ok: false, error: 'לא ניתן ליצור את הבקשה. נסו שוב.' }

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
  const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${proto}://${host}/auth/callback`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(coach.email, { redirectTo })
  if (error) {
    await admin.from('password_reset_requests').delete().eq('id', request.id)
    const rateLimited = error.status === 429 || error.code === 'over_email_send_rate_limit'
    return {
      ok: false,
      error: rateLimited
        ? 'נשלחו יותר מדי מיילים. נסו שוב בעוד כמה דקות.'
        : 'שליחת המייל נכשלה. נסו שוב מאוחר יותר.',
    }
  }

  revalidatePath('/coach')
  return { ok: true, message: 'בקשת אישור לאיפוס סיסמה נשלחה לכתובת המייל שלך' }
}

export async function removeTrainee(traineeId: string): Promise<ActionResult> {
  const coach = await getActiveCoach()
  if (!coach) return { ok: false, error: NO_PERMISSION }
  if (!UUID_PATTERN.test(String(traineeId))) return { ok: false, error: 'המתאמן לא נמצא.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Only the profile is unlinked. Submissions, feedback, workouts and messages are kept untouched.
  const { data, error } = await admin
    .from('profiles')
    .update({ removed_at: now, disabled_at: now })
    .eq('id', traineeId)
    .eq('role', 'trainee')
    .is('removed_at', null)
    .select('id, full_name')
    .maybeSingle()
  if (error) return { ok: false, error: 'הסרת המתאמן נכשלה. נסו שוב.' }
  if (!data) return { ok: false, error: 'המתאמן לא נמצא או שכבר הוסר.' }

  await admin
    .from('password_reset_requests')
    .update({ used_at: now })
    .eq('trainee_id', traineeId)
    .is('used_at', null)

  revalidatePath('/coach')
  revalidatePath('/coach/chat')
  revalidatePath('/coach/invites')
  return { ok: true, message: 'המתאמן הוסר. היסטוריית האימונים והסרטונים נשמרה.' }
}

export async function completeTraineePasswordReset(requestId: string, password: string): Promise<ActionResult> {
  const coach = await getActiveCoach()
  if (!coach) return { ok: false, error: NO_PERMISSION }
  if (!UUID_PATTERN.test(String(requestId))) return { ok: false, error: 'הבקשה לא נמצאה.' }

  const newPassword = String(password ?? '')
  if (newPassword.length < 8) return { ok: false, error: 'הסיסמה חייבת להכיל לפחות 8 תווים.' }
  if (newPassword.length > 72) return { ok: false, error: 'הסיסמה ארוכה מדי (עד 72 תווים).' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('password_reset_requests')
    .select('id, trainee_id, created_at')
    .eq('id', requestId)
    .eq('coach_id', coach.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (!request) return { ok: false, error: 'הבקשה אינה תקפה או שפג תוקפה. שלחו בקשה חדשה.' }

  if (!(await hasEmailVerificationSince(request.created_at))) {
    return { ok: false, error: 'יש לאשר את הבקשה דרך הקישור שנשלח למייל שלך.' }
  }

  const trainee = await findActiveTrainee(request.trainee_id)
  if (!trainee) return { ok: false, error: 'המתאמן לא נמצא.' }

  // Claim the request first so it can only be used once.
  const { data: claimed } = await admin
    .from('password_reset_requests')
    .update({ used_at: new Date().toISOString() })
    .eq('id', request.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()
  if (!claimed) return { ok: false, error: 'הבקשה כבר נוצלה.' }

  const { error } = await admin.auth.admin.updateUserById(trainee.id, { password: newPassword })
  if (error) {
    await admin.from('password_reset_requests').update({ used_at: null }).eq('id', request.id)
    return { ok: false, error: 'עדכון הסיסמה נכשל. נסו סיסמה אחרת.' }
  }

  revalidatePath('/coach/reset-password')
  revalidatePath('/coach')
  return { ok: true, message: `הסיסמה של ${trainee.full_name || 'המתאמן'} עודכנה בהצלחה` }
}
