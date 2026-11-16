import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { PhraseInput } from '../api/phrases'
import {
  CONTENT_MAX_LENGTH,
  MAX_SOURCES,
  normalizePhraseInput,
  validatePhraseInput,
  type PhraseFieldErrors,
} from '../lib/phraseValidation'

// The server reports which field failed; the wording shown to people is chosen here.
const SERVER_FIELD_MESSAGES: Record<string, { field: keyof PhraseFieldErrors; message: string }> = {
  title: { field: 'title', message: '제목은 50자까지 쓸 수 있어요' },
  content: { field: 'content', message: '내용은 1~500자로 입력해 주세요' },
  source: { field: 'sources', message: '출처는 1~200자로 입력해 주세요' },
  sources: { field: 'sources', message: '출처는 10개까지 넣을 수 있어요' },
}

function messagesFor(error: unknown): { fields: PhraseFieldErrors; form: string | null } {
  if (error instanceof ApiError && error.status === 400) {
    const fields: PhraseFieldErrors = {}
    for (const [serverField, { field, message }] of Object.entries(SERVER_FIELD_MESSAGES)) {
      if (error.fieldErrors[serverField]) {
        fields[field] = message
      }
    }
    return Object.keys(fields).length > 0
      ? { fields, form: null }
      : { fields, form: '입력한 내용을 다시 확인해 주세요' }
  }
  return { fields: {}, form: '잠시 후 다시 시도해 주세요' }
}

export type GalpiOption = { id: string; title: string }

type PhraseFormProps = {
  initial: PhraseInput
  /** Galpis the phrase can be saved in. Without it the phrase stays in `initial.galpiId` and no choice is shown. */
  galpis?: GalpiOption[]
  submitLabel: string
  onSubmit: (input: PhraseInput) => Promise<void>
  onCancel: () => void
  /** Shown as a delete button when editing an existing phrase. */
  onDelete?: () => Promise<void>
}

function PhraseForm({ initial, galpis, submitLabel, onSubmit, onCancel, onDelete }: PhraseFormProps) {
  const [title, setTitle] = useState(initial.title)
  const [content, setContent] = useState(initial.content)
  const [sources, setSources] = useState<string[]>(initial.sources)
  const [galpiId, setGalpiId] = useState(initial.galpiId)
  const [fieldErrors, setFieldErrors] = useState<PhraseFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const contentId = useId()
  const galpiSelectId = useId()

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setFormError(null)
    try {
      await action()
    } catch (error) {
      const messages = messagesFor(error)
      setFieldErrors(messages.fields)
      setFormError(messages.form)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = normalizePhraseInput({ title, content, sources, galpiId })
    const errors = validatePhraseInput(input)
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) {
      return
    }
    void run(() => onSubmit(input))
  }

  function changeSource(index: number, value: string) {
    setSources((current) => current.map((source, at) => (at === index ? value : source)))
  }

  function removeSource(index: number) {
    setSources((current) => current.filter((_, at) => at !== index))
  }

  const inputClass =
    'rounded-xl border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-moss'

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink/80" htmlFor={titleId}>
          제목 (선택)
        </label>
        <input
          id={titleId}
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="비워 두면 내용 앞부분이 제목이 돼요"
          aria-invalid={fieldErrors.title ? true : undefined}
          autoFocus
        />
        {fieldErrors.title && <p className="text-sm text-rose-700">{fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink/80" htmlFor={contentId}>
          내용
        </label>
        <textarea
          id={contentId}
          className={`min-h-28 ${inputClass}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-invalid={fieldErrors.content ? true : undefined}
        />
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-rose-700">{fieldErrors.content}</span>
          <span className="shrink-0 text-ink/45">
            {content.length}/{CONTENT_MAX_LENGTH}
          </span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink/80">출처 (선택)</legend>
        {sources.map((source, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={`min-w-0 flex-1 ${inputClass}`}
              aria-label={`출처 ${index + 1}`}
              value={source}
              onChange={(event) => changeSource(index, event.target.value)}
            />
            <button
              type="button"
              className="rounded-full px-3 py-2 text-ink/50"
              aria-label={`출처 ${index + 1} 삭제`}
              onClick={() => removeSource(index)}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="self-start rounded-full px-1 py-1 text-sm font-semibold text-moss disabled:text-ink/35"
          onClick={() => setSources((current) => [...current, ''])}
          disabled={sources.length >= MAX_SOURCES}
        >
          + 출처 추가
        </button>
        {fieldErrors.sources && <p className="text-sm text-rose-700">{fieldErrors.sources}</p>}
      </fieldset>

      {galpis && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-ink/80" htmlFor={galpiSelectId}>
            갈피
          </label>
          <select
            id={galpiSelectId}
            className={inputClass}
            value={galpiId}
            onChange={(event) => setGalpiId(event.target.value)}
          >
            {galpis.map((galpi) => (
              <option key={galpi.id} value={galpi.id}>
                {galpi.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {formError && <p className="text-sm text-rose-700">{formError}</p>}

      <div className="flex items-center gap-2">
        {onDelete && (
          <button
            type="button"
            className="rounded-full px-3 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
            onClick={() => void run(onDelete)}
            disabled={busy}
          >
            삭제
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink/60 disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="submit"
            className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export default PhraseForm
