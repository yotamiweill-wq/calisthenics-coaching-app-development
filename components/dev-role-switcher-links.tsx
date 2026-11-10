'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function DevRoleSwitcherLinks() {
  const pathname = usePathname()
  const viewingTrainee = pathname.startsWith('/dashboard')

  const options = [
    { href: '/coach', label: 'מאמן', active: !viewingTrainee },
    { href: '/dashboard', label: 'מתאמן', active: viewingTrainee },
  ]

  return (
    <div
      role="group"
      aria-label="החלפת תצוגה (פיתוח בלבד)"
      className="flex items-center gap-1 rounded-lg border border-dashed border-primary/50 p-0.5"
    >
      <span className="px-1.5 text-[10px] font-bold tracking-wider text-primary" dir="ltr">
        DEV
      </span>
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.active ? 'true' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
            option.active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
