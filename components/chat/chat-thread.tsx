'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Loader2Icon, SendIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

async function loadMessages([, traineeId]: [string, string]) {
  const { data, error } = await createClient()
    .from('messages')
    .select('id, trainee_id, sender_id, body, created_at')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: true })
    .limit(300)
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

const timeFormat = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jerusalem',
})

export function ChatThread({
  traineeId,
  currentUserId,
  otherName,
}: {
  traineeId: string
  currentUserId: string
  otherName: string
}) {
  const bottom = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: messages = [], isLoading, mutate } = useSWR(['chat', traineeId], loadMessages, {
    revalidateOnFocus: true,
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${traineeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `trainee_id=eq.${traineeId}` },
        () => {
          void mutate()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [traineeId, mutate])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function send() {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    const { error } = await createClient()
      .from('messages')
      .insert({ trainee_id: traineeId, sender_id: currentUserId, body })
    setBusy(false)
    if (error) {
      toast.error('שליחת ההודעה נכשלה.')
      return
    }
    setText('')
    void mutate()
  }

  return (
    <section aria-label={`שיחה עם ${otherName}`} className="flex h-[32rem] max-h-[70dvh] flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex-1 overflow-y-auto p-3" role="log" aria-live="polite">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-label="טוען" />
          </div>
        ) : messages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            עוד אין הודעות. שלחו הודעה ראשונה ל{otherName}.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => {
              const mine = message.sender_id === currentUserId
              return (
                <li key={message.id} className={cn('flex flex-col gap-0.5', mine ? 'items-start' : 'items-end')}>
                  <p
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      mine ? 'rounded-ss-sm bg-primary text-primary-foreground' : 'rounded-se-sm bg-secondary',
                    )}
                  >
                    {message.body}
                  </p>
                  <span className="px-1 text-[11px] text-muted-foreground">
                    {timeFormat.format(new Date(message.created_at))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
        className="flex items-end gap-2 border-t p-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          הודעה
        </label>
        <Textarea
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
              event.preventDefault()
              void send()
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="כתבו הודעה…"
          className="max-h-32 min-h-11 resize-none"
        />
        <Button type="submit" size="icon-lg" className="size-11 shrink-0" disabled={busy || !text.trim()} aria-label="שליחה">
          {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon className="rtl:-scale-x-100" />}
        </Button>
      </form>
    </section>
  )
}
