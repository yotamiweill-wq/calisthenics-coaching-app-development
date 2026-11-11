import { dateInIsrael } from '@/lib/progress'
import type { CoachSubmission, FeedbackItem } from '@/lib/calisthenics'

export interface WorkoutDay {
  key: string
  traineeId: string
  date: string
  firstUploadAt: string
  lastUploadAt: string
  submissions: CoachSubmission[]
  status: 'pending' | 'reviewed'
  feedback: FeedbackItem[]
}

export function dedupeFeedback(items: FeedbackItem[]): FeedbackItem[] {
  const seen = new Set<string>()
  return [...items]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .filter((item) => {
      if (!item.batch_id) return true
      if (seen.has(item.batch_id)) return false
      seen.add(item.batch_id)
      return true
    })
}

export function groupWorkoutDays(submissions: CoachSubmission[]): WorkoutDay[] {
  const groups = new Map<string, CoachSubmission[]>()
  for (const submission of submissions) {
    const key = `${submission.trainee_id}:${dateInIsrael(submission.created_at)}`
    const list = groups.get(key) ?? []
    list.push(submission)
    groups.set(key, list)
  }

  return Array.from(groups, ([key, list]) => {
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))
    return {
      key,
      traineeId: sorted[0].trainee_id,
      date: key.slice(key.indexOf(':') + 1),
      firstUploadAt: sorted[0].created_at,
      lastUploadAt: sorted[sorted.length - 1].created_at,
      submissions: sorted,
      status: sorted.every((s) => s.status === 'reviewed') ? 'reviewed' : 'pending',
      feedback: dedupeFeedback(sorted.flatMap((s) => s.feedback)),
    } satisfies WorkoutDay
  })
}
