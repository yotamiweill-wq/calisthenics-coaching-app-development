import { createHash, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!secret || !timingSafeEqual(digest(request.headers.get('authorization') ?? ''), digest(`Bearer ${secret}`))) {
    return new Response(null, {status: 401})
  }
  const client = createAdminClient()
  const {data, error} = await client.rpc('expired_submission_uploads')
  if (error) return new Response(null, {status: 503})
  const paths = (data as {path: string}[]).map(row => row.path)
  if (paths.length) {
    const result = await client.storage.from('submissions').remove(paths)
    if (result.error) return new Response(null, {status: 503})
  }
  return new Response(null, {status: 204})
}
