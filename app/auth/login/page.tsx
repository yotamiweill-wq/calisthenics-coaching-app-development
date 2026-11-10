import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { LoginForm } from '@/components/auth/login-form'
import { getProfile } from '@/lib/auth'

export const metadata = { title: 'התחברות | STATIC LAB' }

export default async function LoginPage() {
  const profile = await getProfile()
  if (profile && !profile.disabled_at) redirect('/')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <BrandMark />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-balance">
          חוזרים להחזיק.
        </h1>
        <p className="text-muted-foreground">
          התחברו כדי להעלות סרטון חדש ולראות את המשוב של המאמן.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <LoginForm />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        ההרשמה פתוחה רק למתאמנים שהוזמנו על ידי המאמן.
      </p>
    </main>
  )
}
