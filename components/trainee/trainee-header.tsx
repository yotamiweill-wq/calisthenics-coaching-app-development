import { BrandMark } from '@/components/brand-mark'
import { Skeleton } from '@/components/ui/skeleton'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { DevRoleSwitcher } from '@/components/dev-role-switcher'
import { NavTabs, type NavItem } from '@/components/nav-tabs'
import { NotificationBell } from '@/components/notifications/notification-bell'

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'הדשבורד שלי', exact: true },
  { href: '/dashboard/program', label: 'התוכנית שלי' },
  { href: '/dashboard/tutorials', label: 'הדרכות' },
  { href: '/dashboard/announcements', label: 'עדכונים' },
  { href: '/dashboard/chat', label: 'צ׳אט' },
]

export function TraineeHeader({ fullName }: { fullName?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <BrandMark />
        {fullName === undefined ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <div className="flex items-center gap-2">
            <DevRoleSwitcher />
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
              {fullName}
            </span>
            <NotificationBell />
            <SignOutButton iconOnly label="התנתקות" />
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl px-4">
        <NavTabs items={NAV} label="ניווט מתאמן" />
      </div>
    </header>
  )
}
