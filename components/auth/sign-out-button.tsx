'use client'

import { useRouter } from 'next/navigation'
import { LogOutIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton({
  label = 'התנתקות',
  iconOnly = false,
}: {
  label?: string
  iconOnly?: boolean
}) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size={iconOnly ? 'icon-lg' : 'lg'}
      onClick={signOut}
      aria-label={label}
      title={label}
    >
      <LogOutIcon />
      {!iconOnly && label}
    </Button>
  )
}
