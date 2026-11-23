'use server'

import { requireTrainee } from '@/lib/auth'
import { BASICS, EXERCISES, PROGRESSIONS } from '@/lib/calisthenics'
import { createClient } from '@/lib/supabase/server'

export async function saveSubmission(input: {path: string; exercise: string; progression: string; hold: number | null; reps: number | null; note: string}) {
  const profile = await requireTrainee()
  const validCount = (n: number | null, max: number) => n === null || (Number.isInteger(n) && n >= 1 && n <= max)
  if (!input || typeof input.path !== 'string' || !input.path.startsWith(`${profile.id}/`) || !/^uploads\/[\da-f-]{36}\.[a-z0-9]{1,12}$/i.test(input.path.slice(profile.id.length + 1)) ||
    !EXERCISES.some(x => x.value === input.exercise) || !(input.exercise === BASICS ? input.progression === 'none' && input.hold === null : PROGRESSIONS.some(x => x.value === input.progression)) ||
    !validCount(input.hold, 600) || !validCount(input.reps, 1000) || typeof input.note !== 'string' || input.note.length > 500) {
    return {error: {message: 'נתוני הסרטון אינם תקינים.', code: 'INVALID_SUBMISSION'}}
  }
  const client = await createClient()
  const {error} = await client.from('submissions').insert({trainee_id: profile.id, video_path: input.path, exercise: input.exercise, progression: input.progression, hold_seconds: input.hold, reps: input.reps, note: input.note.trim() || null})
  if (error?.code === '23505' || error?.code === 'P0002') {
    const {data} = await client.from('submissions').select('id').eq('trainee_id', profile.id).eq('video_path', input.path).maybeSingle()
    if (data) return {error: null}
  }
  if (error) console.error('Submission insert failed', error)
  return {error: error ? {message: error.message, code: error.code, details: error.details, hint: error.hint} : null}
}
