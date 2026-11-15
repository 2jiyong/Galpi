import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Galpi } from '../api/galpis'
import { jsonResponse, mockFetch, type FetchHandler } from '../test/mockFetch'
import GalpiDetailPage from './GalpiDetailPage'

const base: Galpi = {
  id: 'g1',
  title: '클라이밍',
  description: '운동 전에 보기',
  phraseSort: 'OLDEST',
  phraseCount: 3,
  lastViewedAt: null,
  createdAt: '2026-11-13T10:00:00Z',
}

const noContent = () => new Response(null, { status: 204 })

function renderDetail(handlers: Record<string, FetchHandler>) {
  const fetchMock = mockFetch({ 'POST /api/galpis/g1/views': noContent, ...handlers })
  render(
    <MemoryRouter initialEntries={['/galpis/g1']}>
      <Routes>
        <Route path="/" element={<p>홈 화면</p>} />
        <Route path="/galpis/:galpiId" element={<GalpiDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return fetchMock
}

function calls(fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) {
  return fetchMock.mock.calls.filter(([input, init]) => input === url && (init?.method ?? 'GET') === method)
}

describe('GalpiDetailPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('showsGalpiAndMarksViewed', async () => {
    const fetchMock = renderDetail({ 'GET /api/galpis/g1': () => jsonResponse(base) })

    expect(await screen.findByRole('heading', { name: '클라이밍' })).toBeInTheDocument()
    expect(screen.getByText('운동 전에 보기')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '‹ 갈피 목록' })).toHaveAttribute('href', '/')
    expect(calls(fetchMock, 'POST', '/api/galpis/g1/views').length).toBeGreaterThan(0)
  })

  it('stillShowsGalpiWhenMarkingViewedFails', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'POST /api/galpis/g1/views': () => jsonResponse({ status: 500 }, 500),
    })

    expect(await screen.findByRole('heading', { name: '클라이밍' })).toBeInTheDocument()
  })

  it('disablesFocusWhenNoPhrases', async () => {
    renderDetail({ 'GET /api/galpis/g1': () => jsonResponse({ ...base, phraseCount: 0 }) })

    expect(await screen.findByRole('button', { name: '집중해서 보기' })).toBeDisabled()
    expect(screen.getByText('문장을 먼저 추가해 보세요')).toBeInTheDocument()
  })

  it('editsGalpi', async () => {
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'PUT /api/galpis/g1': () => jsonResponse({ ...base, title: '볼더링' }),
    })

    await userEvent.click(await screen.findByRole('button', { name: '편집' }))
    const title = screen.getByLabelText('제목')
    expect(title).toHaveValue('클라이밍')
    expect(screen.getByLabelText('설명 (선택)')).toHaveValue('운동 전에 보기')
    await userEvent.clear(title)
    await userEvent.type(title, '볼더링')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('heading', { name: '볼더링' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [, init] = calls(fetchMock, 'PUT', '/api/galpis/g1')[0]
    expect(JSON.parse(init!.body as string)).toEqual({ title: '볼더링', description: '운동 전에 보기' })
  })

  it('deletesAfterConfirmAndGoesHome', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'DELETE /api/galpis/g1': noContent,
    })

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('문장 3개도 함께 삭제됩니다. 이 갈피를 삭제할까요?')
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/api/galpis/g1')).toHaveLength(1)
  })

  it('asksPlainConfirmWhenNoPhrases', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderDetail({ 'GET /api/galpis/g1': () => jsonResponse({ ...base, phraseCount: 0 }) })

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('이 갈피를 삭제할까요?')
  })

  it('keepsGalpiWhenDeleteCancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderDetail({ 'GET /api/galpis/g1': () => jsonResponse(base) })

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(calls(fetchMock, 'DELETE', '/api/galpis/g1')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: '클라이밍' })).toBeInTheDocument()
  })

  it('showsNotFound', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse({ status: 404 }, 404),
      'POST /api/galpis/g1/views': () => jsonResponse({ status: 404 }, 404),
    })

    expect(await screen.findByText('갈피를 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/')
  })
})
