import { createClient } from '@/lib/supabase/client'
import type { FeedbackKind } from '@/lib/calisthenics'

interface SendFeedbackInput {
  submissionId: string
  traineeId: string
  coachId: string
  alreadyReviewed: boolean
  kind: FeedbackKind
  body?: string | null
  media?: { blob: Blob; extension: string; contentType: string }
}

export async function sendFeedback(input: SendFeedbackInput): Promise<string | null> {
  const supabase = createClient()
  let mediaPath: string | null = null

  if (input.media) {
    mediaPath = `${input.traineeId}/${input.submissionId}/${crypto.randomUUID()}.${input.media.extension}`
    const { error: uploadError } = await supabase.storage
      .from('feedback')
      .upload(mediaPath, input.media.blob, { contentType: input.media.contentType, upsert: false })
    if (uploadError) return 'העלאת הקובץ נכשלה. נסו שוב.'
  }

  const { error: insertError } = await supabase.from('feedback').insert({
    submission_id: input.submissionId,
    coach_id: input.coachId,
    kind: input.kind,
    body: input.body?.trim() || null,
    media_path: mediaPath,
  })

  if (insertError) {
    if (mediaPath) await supabase.storage.from('feedback').remove([mediaPath])
    return 'שמירת המשוב נכשלה. נסו שוב.'
  }

  if (!input.alreadyReviewed) {
    await supabase
      .from('submissions')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
      .eq('id', input.submissionId)
  }

  return null
}

export async function setReviewed(submissionId: string, reviewed: boolean): Promise<string | null> {
  const { error } = await createClient()
    .from('submissions')
    .update({
      status: reviewed ? 'reviewed' : 'pending',
      reviewed_at: reviewed ? new Date().toISOString() : null,
    })
    .eq('id', submissionId)
  return error ? 'עדכון הסטטוס נכשל.' : null
}
