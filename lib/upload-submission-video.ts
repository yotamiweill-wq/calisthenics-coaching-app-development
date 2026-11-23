import { createClient } from '@/lib/supabase/client'

const CHUNK = 6 * 1024 * 1024
export const SIZE_ERROR = 'הקובץ גדול מדי להעלאה (חריגה ממגבלת האחסון).'

export function submissionError(cause: unknown, stage: string) {
  const e = cause as {message?: string; status?: number; statusCode?: string; code?: string; originalError?: unknown; cause?: unknown} | null
  const message = e?.message || String(cause)
  const code = e?.code || e?.statusCode || e?.status
  if (String(code) === '413' || /EntityTooLarge|payload too large|exceeded the maximum allowed size|file too large|maximum (?:file|upload) size/i.test(`${message} ${code}`)) return SIZE_ERROR
  if (!navigator.onLine || [cause, e?.originalError, e?.cause].some(err => err instanceof TypeError && /failed to fetch/i.test(err.message))) return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.'
  return `${stage}: ${message}${code ? ` (${code})` : ''}`
}

export async function uploadSubmissionVideo(file: File, path: string, progress: (percent: number) => void) {
  const client = createClient()
  if (file.size <= CHUNK) {
    const { error } = await client.storage.from('submissions').upload(path, file, {contentType: file.type, upsert: false})
    if (error) throw error
    return
  }
  const { Upload } = await import('tus-js-client')
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('יש להתחבר מחדש כדי להעלות סרטון.')
  const endpoint = new URL('/storage/v1/upload/resumable', process.env.NEXT_PUBLIC_SUPABASE_URL!)
  if (/^[a-z0-9]+\.supabase\.co$/.test(endpoint.hostname)) endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co')
  await new Promise<void>((resolve, reject) => {
    new Upload(file, {
      endpoint: endpoint.href,
      headers: {authorization: `Bearer ${data.session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!},
      metadata: {bucketName: 'submissions', objectName: path, contentType: file.type, cacheControl: '3600'},
      chunkSize: CHUNK, retryDelays: [0, 1000, 3000, 5000], uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      onProgress: (sent, total) => progress(Math.floor(100 * sent / total)),
      onSuccess: () => resolve(),
      onError(err) {
        // Keep response details but never log the TUS request object (it holds the bearer token).
        const response = 'originalResponse' in err ? err.originalResponse : null
        reject(Object.assign(new Error(response?.getBody() || err.message), {status: response?.getStatus()}))
      },
    }).start()
  })
}
