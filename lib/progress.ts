import { EXERCISES, type Folder } from '@/lib/calisthenics'

interface HoldEntry {
  exercise: string
  progression: string
  hold_seconds: number | null
  created_at: string
}

const DAY_MS = 86_400_000

export function todayInIsrael(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(new Date())
}

export function dateInIsrael(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(new Date(iso))
}

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
}

export function computeStreaks(dates: string[], today: string) {
  const days = Array.from(new Set(dates.map(dayNumber))).sort((a, b) => a - b)
  let longest = 0
  let run = 0
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const set = new Set(days)
  const todayNumber = dayNumber(today)
  let cursor = set.has(todayNumber) ? todayNumber : todayNumber - 1
  let current = 0
  while (set.has(cursor)) {
    current++
    cursor--
  }
  return { current, longest, total: days.length }
}

export interface PersonalRecord {
  exercise: string
  best: number
  progression: string
  achievedAt: string
  series: { date: string; hold: number }[]
}

export function personalRecords(entries: HoldEntry[]): PersonalRecord[] {
  return EXERCISES.map((exercise) => {
    const own = entries
      .filter(
        (e): e is HoldEntry & { hold_seconds: number } =>
          e.exercise === exercise.value && e.hold_seconds != null,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    if (own.length === 0) return null
    const top = own.reduce((best, e) => (e.hold_seconds >= best.hold_seconds ? e : best), own[0])
    return {
      exercise: exercise.value as string,
      best: top.hold_seconds,
      progression: top.progression,
      achievedAt: top.created_at,
      series: own.map((e) => ({ date: dateInIsrael(e.created_at), hold: e.hold_seconds })),
    }
  }).filter((pr): pr is PersonalRecord => pr !== null)
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

export function formatMonth(key: string) {
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}-01T00:00:00Z`),
  )
}

export interface FolderOption {
  id: string
  label: string
}

export function flattenFolders(folders: Folder[]): FolderOption[] {
  const byParent = new Map<string | null, Folder[]>()
  for (const folder of folders) {
    const list = byParent.get(folder.parent_id) ?? []
    list.push(folder)
    byParent.set(folder.parent_id, list)
  }
  const result: FolderOption[] = []
  const walk = (parent: string | null, depth: number) => {
    const children = (byParent.get(parent) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'he'),
    )
    for (const child of children) {
      result.push({ id: child.id, label: `${'— '.repeat(depth)}${child.name}` })
      walk(child.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
}
