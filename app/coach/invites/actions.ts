'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireCoach } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_DAYS = [1, 3, 7, 14, 30]
const MAX_PENDING = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type CreateInviteResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string }

export async function createInvite(input: {
  fullName: string
  email: string
  days: number
}): Promise<CreateInviteResult> {
  const coach = await requireCoach()

  const fullName = String(input.fullName ?? '').trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const days = Number(input.days)

  if (fullName.length > 80) return { ok: false, error: 'השם ארוך מדי (עד 80 תווים).' }
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
    return { ok: false, error: 'כתובת האימייל אינה תקינה.' }
  }
  if (!ALLOWED_DAYS.includes(days)) return { ok: false, error: 'תוקף ההזמנה אינו חוקי.' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('invites')
    .select('id', { count: 'exact', head: true })
    .is('accepted_at', null)
  if ((count ?? 0) >= MAX_PENDING) {
    return { ok: false, error: 'יש יותר מדי הזמנות פתוחות. בטלו הזמנות שלא נוצלו ונסו שוב.' }
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex')
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    full_name: fullName,
    email: email || null,
    role: 'trainee',
    token_hash: tokenHash,
    created_by: coach.id,
    expires_at: expiresAt,
  })

  if (error) {
    return {
      ok: false,
      error:
        error.code === '23505'
          ? 'כבר קיימת הזמנה עבור כתובת האימייל הזו.'
          : 'לא הצלחנו ליצור את ההזמנה. נסו שוב.',
    }
  }

  revalidatePath('/coach/invites')
  return { ok: true, token, expiresAt }
}

export async function revokeInvite(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireCoach()
  if (typeof id !== 'string' || id.length < 32) return { ok: false, error: 'הזמנה לא חוקית.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invites')
    .delete()
    .eq('id', id)
    .is('accepted_at', null)
    .select('id')

  if (error || !data?.length) {
    return { ok: false, error: 'לא ניתן לבטל את ההזמנה. ייתכן שכבר נוצלה.' }
  }

  revalidatePath('/coach/invites')
  return { ok: true }
}
