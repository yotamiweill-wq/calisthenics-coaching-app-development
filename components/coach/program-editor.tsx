'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileTextIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Program, ProgramRow } from '@/lib/calisthenics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const MAX_PDF_BYTES = 15 * 1024 * 1024
const emptyRow = (): ProgramRow => ({ exercise: '', sets: '', rest: '', note: '' })

export function ProgramEditor({
  traineeId,
  coachId,
  program,
}: {
  traineeId: string
  coachId: string
  program: Program | null
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(program?.title ?? '')
  const [notes, setNotes] = useState(program?.notes ?? '')
  const [rows, setRows] = useState<ProgramRow[]>(program?.rows?.length ? program.rows : [emptyRow()])
  const [pdf, setPdf] = useState<{ path: string | null; name: string | null }>({
    path: program?.pdf_path ?? null,
    name: program?.pdf_name ?? null,
  })
  const [newFile, setNewFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  function updateRow(index: number, patch: Partial<ProgramRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function pickPdf(file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('אפשר לצרף רק קובץ PDF.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error('הקובץ גדול מדי. המקסימום הוא 15 MB.')
      return
    }
    setNewFile(file)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    const supabase = createClient()
    let pdfPath = pdf.path
    let pdfName = pdf.name

    if (newFile) {
      const path = `${traineeId}/${crypto.randomUUID()}.pdf`
      const { error } = await supabase.storage.from('programs').upload(path, newFile, { contentType: 'application/pdf' })
      if (error) {
        setBusy(false)
        toast.error('העלאת ה-PDF נכשלה.')
        return
      }
      if (program?.pdf_path) await supabase.storage.from('programs').remove([program.pdf_path])
      pdfPath = path
      pdfName = newFile.name
    } else if (!pdf.path && program?.pdf_path) {
      await supabase.storage.from('programs').remove([program.pdf_path])
    }

    const cleanRows = rows.filter((row) => row.exercise.trim())
    const { error } = await supabase.from('programs').upsert(
      {
        trainee_id: traineeId,
        title: title.trim(),
        notes: notes.trim() || null,
        rows: cleanRows,
        pdf_path: pdfPath,
        pdf_name: pdfName,
        created_by: coachId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trainee_id' },
    )
    setBusy(false)
    if (error) {
      toast.error('שמירת התוכנית נכשלה.')
      return
    }
    setNewFile(null)
    setPdf({ path: pdfPath, name: pdfName })
    toast.success('התוכנית נשמרה והמתאמן קיבל התראה.')
    router.refresh()
  }

  async function remove() {
    if (!program) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('programs').delete().eq('id', program.id)
    if (!error && program.pdf_path) await supabase.storage.from('programs').remove([program.pdf_path])
    setBusy(false)
    if (error) {
      toast.error('המחיקה נכשלה.')
      return
    }
    setTitle('')
    setNotes('')
    setRows([emptyRow()])
    setPdf({ path: null, name: null })
    toast.success('התוכנית הוסרה.')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        שם התוכנית
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          placeholder="למשל: בניית כוח לפלאנץ׳ - שלב 1"
          className="h-11"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">טבלת אימון</legend>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 rounded-xl border bg-secondary/30 p-2 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
            <Input
              aria-label={`תרגיל ${index + 1}`}
              placeholder="תרגיל"
              value={row.exercise}
              onChange={(e) => updateRow(index, { exercise: e.target.value })}
              className="col-span-2 h-10 md:col-span-1"
            />
            <Input
              aria-label={`סטים וחזרות ${index + 1}`}
              placeholder="סטים / חזרות"
              value={row.sets}
              onChange={(e) => updateRow(index, { sets: e.target.value })}
              className="h-10"
            />
            <Input
              aria-label={`מנוחה ${index + 1}`}
              placeholder="מנוחה"
              value={row.rest}
              onChange={(e) => updateRow(index, { rest: e.target.value })}
              className="h-10"
            />
            <Input
              aria-label={`הערה ${index + 1}`}
              placeholder="הערה"
              value={row.note}
              onChange={(e) => updateRow(index, { note: e.target.value })}
              className="col-span-2 h-10 md:col-span-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`הסרת שורה ${index + 1}`}
              onClick={() => setRows((current) => (current.length === 1 ? [emptyRow()] : current.filter((_, i) => i !== index)))}
              className="col-span-2 justify-self-end md:col-span-1"
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" className="h-10 self-start" onClick={() => setRows((c) => [...c, emptyRow()])}>
          <PlusIcon />
          הוספת שורה
        </Button>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        הערות כלליות
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={4000} />
      </label>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => pickPdf(e.target.files?.[0])}
        />
        {newFile || pdf.path ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border bg-secondary/40 p-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{newFile?.name ?? pdf.name}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewFile(null)
                setPdf({ path: null, name: null })
              }}
            >
              <XIcon />
              הסרה
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" className="h-11 self-start" onClick={() => fileInput.current?.click()}>
            <FileTextIcon />
            צירוף קובץ PDF
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="h-11 font-bold" disabled={busy || !title.trim()}>
          {busy ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {program ? 'עדכון תוכנית' : 'הקצאת תוכנית'}
        </Button>
        {program && (
          <Button type="button" variant="destructive" size="lg" className="h-11 font-bold" disabled={busy} onClick={remove}>
            <Trash2Icon />
            הסרת התוכנית
          </Button>
        )}
      </div>
    </form>
  )
}
