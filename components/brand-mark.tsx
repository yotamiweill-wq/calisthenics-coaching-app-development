import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 12h18" />
          <path d="M7 8v8M17 8v8" />
        </svg>
      </span>
      <div className="flex flex-col gap-0.5 leading-none">
        <span
          dir="ltr"
          className="text-start text-lg font-black uppercase tracking-[0.08em]"
        >
          STATIC LAB
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          אימוני קליסטניקס
        </span>
      </div>
    </div>
  )
}
