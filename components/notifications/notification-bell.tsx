'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  BellIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  MessageSquareTextIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime, type AppNotification } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const ICONS = {
  feedback: MessageSquareTextIcon,
  program: ClipboardListIcon,
  announcement: MegaphoneIcon,
  message: MessageCircleIcon,
} as const

async function loadNotifications() {
  const { data, error } = await createClient()
    .from('notifications')
    .select('id, type, title, body, href, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export function NotificationBell() {
  const router = useRouter()
  const { data: items = [], mutate } = useSWR('notifications', loadNotifications, {
    revalidateOnFocus: true,
  })
  const unread = items.filter((item) => !item.read_at).length

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        void mutate()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [mutate])

  async function markRead(ids: string[]) {
    if (ids.length === 0) return
    const now = new Date().toISOString()
    await mutate(
      async () => {
        await createClient().from('notifications').update({ read_at: now }).in('id', ids)
        return loadNotifications()
      },
      {
        optimisticData: items.map((item) => (ids.includes(item.id) ? { ...item, read_at: now } : item)),
        revalidate: false,
      },
    )
  }

  function open(item: AppNotification) {
    void markRead(item.read_at ? [] : [item.id])
    if (item.href) router.push(item.href)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="relative"
            aria-label={unread > 0 ? `התראות, ${unread} חדשות` : 'התראות'}
          />
        }
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-4 text-primary-foreground"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-bold">התראות</h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markRead(items.filter((i) => !i.read_at).map((i) => i.id))}
            >
              <CheckCheckIcon />
              סימון הכול כנקרא
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">אין התראות חדשות.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((item) => {
              const Icon = ICONS[item.type]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(item)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b px-3 py-3 text-start transition-colors last:border-b-0 hover:bg-accent',
                      !item.read_at && 'bg-primary/5',
                    )}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn('text-sm', !item.read_at ? 'font-bold' : 'font-medium')}>
                        {item.title}
                      </span>
                      {item.body && <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>}
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(item.created_at)}</span>
                    </span>
                    {!item.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
