import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // A coach arriving from a password-reset approval email lands on the approval page.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { count } = await createAdminClient()
          .from('password_reset_requests')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
        if ((count ?? 0) > 0) return NextResponse.redirect(`${origin}/coach/reset-password`)
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
