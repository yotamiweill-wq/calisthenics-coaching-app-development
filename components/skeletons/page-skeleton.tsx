import { CoachHeader } from '@/components/coach/coach-header'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Variant = 'cards' | 'list' | 'chat' | 'dashboard'
type Width = 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl'

interface PageSkeletonProps {
  role: 'coach' | 'trainee'
  width?: Width
  variant?: Variant
}

function TitleSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
  )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <Skeleton className="h-12 w-3/5 rounded-2xl" />
      <Skeleton className="h-12 w-2/5 self-end rounded-2xl" />
      <Skeleton className="h-12 w-1/2 rounded-2xl" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-xl" />
      <ListSkeleton />
    </div>
  )
}

export function PageSkeleton({ role, width = 'max-w-3xl', variant = 'list' }: PageSkeletonProps) {
  return (
    <div className="min-h-dvh bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">טוען…</span>
      {role === 'coach' ? <CoachHeader /> : <TraineeHeader />}
      <main className={cn('mx-auto flex w-full flex-col gap-6 px-4 py-6 pb-16', width)}>
        <TitleSkeleton />
        {variant === 'cards' && <CardsSkeleton />}
        {variant === 'list' && <ListSkeleton />}
        {variant === 'chat' && <ChatSkeleton />}
        {variant === 'dashboard' && <DashboardSkeleton />}
      </main>
    </div>
  )
}
