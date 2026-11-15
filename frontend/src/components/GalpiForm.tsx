import { useId, useState, type FormEvent } from 'react'
import { ApiError, type GalpiInput } from '../api/galpis'
import { validateGalpiInput, type Field, type FieldErrors } from '../lib/galpiValidation'

// The server reports which field failed; the wording shown to people is chosen here.
const SERVER_FIELD_MESSAGES: Record<Field, string> = {
  title: '제목은 1~50자로 입력해 주세요',
  description: '설명은 200자까지 쓸 수 있어요',
}

function messagesFor(error: unknown): { fields: FieldErrors; form: string | null } {
  if (error instanceof ApiError && error.status === 400) {
    const fields: FieldErrors = {}
    for (const field of Object.keys(SERVER_FIELD_MESSAGES) as Field[]) {
      if (error.fieldErrors[field]) {
        fields[field] = SERVER_FIELD_MESSAGES[field]
      }
    }
    return Object.keys(fields).length > 0
      ? { fields, form: null }
      : { fields, form: '입력한 내용을 다시 확인해 주세요' }
  }
  return { fields: {}, form: '잠시 후 다시 시도해 주세요' }
}

type GalpiFormProps = {
  initial?: GalpiInput
  submitLabel: string
  onSubmit: (input: GalpiInput) => Promise<void>
  onCancel: () => void
}

function GalpiForm({ initial, submitLabel, onSubmit, onCancel }: GalpiFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = { title, description }
    const errors = validateGalpiInput(input)
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSaving(true)
    try {
      await onSubmit(input)
    } catch (error) {
      const messages = messagesFor(error)
      setFieldErrors(messages.fields)
      setFormError(messages.form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink/80" htmlFor={titleId}>
          제목
        </label>
        <input
          id={titleId}
          className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-moss"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={fieldErrors.title ? true : undefined}
          autoFocus
        />
        {fieldErrors.title && <p className="text-sm text-rose-700">{fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink/80" htmlFor={descriptionId}>
          설명 (선택)
        </label>
        <textarea
          id={descriptionId}
          className="min-h-24 rounded-xl border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-moss"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={fieldErrors.description ? true : undefined}
        />
        {fieldErrors.description && (
          <p className="text-sm text-rose-700">{fieldErrors.description}</p>
        )}
      </div>

      {formError && <p className="text-sm text-rose-700">{formError}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink/60"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="submit"
          className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={saving}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export default GalpiForm
