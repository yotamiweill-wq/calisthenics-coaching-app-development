'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm({ token }: { token: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
        data: { invite_token: token, full_name: fullName.trim() },
      },
    })

    if (error) {
      const message = error.message.toLowerCase()
      setError(
        error.code === 'weak_password'
          ? 'הסיסמה חלשה מדי. השתמשו בלפחות 8 תווים.'
          : error.status === 429
            ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'
            : message.includes('database error') || message.includes('invite')
              ? 'ההזמנה אינה תקפה, פגה או כבר נוצלה. בקשו מהמאמן קישור חדש.'
              : 'לא הצלחנו ליצור את החשבון. בדקו את הפרטים ונסו שוב.',
      )
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setAwaitingConfirmation(true)
    setLoading(false)
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon className="size-12 text-primary" />
        <h2 className="text-xl font-bold">כמעט שם!</h2>
        <p className="text-sm text-muted-foreground">
          שלחנו אליך מייל לאישור הכתובת. אחרי האישור אפשר להתחבר ולהתחיל להעלות
          סרטונים.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">שם מלא</Label>
        <Input
          id="full_name"
          autoComplete="name"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-12 text-base"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">אימייל</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-start text-base"
          placeholder="you@email.com"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">סיסמה</Label>
        <Input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-start text-base"
        />
        <p className="text-xs text-muted-foreground">לפחות 8 תווים.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="h-12 text-base font-bold">
        {loading && <Loader2Icon className="animate-spin" />}
        יצירת חשבון
      </Button>
    </form>
  )
}
