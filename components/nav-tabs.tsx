'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useOptimistic, useTransition, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
  exact?: boolean
}

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

export function NavTabs({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // The clicked tab becomes active on the same frame as the click; React reverts to the real
  // pathname once the transition settles, so a failed or redirected navigation never sticks.
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname)

  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
    if (modified || event.defaultPrevented) return
    event.preventDefault()
    if (href === pathname) return
    startTransition(() => {
      setOptimisticPath(href)
      router.push(href)
    })
  }

  return (
    <nav aria-label={label} aria-busy={isPending} className="-mb-px flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = isActive(item, optimisticPath)
        const pending = isPending && active && optimisticPath !== pathname
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={(event) => handleClick(event, item.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-sm font-bold transition-all active:scale-95',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              pending && 'animate-pulse',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
