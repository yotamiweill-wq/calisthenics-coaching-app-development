'use client'

import { useState } from 'react'
import { ArrowRightIcon, MessagesSquareIcon } from 'lucide-react'
import { ChatThread } from '@/components/chat/chat-thread'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InboxEntry {
  id: string
  name: string
  last: { body: string; created_at: string; mine: boolean } | null
}

export function CoachChatInbox({
  coachId,
  entries,
  initialTraineeId,
}: {
  coachId: string
  entries: InboxEntry[]
  initialTraineeId: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    entries.some((e) => e.id === initialTraineeId) ? initialTraineeId : null,
  )
  const selected = entries.find((e) => e.id === selectedId) ?? null

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
        עוד אין מתאמנים פעילים. הזמינו מתאמן כדי להתחיל שיחה.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <nav aria-label="מתאמנים" className={cn('flex flex-col gap-2', selected && 'hidden md:flex')}>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setSelectedId(entry.id)}
                aria-current={entry.id === selectedId ? 'true' : undefined}
                className={cn(
                  'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-start transition-all active:scale-[0.98]',
                  entry.id === selectedId ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent',
                )}
              >
                <span className="w-full truncate font-bold">{entry.name}</span>
                <span className="w-full truncate text-sm text-muted-foreground">
                  {entry.last ? `${entry.last.mine ? 'את/ה: ' : ''}${entry.last.body}` : 'עוד אין הודעות'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('flex min-w-0 flex-col gap-3', !selected && 'hidden md:flex')}>
        {selected ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="חזרה לרשימת המתאמנים"
              >
                <ArrowRightIcon />
              </Button>
              <h2 className="truncate text-lg font-black">{selected.name}</h2>
            </div>
            <ChatThread
              key={selected.id}
              traineeId={selected.id}
              currentUserId={coachId}
              otherName={selected.name}
            />
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-muted-foreground">
            <MessagesSquareIcon className="size-8" aria-hidden="true" />
            <p className="text-sm">בחרו מתאמן כדי להתחיל שיחה.</p>
          </div>
        )}
      </div>
    </div>
  )
}
