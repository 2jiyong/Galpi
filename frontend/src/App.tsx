import { Link, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-start gap-4 px-4 py-6">
      <p className="font-serif text-lg">페이지를 찾을 수 없어요</p>
      <Link to="/" className="text-sm font-semibold text-moss">
        홈으로
      </Link>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Detail page arrives in the next task; until then the route shows a loading placeholder. */}
      <Route path="/galpis/:galpiId" element={<p className="p-4 text-ink/60">불러오는 중…</p>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
