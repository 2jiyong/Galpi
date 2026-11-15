import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { createGalpi, listGalpis, type Galpi, type GalpiInput } from '../api/galpis'
import GalpiForm from '../components/GalpiForm'
import Sheet from '../components/Sheet'
import { recentGalpis } from '../lib/recentGalpis'

type LoadState = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; galpis: Galpi[] }

function HomePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      setState({ status: 'loaded', galpis: await listGalpis() })
    } catch {
      setState({ status: 'failed' })
    }
  }, [])

  useEffect(() => {
    // Fetch on mount; the state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function handleCreate(input: GalpiInput) {
    setSaving(true)
    try {
      const created = await createGalpi(input)
      navigate(`/galpis/${created.id}`)
    } finally {
      setSaving(false)
    }
  }

  // Closing mid-request would let a second form submit again and create a duplicate galpi.
  function closeCreate() {
    if (!saving) {
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">갈피</h1>
        <button
          type="button"
          className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-white"
          onClick={() => setCreating(true)}
        >
          새 갈피
        </button>
      </header>

      {state.status === 'loading' && <p className="text-ink/60">불러오는 중…</p>}

      {state.status === 'failed' && (
        <div className="flex flex-col items-start gap-3">
          <p>갈피를 불러오지 못했어요</p>
          <button
            type="button"
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
            onClick={() => void load()}
          >
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'loaded' && <GalpiSections galpis={state.galpis} onCreate={() => setCreating(true)} />}

      {creating && (
        <Sheet label="새 갈피" onClose={closeCreate}>
          <GalpiForm submitLabel="만들기" onSubmit={handleCreate} onCancel={closeCreate} />
        </Sheet>
      )}
    </main>
  )
}

function GalpiSections({ galpis, onCreate }: { galpis: Galpi[]; onCreate: () => void }) {
  if (galpis.length === 0) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-3xl bg-paper px-6 py-12 text-center">
        <p className="font-serif text-lg">첫 갈피를 만들어 보세요</p>
        <button
          type="button"
          className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-white"
          onClick={onCreate}
        >
          갈피 만들기
        </button>
      </section>
    )
  }

  const recent = recentGalpis(galpis)

  return (
    <>
      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink/60">최근에 본 갈피</h2>
          <ul aria-label="최근에 본 갈피" className="flex flex-wrap gap-2">
            {recent.map((galpi) => (
              <li key={galpi.id}>
                <Link
                  to={`/galpis/${galpi.id}`}
                  className="block rounded-full bg-sage/25 px-4 py-2 text-sm font-semibold text-moss"
                >
                  {galpi.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink/60">모든 갈피</h2>
        <ul aria-label="모든 갈피" className="flex flex-col divide-y divide-ink/10 rounded-3xl bg-paper">
          {galpis.map((galpi) => (
            <li key={galpi.id}>
              <Link to={`/galpis/${galpi.id}`} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="truncate font-semibold">{galpi.title}</span>
                <span className="shrink-0 text-sm text-ink/50">문장 {galpi.phraseCount}개</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default HomePage
