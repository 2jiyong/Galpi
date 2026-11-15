import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ApiError,
  deleteGalpi,
  getGalpi,
  markGalpiViewed,
  updateGalpi,
  type Galpi,
  type GalpiInput,
} from '../api/galpis'
import GalpiForm from '../components/GalpiForm'
import Sheet from '../components/Sheet'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'failed' }
  | { status: 'loaded'; galpi: Galpi }

function deleteConfirmMessage(phraseCount: number): string {
  return phraseCount > 0
    ? `문장 ${phraseCount}개도 함께 삭제됩니다. 이 갈피를 삭제할까요?`
    : '이 갈피를 삭제할까요?'
}

function GalpiDetailPage() {
  const { galpiId = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getGalpi(galpiId)
      .then((galpi) => active && setState({ status: 'loaded', galpi }))
      .catch((error: unknown) => {
        if (active) {
          setState({ status: error instanceof ApiError && error.status === 404 ? 'notFound' : 'failed' })
        }
      })
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

  async function handleUpdate(input: GalpiInput) {
    const updated = await updateGalpi(galpi.id, input)
    setState({ status: 'loaded', galpi: updated })
    setEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(deleteConfirmMessage(galpi.phraseCount))) {
      return
    }
    try {
      await deleteGalpi(galpi.id)
      navigate('/')
    } catch {
      setActionError('잠시 후 다시 시도해 주세요')
    }
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
        <button
          type="button"
          className="rounded-2xl bg-moss px-5 py-4 text-base font-semibold text-white disabled:bg-ink/15 disabled:text-ink/45"
          disabled={galpi.phraseCount === 0}
        >
          집중해서 보기
        </button>
        {galpi.phraseCount === 0 && (
          <p className="text-center text-sm text-ink/55">문장을 먼저 추가해 보세요</p>
        )}
      </section>

      {editing && (
        <Sheet label="갈피 편집" onClose={() => setEditing(false)}>
          <GalpiForm
            initial={{ title: galpi.title, description: galpi.description ?? '' }}
            submitLabel="저장"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
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
