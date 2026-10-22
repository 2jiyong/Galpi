import { useEffect, useState } from 'react'

type ConnectionState = 'checking' | 'connected' | 'disconnected'

type HealthResponse = {
  status: string
  application: string
}

const statusContent: Record<ConnectionState, { label: string; dot: string }> = {
  checking: { label: '서버 연결 확인 중', dot: 'bg-amber-400' },
  connected: { label: '서버와 연결됨', dot: 'bg-emerald-500' },
  disconnected: { label: '서버 연결 필요', dot: 'bg-rose-400' },
}

function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Health check failed')
        }

        const health = (await response.json()) as HealthResponse
        setConnection(
          health.status === 'UP' && health.application === 'galpi'
            ? 'connected'
            : 'disconnected',
        )
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setConnection('disconnected')
      }
    }

    void checkHealth()
    return () => controller.abort()
  }, [])

  const currentStatus = statusContent[connection]

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-canvas px-6 py-8 text-ink sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-sage/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-sun/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <a className="font-serif text-2xl font-semibold tracking-tight" href="/">
            갈피
          </a>
          <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-2 text-xs font-medium text-ink/70 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${currentStatus.dot}`} />
            <span>{currentStatus.label}</span>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-semibold tracking-[0.22em] text-moss uppercase">
              Find your way again
            </p>
            <h1 className="font-serif text-5xl leading-[1.12] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              흔들리는 순간,
              <br />
              다시 <span className="text-moss">갈피</span>를 잡다.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-ink/65 sm:text-lg">
              평소의 내가 남겨 둔 문장과 요령으로, 지금의 내가 다시 한 걸음
              나아갈 수 있도록. 필요한 순간 펼쳐 보는 나만의 문장 보관함입니다.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-[2rem] border border-ink/10 bg-sage/20" />
            <article className="relative rounded-[2rem] border border-ink/10 bg-paper p-8 shadow-[0_24px_80px_rgba(45,55,45,0.12)] sm:p-10">
              <div className="mb-16 flex items-center justify-between text-xs font-semibold tracking-wider text-ink/45 uppercase">
                <span>오늘의 갈피</span>
                <span>01</span>
              </div>
              <blockquote className="font-serif text-3xl leading-snug font-medium tracking-tight sm:text-4xl">
                “완벽하게 하려 하지 말고,
                <br />
                우선 10분만 시작하자.”
              </blockquote>
              <div className="mt-16 flex items-center justify-between">
                <span className="rounded-full bg-sage/20 px-3 py-1.5 text-xs font-semibold text-moss">
                  공부
                </span>
                <span className="font-serif text-sm italic text-ink/45">나에게</span>
              </div>
            </article>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-ink/10 pt-5 text-xs text-ink/45">
          <span>GALPI · 나를 위한 작은 표지</span>
          <span>Spring Boot + React</span>
        </footer>
      </div>
    </main>
  )
}

export default App
