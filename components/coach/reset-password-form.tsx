'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { completeTraineePasswordReset } from '@/app/coach/trainees/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

export function ResetPasswordForm({ requestId, traineeName }: { requestId: string; traineeName: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [pending, startTransition] = useTransition()
  const inputId = `new-password-${requestId}`

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await completeTraineePasswordReset(requestId, password)
      if (result.ok) {
        toast.success(result.message)
        setPassword('')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>סיסמה חדשה עבור {traineeName}</Label>
        <Input
          id={inputId}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">לפחות 8 תווים. מסרו את הסיסמה למתאמן בעצמכם.</p>
      </div>
      <Button type="submit" className="h-11" disabled={pending || password.length < 8}>
        {pending && <Spinner />}
        עדכון סיסמה
      </Button>
    </form>
  )
}
