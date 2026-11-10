import { createClient } from '@/lib/supabase/client'

export async function signedUrl([bucket, path]: [string, string]) {
  const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
