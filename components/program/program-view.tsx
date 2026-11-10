'use client'

import useSWR from 'swr'
import { ClipboardListIcon, FileTextIcon } from 'lucide-react'
import { signedUrl } from '@/lib/signed-url'
import { formatDateTime, type Program } from '@/lib/calisthenics'

export function ProgramView({ program }: { program: Program | null }) {
  const { data: pdfUrl } = useSWR(program?.pdf_path ? ['programs', program.pdf_path] : null, signedUrl, {
    revalidateOnFocus: false,
  })

  if (!program) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
          <ClipboardListIcon className="size-5" aria-hidden="true" />
        </span>
        <p className="font-bold">עוד לא הוקצתה לך תוכנית</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          כשהמאמן יכין לך תוכנית אימונים אישית, היא תופיע כאן.
        </p>
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-xl font-black text-balance">{program.title}</h2>
        <span className="text-xs text-muted-foreground">עודכנה {formatDateTime(program.updated_at)}</span>
      </header>

      {program.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[32rem] text-start text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-semibold">תרגיל</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">סטים / חזרות</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">מנוחה</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">הערות</th>
              </tr>
            </thead>
            <tbody>
              {program.rows.map((row, index) => (
                <tr key={index} className="border-t">
                  <th scope="row" className="px-3 py-2.5 text-start font-bold">{row.exercise}</th>
                  <td className="px-3 py-2.5 tabular-nums">{row.sets}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row.rest}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {program.notes && (
        <section aria-label="הערות המאמן" className="flex flex-col gap-1 rounded-xl bg-primary/5 p-3">
          <h3 className="text-sm font-bold text-primary">הערות מהמאמן</h3>
          <p className="whitespace-pre-wrap text-pretty leading-relaxed">{program.notes}</p>
        </section>
      )}

      {program.pdf_path && (
        <a
          href={pdfUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!pdfUrl}
          className="flex w-fit items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold hover:bg-accent"
        >
          <FileTextIcon className="size-4" aria-hidden="true" />
          {program.pdf_name ?? 'קובץ התוכנית (PDF)'}
        </a>
      )}
    </article>
  )
}
