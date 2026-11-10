export const EXERCISES = [
  { value: 'planche', label: "פלאנץ'", english: 'Planche' },
  { value: 'front_lever', label: 'פרונט לבר', english: 'Front Lever' },
  { value: 'back_lever', label: 'באק לבר', english: 'Back Lever' },
  { value: 'human_flag', label: 'דגל אנושי', english: 'Human Flag' },
  { value: 'handstand', label: 'עמידת ידיים', english: 'Handstand' },
  { value: 'l_sit', label: 'אל-סיט', english: 'L-Sit' },
  { value: 'basics', label: 'בסיס', english: 'Basics' },
] as const

export const BASICS = 'basics'

export const PROGRESSIONS = [
  { value: 'tuck', label: 'טאק' },
  { value: 'adv_tuck', label: 'אדוונסד טאק' },
  { value: 'straddle', label: 'סטרדל' },
  { value: 'full', label: 'מלא' },
] as const

export type Exercise = (typeof EXERCISES)[number]['value']
export type Progression = (typeof PROGRESSIONS)[number]['value'] | 'none'

export function exerciseLabel(value: string) {
  return EXERCISES.find((e) => e.value === value)?.label ?? value
}

export function exerciseEnglish(value: string) {
  return EXERCISES.find((e) => e.value === value)?.english ?? value
}

export function progressionLabel(value: string) {
  if (value === 'none') return 'כללי'
  return PROGRESSIONS.find((p) => p.value === value)?.label ?? value
}

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Jerusalem',
})

const dateTimeFormatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jerusalem',
})

export function formatShortDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso))
}

export type FeedbackKind = 'text' | 'voice' | 'image'

export interface FeedbackItem {
  id: string
  kind: FeedbackKind
  body: string | null
  media_path: string | null
  created_at: string
}

export interface Submission {
  id: string
  exercise: Exercise
  progression: Progression
  hold_seconds: number
  note: string | null
  status: 'pending' | 'reviewed'
  video_path: string
  created_at: string
  reviewed_at: string | null
  feedback: FeedbackItem[]
}

export interface CoachSubmission extends Submission {
  trainee_id: string
}

export function waitingLabel(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return 'ממתין פחות משעה'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'ממתין שעה' : `ממתין ${hours} שעות`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'ממתין יום' : `ממתין ${days} ימים`
}

export function formatClock(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}

export interface Tutorial {
  id: string
  title: string
  description: string | null
  exercise: Exercise
  progression: Progression
  video_path: string
  folder_id: string | null
  created_at: string
}

export interface Folder {
  id: string
  parent_id: string | null
  name: string
  sort_order: number
}

export interface Announcement {
  id: string
  title: string
  body: string | null
  link_url: string | null
  media_path: string | null
  media_kind: 'image' | 'video' | null
  created_at: string
}

export interface ProgramRow {
  exercise: string
  sets: string
  rest: string
  note: string
}

export interface Program {
  id: string
  trainee_id: string
  title: string
  notes: string | null
  rows: ProgramRow[]
  pdf_path: string | null
  pdf_name: string | null
  updated_at: string
}

export interface Workout {
  id: string
  done_on: string
  note: string | null
}

export interface ChatMessage {
  id: string
  trainee_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface AppNotification {
  id: string
  type: 'feedback' | 'program' | 'announcement' | 'message'
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export const FEEDBACK_PRESETS = [
  'נעילת מרפקים מלאה',
  'PPT - הטיית אגן אחורית',
  'פרוטרקשן של הכתפיים',
  'הפעלת הליבה',
] as const

export type InviteStatus = 'pending' | 'expired' | 'accepted'

export interface InviteRow {
  id: string
  full_name: string
  email: string | null
  created_at: string
  expires_at: string | null
  accepted_at: string | null
  status: InviteStatus
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'coach' | 'trainee'
  disabled_at: string | null
}
