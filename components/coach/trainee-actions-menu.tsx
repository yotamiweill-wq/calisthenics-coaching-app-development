'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EllipsisVerticalIcon, KeyRoundIcon, UserMinusIcon } from 'lucide-react'
import { removeTrainee, requestTraineePasswordReset } from '@/app/coach/trainees/actions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'

export function TraineeActionsMenu({ traineeId, traineeName }: { traineeId: string; traineeName: string }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetting, startReset] = useTransition()
  const [removing, startRemove] = useTransition()

  function resetPassword() {
    setMenuOpen(false)
    startReset(async () => {
      const result = await requestTraineePasswordReset(traineeId)
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  function confirmRemoval() {
    startRemove(async () => {
      const result = await removeTrainee(traineeId)
      if (result.ok) {
        toast.success(result.message)
        setConfirmOpen(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          aria-label={`ניהול המתאמן ${traineeName}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-secondary text-foreground transition-all hover:bg-accent active:scale-95"
        >
          {resetting ? <Spinner className="size-4" /> : <EllipsisVerticalIcon className="size-4" aria-hidden="true" />}
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-52 flex-col gap-1 p-1.5">
          <Button type="button" variant="ghost" className="h-10 justify-start gap-2" onClick={resetPassword}>
            <KeyRoundIcon aria-hidden="true" />
            איפוס סיסמה
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => {
              setMenuOpen(false)
              setConfirmOpen(true)
            }}
          >
            <UserMinusIcon aria-hidden="true" />
            הסרת מתאמן
          </Button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !removing && setConfirmOpen(open)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח שברצונך להסיר את המתאמן?</AlertDialogTitle>
            <AlertDialogDescription>
              {traineeName} יוסר מרשימת המתאמנים ולא יוכל להתחבר. כל האימונים, הסרטונים והמשובים שלו נשמרים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>ביטול</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={removing} onClick={confirmRemoval}>
              {removing && <Spinner />}
              הסרת מתאמן
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
