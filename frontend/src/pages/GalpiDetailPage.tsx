import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ApiError,
  changePhraseSort,
  deleteGalpi,
  getGalpi,
  markGalpiViewed,
  updateGalpi,
  type Galpi,
  type GalpiInput,
  type PhraseSort,
} from '../api/galpis'
import { createPhrase, listPhrases, setPhraseFavorite, type Phrase, type PhraseInput } from '../api/phrases'
import GalpiForm from '../components/GalpiForm'
import PhraseForm from '../components/PhraseForm'
import PhraseList from '../components/PhraseList'
import Sheet from '../components/Sheet'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'failed' }
  | { status: 'loaded'; galpi: Galpi }

type PhrasesState = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; phrases: Phrase[] }

const RETRY_LATER = '잠시 후 다시 시도해 주세요'

function deleteConfirmMessage(phraseCount: number): string {
  return phraseCount > 0
    ? `문장 ${phraseCount}개도 함께 삭제됩니다. 이 갈피를 삭제할까요?`
    : '이 갈피를 삭제할까요?'
}

function GalpiDetailPage() {
  const { galpiId = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [phrasesState, setPhrasesState] = useState<PhrasesState>({ status: 'loading' })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [phraseSaving, setPhraseSaving] = useState(false)
  const [favoritePending, setFavoritePending] = useState<ReadonlySet<string>>(new Set())

  const loadPhrases = useCallback(async () => {
    try {
      setPhrasesState({ status: 'loaded', phrases: await listPhrases(galpiId) })
    } catch {
      setPhrasesState({ status: 'failed' })
    }
  }, [galpiId])

  useEffect(() => {
    let active = true
    getGalpi(galpiId)
      .then((galpi) => active && setState({ status: 'loaded', galpi }))
      .catch((error: unknown) => {
        if (active) {
          setState({ status: error instanceof ApiError && error.status === 404 ? 'notFound' : 'failed' })
        }
      })
    listPhrases(galpiId)
      .then((phrases) => active && setPhrasesState({ status: 'loaded', phrases }))
      .catch(() => active && setPhrasesState({ status: 'failed' }))
    // Recording the view is a side benefit; the page works even if it fails.
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

  if (state.status === 'notFound' || state.status === 'failed') {
    return (
      <Page>
        <p className="font-serif text-lg">
          {state.status === 'notFound' ? '갈피를 찾을 수 없어요' : '갈피를 불러오지 못했어요'}
        </p>
        <Link to="/" className="text-sm font-semibold text-moss">
          홈으로
        </Link>
      </Page>
    )
  }

  const { galpi } = state

  // After adding a phrase both the count and the sorted list change.
  async function refresh() {
    try {
      setState({ status: 'loaded', galpi: await getGalpi(galpi.id) })
    } catch {
      // Keep showing the galpi we have; the phrase list below still refreshes.
    }
    await loadPhrases()
  }

  async function handleUpdate(input: GalpiInput) {
    setSaving(true)
    try {
      const updated = await updateGalpi(galpi.id, input)
      setState({ status: 'loaded', galpi: updated })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function closeEdit() {
    if (!saving) {
      setEditing(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(deleteConfirmMessage(galpi.phraseCount))) {
      return
    }
    try {
      await deleteGalpi(galpi.id)
      navigate('/')
    } catch {
      setActionError(RETRY_LATER)
    }
  }

  async function handleSortChange(phraseSort: PhraseSort) {
    setActionError(null)
    try {
      setState({ status: 'loaded', galpi: await changePhraseSort(galpi.id, phraseSort) })
      await loadPhrases()
    } catch {
      setActionError(RETRY_LATER)
    }
  }

  // Only the star changes in place; the order is applied the next time the list loads.
  async function handleToggleFavorite(phrase: Phrase) {
    setActionError(null)
    setFavoritePending((current) => new Set(current).add(phrase.id))
    try {
      const updated = await setPhraseFavorite(phrase.id, !phrase.favorite)
      setPhrasesState((current) =>
        current.status === 'loaded'
          ? {
              status: 'loaded',
              phrases: current.phrases.map((item) =>
                item.id === updated.id ? { ...item, favorite: updated.favorite } : item,
              ),
            }
          : current,
      )
    } catch {
      setActionError(RETRY_LATER)
    } finally {
      setFavoritePending((current) => {
        const next = new Set(current)
        next.delete(phrase.id)
        return next
      })
    }
  }

  function closeAddSheet() {
    if (!phraseSaving) {
      setAdding(false)
    }
  }

  async function handleAddPhrase(input: PhraseInput) {
    setPhraseSaving(true)
    try {
      await createPhrase(input)
    } finally {
      setPhraseSaving(false)
    }
    setAdding(false)
    await refresh()
  }

  return (
    <Page>
      <nav className="flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-ink/60">
          ‹ 갈피 목록
        </Link>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink/70"
            onClick={() => setEditing(true)}
          >
            편집
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-rose-700"
            onClick={() => void handleDelete()}
          >
            삭제
          </button>
        </div>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight break-words">{galpi.title}</h1>
        {galpi.description && <p className="text-ink/65 break-words">{galpi.description}</p>}
      </header>

      {actionError && <p className="text-sm text-rose-700">{actionError}</p>}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink/60">문장 {galpi.phraseCount}개</h2>
          <label className="flex items-center gap-2 text-sm text-ink/60">
            <select
              aria-label="정렬"
              className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm"
              value={galpi.phraseSort}
              onChange={(event) => void handleSortChange(event.target.value as PhraseSort)}
            >
              <option value="OLDEST">오래된 순</option>
              <option value="NEWEST">최신순</option>
            </select>
          </label>
        </div>

        {phrasesState.status === 'loading' && <p className="text-ink/60">불러오는 중…</p>}
        {phrasesState.status === 'failed' && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-ink/70">문장을 불러오지 못했어요</p>
            <button
              type="button"
              className="text-sm font-semibold text-moss"
              onClick={() => {
                setPhrasesState({ status: 'loading' })
                void loadPhrases()
              }}
            >
              다시 시도
            </button>
          </div>
        )}
        {phrasesState.status === 'loaded' &&
          (phrasesState.phrases.length === 0 ? (
            <p className="py-4 text-center text-ink/55">아직 문장이 없어요</p>
          ) : (
            <PhraseList
              galpiId={galpi.id}
              phrases={phrasesState.phrases}
              pendingIds={favoritePending}
              onToggleFavorite={(phrase) => void handleToggleFavorite(phrase)}
            />
          ))}

        <button
          type="button"
          className="rounded-2xl border border-dashed border-ink/25 px-5 py-3 text-sm font-semibold text-ink/70"
          onClick={() => setAdding(true)}
        >
          + 문장 추가
        </button>
      </section>

      {editing && (
        <Sheet label="갈피 편집" onClose={closeEdit}>
          <GalpiForm
            initial={{ title: galpi.title, description: galpi.description ?? '' }}
            submitLabel="저장"
            onSubmit={handleUpdate}
            onCancel={closeEdit}
          />
        </Sheet>
      )}

      {adding && (
        <Sheet label="문장 추가" onClose={closeAddSheet}>
          <PhraseForm
            initial={{ title: '', content: '', sources: [], galpiId: galpi.id }}
            submitLabel="저장"
            onSubmit={handleAddPhrase}
            onCancel={closeAddSheet}
          />
        </Sheet>
      )}
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-6">{children}</main>
}

export default GalpiDetailPage
