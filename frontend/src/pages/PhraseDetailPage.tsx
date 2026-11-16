import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, getGalpi, listGalpis, markGalpiViewed, type Galpi } from '../api/galpis'
import {
  deletePhrase,
  listPhrases,
  setPhraseFavorite,
  updatePhrase,
  type Phrase,
  type PhraseInput,
} from '../api/phrases'
import PhraseForm, { type GalpiOption } from '../components/PhraseForm'
import Sheet from '../components/Sheet'
import { displayTitle } from '../lib/phraseTitle'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'failed' }
  | { status: 'loaded'; galpi: Galpi; phrases: Phrase[] }

/** Horizontal finger travel, in pixels, that counts as a swipe to the next or previous phrase. */
const SWIPE_DISTANCE = 50

function PhraseDetailPage() {
  const { galpiId = '', phraseId = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [galpiOptions, setGalpiOptions] = useState<GalpiOption[]>([])
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // The list is loaded once per galpi; moving between phrases only changes the address.
  useEffect(() => {
    let active = true
    Promise.all([getGalpi(galpiId), listPhrases(galpiId)])
      .then(([galpi, phrases]) => active && setState({ status: 'loaded', galpi, phrases }))
      .catch((error: unknown) => {
        if (active) {
          setState({ status: error instanceof ApiError && error.status === 404 ? 'notFound' : 'failed' })
        }
      })
    markGalpiViewed(galpiId).catch(() => {})
    return () => {
      active = false
    }
  }, [galpiId])

  if (state.status === 'loading') {
    return (
      <Page>
        <p className="text-ink/60">불러오는 중…</p>
      </Page>
    )
  }

  const backLink = (label: string) => (
    <Link to={`/galpis/${galpiId}`} className="text-sm font-semibold text-ink/60">
      {label}
    </Link>
  )

  if (state.status !== 'loaded') {
    return (
      <Page>
        <p className="font-serif text-lg">
          {state.status === 'notFound' ? '갈피를 찾을 수 없어요' : '문장을 불러오지 못했어요'}
        </p>
        {backLink('갈피로 돌아가기')}
      </Page>
    )
  }

  const { galpi, phrases } = state
  const index = phrases.findIndex((item) => item.id === phraseId)
  if (index < 0) {
    return (
      <Page>
        <p className="font-serif text-lg">문장을 찾을 수 없어요</p>
        {backLink('갈피로 돌아가기')}
      </Page>
    )
  }
  const phrase = phrases[index]

  function goTo(target: number) {
    if (target >= 0 && target < phrases.length) {
      setActionError(null)
      navigate(`/galpis/${galpiId}/phrases/${phrases[target].id}`, { replace: true })
    }
  }

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) {
      return
    }
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? index + 1 : index - 1)
    }
  }

  function replacePhrase(updated: Phrase) {
    setState((current) =>
      current.status === 'loaded'
        ? { ...current, phrases: current.phrases.map((item) => (item.id === updated.id ? updated : item)) }
        : current,
    )
  }

  // Only the star changes; the position and order stay until the list is loaded again.
  async function handleToggleFavorite() {
    setActionError(null)
    setFavoritePending(true)
    try {
      const updated = await setPhraseFavorite(phrase.id, !phrase.favorite)
      replacePhrase({ ...phrase, favorite: updated.favorite })
    } catch {
      setActionError('잠시 후 다시 시도해 주세요')
    } finally {
      setFavoritePending(false)
    }
  }

  function openEdit() {
    setGalpiOptions([{ id: galpi.id, title: galpi.title }])
    setEditing(true)
    listGalpis()
      .then((galpis) => setGalpiOptions(galpis.map(({ id, title }) => ({ id, title }))))
      .catch(() => {})
  }

  function closeEdit() {
    if (!saving) {
      setEditing(false)
    }
  }

  async function handleSave(input: PhraseInput) {
    setSaving(true)
    let updated: Phrase
    try {
      updated = await updatePhrase(phrase.id, input)
    } finally {
      setSaving(false)
    }
    setEditing(false)
    if (updated.galpiId !== galpiId) {
      navigate(`/galpis/${galpiId}`)
      return
    }
    try {
      setState({ status: 'loaded', galpi, phrases: await listPhrases(galpiId) })
    } catch {
      replacePhrase(updated)
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 문장을 삭제할까요?')) {
      return
    }
    setSaving(true)
    try {
      await deletePhrase(phrase.id)
      navigate(`/galpis/${galpiId}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteFromPage() {
    setActionError(null)
    try {
      await handleDelete()
    } catch {
      setActionError('잠시 후 다시 시도해 주세요')
    }
  }

  const controlClass = 'rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-30'

  return (
    <Page>
      <nav className="flex items-center justify-between">
        {backLink(`‹ ${galpi.title}`)}
        <span className="text-sm text-ink/50">
          {index + 1}/{phrases.length}
        </span>
      </nav>

      <article
        className="flex flex-1 flex-col justify-center gap-5 py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <h1 className="font-serif text-2xl font-semibold break-words">{displayTitle(phrase)}</h1>
        <p className="font-serif text-xl leading-relaxed break-words whitespace-pre-line">{phrase.content}</p>
        {phrase.sources.length > 0 && (
          <p className="text-right text-sm text-ink/55 break-words">— {phrase.sources.join(' · ')}</p>
        )}
      </article>

      {actionError && <p className="text-sm text-rose-700">{actionError}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className={`${controlClass} text-xl`}
          aria-label="이전 문장"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          ◀
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`${controlClass} text-xl ${phrase.favorite ? 'text-amber-500' : 'text-ink/30'}`}
            aria-label="즐겨찾기"
            aria-pressed={phrase.favorite}
            disabled={favoritePending}
            onClick={() => void handleToggleFavorite()}
          >
            {phrase.favorite ? '★' : '☆'}
          </button>
          <button type="button" className={`${controlClass} text-ink/70`} onClick={openEdit}>
            편집
          </button>
          <button
            type="button"
            className={`${controlClass} text-rose-700`}
            disabled={saving}
            onClick={() => void handleDeleteFromPage()}
          >
            삭제
          </button>
        </div>
        <button
          type="button"
          className={`${controlClass} text-xl`}
          aria-label="다음 문장"
          disabled={index === phrases.length - 1}
          onClick={() => goTo(index + 1)}
        >
          ▶
        </button>
      </div>

      {editing && (
        <Sheet label="문장 편집" onClose={closeEdit}>
          <PhraseForm
            initial={{
              title: phrase.title ?? '',
              content: phrase.content,
              sources: phrase.sources,
              galpiId: phrase.galpiId,
            }}
            galpis={galpiOptions}
            submitLabel="저장"
            onSubmit={handleSave}
            onCancel={closeEdit}
            onDelete={handleDelete}
          />
        </Sheet>
      )}
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-6">{children}</main>
}

export default PhraseDetailPage
