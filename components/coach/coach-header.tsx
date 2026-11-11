import { BrandMark } from '@/components/brand-mark'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DevRoleSwitcher } from '@/components/dev-role-switcher'
import { NavTabs, type NavItem } from '@/components/nav-tabs'
import { NotificationBell } from '@/components/notifications/notification-bell'

const NAV: NavItem[] = [
  { href: '/coach', label: 'תור בדיקה', exact: true },
  { href: '/coach/chat', label: 'צ׳אט' },
  { href: '/coach/invites', label: 'הזמנות' },
  { href: '/coach/tutorials', label: 'הדרכות' },
  { href: '/coach/announcements', label: 'עדכונים' },
]

export function CoachHeader({ fullName }: { fullName?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <BrandMark />
          <Badge variant="secondary">אזור המאמן</Badge>
        </div>
        {fullName === undefined ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <div className="flex items-center gap-2">
            <DevRoleSwitcher />
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">{fullName}</span>
            <NotificationBell />
            <SignOutButton iconOnly label="התנתקות" />
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-6xl px-4">
        <NavTabs items={NAV} label="ניווט מאמן" />
      </div>
    </header>
  )
}
