import { BrandMark } from '@/components/brand-mark'
import { SignOutButton } from '@/components/auth/sign-out-button'

export const metadata = { title: 'החשבון מושבת | STATIC LAB' }

export default function DisabledPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <BrandMark />
      <h1 className="text-2xl font-black">החשבון שלך מושבת</h1>
      <p className="text-muted-foreground">
        הגישה לחשבון הושעתה. לפרטים נוספים פנו ישירות למאמן.
      </p>
      <div>
        <SignOutButton />
      </div>
    </main>
  )
}
