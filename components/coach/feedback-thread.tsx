'use client'

import useSWR from 'swr'
import { ImageIcon, Loader2Icon, MessageSquareTextIcon, MicIcon } from 'lucide-react'
import { formatDateTime, type FeedbackItem } from '@/lib/calisthenics'
import { signedUrl } from '@/lib/signed-url'

function Media({ item }: { item: FeedbackItem }) {
  const { data: url } = useSWR(item.media_path ? ['feedback', item.media_path] : null, signedUrl, {
    revalidateOnFocus: false,
  })

  if (!url) {
    return (
      <div className="flex h-10 items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-label="טוען" />
      </div>
    )
  }
  if (item.kind === 'voice') return <audio controls preload="none" src={url} className="h-10 w-full" />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="תמונת משוב שנשלחה" className="max-h-60 w-full rounded-lg object-contain" />
  )
}

export function FeedbackThread({ items }: { items: FeedbackItem[] }) {
  const sorted = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        עוד לא נשלח משוב לסרטון הזה.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((item) => {
        const Icon = item.kind === 'voice' ? MicIcon : item.kind === 'image' ? ImageIcon : MessageSquareTextIcon
        return (
          <li key={item.id} className="flex flex-col gap-2 rounded-xl border bg-secondary/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Icon className="size-3.5" aria-hidden="true" />
                {item.kind === 'voice' ? 'הקלטה' : item.kind === 'image' ? 'תמונה' : 'טקסט'}
              </span>
              <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
            </div>
            {item.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>}
            {item.media_path && <Media item={item} />}
          </li>
        )
      })}
    </ul>
  )
}
