'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckIcon, CopyIcon, Loader2Icon, MessageCircleIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { formatDateTime, type InviteRow } from '@/lib/calisthenics'
import { createInvite, revokeInvite } from '@/app/coach/invites/actions'
import { ChoiceGroup } from '@/components/trainee/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EXPIRY_OPTIONS = [
  { value: '1', label: 'יום' },
  { value: '3', label: '3 ימים' },
  { value: '7', label: 'שבוע' },
  { value: '14', label: 'שבועיים' },
  { value: '30', label: 'חודש' },
] as const

interface CreatedInvite {
  link: string
  name: string
  expiresAt: string
}

function InviteForm({ onCreated }: { onCreated: (invite: CreatedInvite) => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [days, setDays] = useState<string>('7')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createInvite({ fullName, email, days: Number(days) })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onCreated({
        link: `${window.location.origin}/auth/register?token=${encodeURIComponent(result.token)}`,
        name: fullName.trim(),
        expiresAt: result.expiresAt,
      })
      setFullName('')
      setEmail('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black">הזמנה חדשה</h2>
        <p className="text-sm text-muted-foreground">
          כל קישור הוא חד-פעמי. אפשר לקשור אותו לכתובת אימייל כדי שרק היא תוכל להירשם.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-name">שם המתאמן (לא חובה)</Label>
          <Input
            id="invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            className="h-11 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-email">אימייל (לא חובה)</Label>
          <Input
            id="invite-email"
            type="email"
            dir="ltr"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 text-start text-base"
            placeholder="trainee@email.com"
          />
        </div>
      </div>
      <ChoiceGroup label="תוקף ההזמנה" options={EXPIRY_OPTIONS} value={days} onChange={setDays} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 text-base font-bold">
        {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        יצירת קישור הזמנה
      </Button>
    </form>
  )
}

function CreatedPanel({ invite, onDismiss }: { invite: CreatedInvite; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.link)
      setCopied(true)
      toast.success('הקישור הועתק')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('ההעתקה נכשלה. סמנו את הקישור והעתיקו ידנית.')
    }
  }

  const greeting = invite.name ? `היי ${invite.name}, ` : 'היי, '
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `${greeting}הזמנתי אותך להצטרף לאפליקציית האימונים שלי: ${invite.link}`,
  )}`

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black">הקישור מוכן</h2>
        <p className="text-sm text-muted-foreground">
          הקישור מוצג פעם אחת בלבד ולא נשמר במערכת. העתיקו ושלחו אותו עכשיו. תוקף עד{' '}
          <span>{formatDateTime(invite.expiresAt)}</span>.
        </p>
      </div>
      <Input
        readOnly
        dir="ltr"
        value={invite.link}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="קישור ההזמנה"
        className="h-11 text-start font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="h-11 px-5 font-bold">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'הועתק' : 'העתקת קישור'}
        </Button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'secondary', className: 'h-11 px-5 font-bold' })}
        >
          <MessageCircleIcon />
          שליחה בוואטסאפ
        </a>
        <Button variant="ghost" onClick={onDismiss} className="h-11">
          סגירה
        </Button>
      </div>
    </div>
  )
}

function InviteItem({ invite }: { invite: InviteRow }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function revoke() {
    startTransition(async () => {
      const result = await revokeInvite(invite.id)
      if (!result.ok) {
        toast.error(result.error ?? 'הביטול נכשל.')
        setConfirming(false)
        return
      }
      toast.success('ההזמנה בוטלה')
      router.refresh()
    })
  }

  const label = invite.full_name || invite.email || 'הזמנה ללא שם'

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{label}</span>
          {invite.status === 'expired' && <Badge variant="outline">פג תוקף</Badge>}
          {invite.status === 'accepted' && <Badge>הצטרף</Badge>}
        </div>
        {invite.email && invite.full_name && (
          <span className="truncate text-xs text-muted-foreground" dir="ltr">
            {invite.email}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {invite.status === 'accepted' && invite.accepted_at
            ? `הצטרף ב-${formatDateTime(invite.accepted_at)}`
            : invite.expires_at
              ? `נוצרה ${formatDateTime(invite.created_at)} · עד ${formatDateTime(invite.expires_at)}`
              : `נוצרה ${formatDateTime(invite.created_at)}`}
        </span>
      </div>

      {invite.status !== 'accepted' &&
        (confirming ? (
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="lg" onClick={revoke} disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              לבטל את ההזמנה
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setConfirming(false)} disabled={pending}>
              חזרה
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="lg" onClick={() => setConfirming(true)} aria-label={`ביטול ההזמנה של ${label}`}>
            <Trash2Icon />
            ביטול
          </Button>
        ))}
    </li>
  )
}

function Section({ title, invites, empty }: { title: string; invites: InviteRow[]; empty?: string }) {
  if (invites.length === 0 && !empty) return null
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-lg font-black">
        {title} <span className="text-muted-foreground">({invites.length})</span>
      </h2>
      {invites.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => (
            <InviteItem key={invite.id} invite={invite} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function InviteManager({ invites }: { invites: InviteRow[] }) {
  const [created, setCreated] = useState<CreatedInvite | null>(null)

  const active = invites.filter((i) => i.status === 'pending')
  const history = invites.filter((i) => i.status !== 'pending')

  return (
    <div className="flex flex-col gap-6">
      {created ? (
        <CreatedPanel invite={created} onDismiss={() => setCreated(null)} />
      ) : null}
      <InviteForm onCreated={setCreated} />
      <Section title="הזמנות פעילות" invites={active} empty="אין הזמנות פעילות. צרו קישור חדש למעלה." />
      <Section title="היסטוריה" invites={history} />
    </div>
  )
}
