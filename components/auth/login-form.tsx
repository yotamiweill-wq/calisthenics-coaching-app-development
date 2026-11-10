'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(
        error.code === 'email_not_confirmed'
          ? 'צריך לאשר את כתובת המייל לפני ההתחברות. בדקו את תיבת הדואר.'
          : error.status === 429
            ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'
            : 'האימייל או הסיסמה שגויים.',
      )
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-start text-base"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="h-12 text-base font-bold">
        {loading && <Loader2Icon className="animate-spin" />}
        התחברות
      </Button>
    </form>
  )
}
