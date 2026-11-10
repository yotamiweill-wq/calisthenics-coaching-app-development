import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata = { title: 'הרשמה בהזמנה | STATIC LAB' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const hasToken = typeof token === 'string' && token.length >= 16

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <BrandMark />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-balance">
          קיבלת הזמנה מהמאמן
        </h1>
        <p className="text-muted-foreground">
          צרו חשבון כדי להתחיל להעלות סרטוני החזקה ולקבל משוב אישי.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        {hasToken ? (
          <RegisterForm token={token} />
        ) : (
          <p role="alert" className="text-sm text-destructive">
            קישור ההזמנה חסר או שגוי. בקשו מהמאמן קישור חדש.
          </p>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        כבר יש לך חשבון?{' '}
        <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          התחברות
        </Link>
      </p>
    </main>
  )
}
