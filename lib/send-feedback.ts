import { createClient } from '@/lib/supabase/client'
import type { FeedbackKind } from '@/lib/calisthenics'

interface SendFeedbackInput {
  /** Every submission this feedback applies to. More than one means a whole-workout-day review. */
  submissionIds: string[]
  traineeId: string
  coachId: string
  kind: FeedbackKind
  body?: string | null
  media?: { blob: Blob; extension: string; contentType: string }
}

export async function sendFeedback(input: SendFeedbackInput): Promise<string | null> {
  if (input.submissionIds.length === 0) return 'לא נבחרו סרטונים.'

  const supabase = createClient()
  const [primaryId] = input.submissionIds
  const batchId = input.submissionIds.length > 1 ? crypto.randomUUID() : null
  let mediaPath: string | null = null

  if (input.media) {
    mediaPath = `${input.traineeId}/${primaryId}/${crypto.randomUUID()}.${input.media.extension}`
    const { error: uploadError } = await supabase.storage
      .from('feedback')
      .upload(mediaPath, input.media.blob, { contentType: input.media.contentType, upsert: false })
    if (uploadError) return 'העלאת הקובץ נכשלה. נסו שוב.'
  }

  const body = input.body?.trim() || null
  const { error: insertError } = await supabase.from('feedback').insert(
    input.submissionIds.map((submissionId) => ({
      submission_id: submissionId,
      coach_id: input.coachId,
      kind: input.kind,
      body,
      media_path: mediaPath,
      batch_id: batchId,
    })),
  )

  if (insertError) {
    if (mediaPath) await supabase.storage.from('feedback').remove([mediaPath])
    return 'שמירת המשוב נכשלה. נסו שוב.'
  }

  await supabase
    .from('submissions')
    .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
    .in('id', input.submissionIds)
    .eq('status', 'pending')

  return null
}

export async function setReviewed(submissionIds: string[], reviewed: boolean): Promise<string | null> {
  const { error } = await createClient()
    .from('submissions')
    .update({
      status: reviewed ? 'reviewed' : 'pending',
      reviewed_at: reviewed ? new Date().toISOString() : null,
    })
    .in('id', submissionIds)
  return error ? 'עדכון הסטטוס נכשל.' : null
}
