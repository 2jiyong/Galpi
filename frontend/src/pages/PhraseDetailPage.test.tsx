import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Galpi } from '../api/galpis'
import type { Phrase } from '../api/phrases'
import { jsonResponse, mockFetch, type FetchHandler } from '../test/mockFetch'
import PhraseDetailPage from './PhraseDetailPage'

const galpi: Galpi = {
  id: 'g1',
  title: '클라이밍',
  description: null,
  phraseSort: 'OLDEST',
  phraseCount: 3,
  lastViewedAt: null,
  createdAt: '2026-11-13T10:00:00Z',
}

function phrase(overrides: Partial<Phrase>): Phrase {
  return {
    id: 'p1',
    galpiId: 'g1',
    title: null,
    content: '문장',
    sources: [],
    favorite: false,
    createdAt: '2026-11-13T10:00:00Z',
    ...overrides,
  }
}

const phrases = [
  phrase({ id: 'a', title: '다리로 밀기', content: '팔보다 다리로 밀어 올리기', sources: ['코치님', '영상'] }),
  phrase({ id: 'b', content: '발부터 보기' }),
  phrase({ id: 'c', content: '쉬면서 하기' }),
]

const noContent = () => new Response(null, { status: 204 })

function Location() {
  const navigate = useNavigate()
  return (
    <>
      <p data-testid="location">{useLocation().pathname}</p>
      <button type="button" onClick={() => navigate(-1)}>
        브라우저 뒤로
      </button>
    </>
  )
}

function renderDetail(phraseId: string, handlers: Record<string, FetchHandler> = {}) {
  const fetchMock = mockFetch({
    'GET /api/galpis/g1': () => jsonResponse(galpi),
    'GET /api/galpis/g1/phrases': () => jsonResponse(phrases),
    'POST /api/galpis/g1/views': noContent,
    ...handlers,
  })
  render(
    <MemoryRouter initialEntries={['/galpis/g1', `/galpis/g1/phrases/${phraseId}`]} initialIndex={1}>
      <Routes>
        <Route path="/galpis/:galpiId" element={<p>갈피 화면</p>} />
        <Route path="/galpis/:galpiId/phrases/:phraseId" element={<PhraseDetailPage />} />
      </Routes>
      <Location />
    </MemoryRouter>,
  )
  return fetchMock
}

function calls(fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) {
  return fetchMock.mock.calls.filter(([input, init]) => input === url && (init?.method ?? 'GET') === method)
}

function location() {
  return screen.getByTestId('location').textContent
}

describe('PhraseDetailPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('showsPhraseWithPosition', async () => {
    const fetchMock = renderDetail('a')

    expect(await screen.findByRole('heading', { name: '다리로 밀기' })).toBeInTheDocument()
    expect(screen.getByText('팔보다 다리로 밀어 올리기')).toBeInTheDocument()
    expect(screen.getByText('— 코치님 · 영상')).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '‹ 클라이밍' })).toHaveAttribute('href', '/galpis/g1')
    expect(calls(fetchMock, 'POST', '/api/galpis/g1/views')).toHaveLength(1)
  })

  it('showsAutoTitleWhenTitleMissing', async () => {
    renderDetail('b')

    expect(await screen.findByRole('heading', { name: '발부터 보기' })).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('nextAndPreviousMoveWithinList', async () => {
    const fetchMock = renderDetail('a')

    await userEvent.click(await screen.findByRole('button', { name: '다음 문장' }))
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(location()).toBe('/galpis/g1/phrases/b')
    await userEvent.click(screen.getByRole('button', { name: '이전 문장' }))
    expect(screen.getByRole('heading', { name: '다리로 밀기' })).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/galpis/g1/phrases')).toHaveLength(1)
  })

  it('swipeMovesBetweenPhrases', async () => {
    renderDetail('b')
    const article = await screen.findByRole('article')

    fireEvent.touchStart(article, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(article, { changedTouches: [{ clientX: 200, clientY: 110 }] })
    expect(screen.getByText('3/3')).toBeInTheDocument()

    fireEvent.touchStart(article, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(article, { changedTouches: [{ clientX: 220, clientY: 100 }] })
    expect(screen.getByText('2/3')).toBeInTheDocument()

    fireEvent.touchStart(article, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(article, { changedTouches: [{ clientX: 130, clientY: 100 }] })
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('stopsAtEnds', async () => {
    renderDetail('a')

    expect(await screen.findByRole('button', { name: '이전 문장' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '다음 문장' }))
    await userEvent.click(screen.getByRole('button', { name: '다음 문장' }))
    expect(screen.getByText('3/3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음 문장' })).toBeDisabled()
  })

  it('favoriteKeepsPosition', async () => {
    renderDetail('b', {
      'PUT /api/phrases/b/favorite': () => jsonResponse(phrase({ id: 'b', content: '발부터 보기', favorite: true })),
    })

    await userEvent.click(await screen.findByRole('button', { name: '즐겨찾기' }))

    expect(screen.getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2/3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다음 문장' }))
    expect(screen.getByRole('heading', { name: '쉬면서 하기' })).toBeInTheDocument()
  })

  it('editSavesAndStays', async () => {
    const fetchMock = renderDetail('b', {
      'GET /api/galpis': () => jsonResponse([galpi]),
      'PUT /api/phrases/b': () => jsonResponse(phrase({ id: 'b', title: '새 제목', content: '발부터 보기' })),
      'GET /api/galpis/g1/phrases': (() => {
        let count = 0
        return () =>
          jsonResponse(
            count++ === 0 ? phrases : [phrases[0], phrase({ id: 'b', title: '새 제목', content: '발부터 보기' }), phrases[2]],
          )
      })(),
    })

    await userEvent.click(await screen.findByRole('button', { name: '편집' }))
    const dialog = screen.getByRole('dialog', { name: '문장 편집' })
    expect(within(dialog).getByLabelText('내용')).toHaveValue('발부터 보기')
    await userEvent.type(within(dialog).getByLabelText('제목 (선택)'), '새 제목')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('heading', { name: '새 제목' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(location()).toBe('/galpis/g1/phrases/b')
    expect(JSON.parse(calls(fetchMock, 'PUT', '/api/phrases/b')[0][1]!.body as string)).toEqual({
      title: '새 제목',
      content: '발부터 보기',
      sources: [],
      galpiId: 'g1',
    })
  })

  it('movingGoesBackToGalpi', async () => {
    renderDetail('b', {
      'GET /api/galpis': () => jsonResponse([galpi, { ...galpi, id: 'g2', title: '공부' }]),
      'PUT /api/phrases/b': () => jsonResponse(phrase({ id: 'b', galpiId: 'g2', content: '발부터 보기' })),
    })

    await userEvent.click(await screen.findByRole('button', { name: '편집' }))
    const dialog = screen.getByRole('dialog', { name: '문장 편집' })
    await within(dialog).findByRole('option', { name: '공부' })
    await userEvent.selectOptions(within(dialog).getByLabelText('갈피'), 'g2')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByText('갈피 화면')).toBeInTheDocument()
    expect(location()).toBe('/galpis/g1')
  })

  it('deleteGoesBackToGalpi', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = renderDetail('b', { 'DELETE /api/phrases/b': noContent })

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('이 문장을 삭제할까요?')
    expect(await screen.findByText('갈피 화면')).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/api/phrases/b')).toHaveLength(1)
  })

  it('keepsPhraseWhenDeleteCancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderDetail('b')

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(calls(fetchMock, 'DELETE', '/api/phrases/b')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: '발부터 보기' })).toBeInTheDocument()
  })

  it('showsNotFoundForUnknownPhrase', async () => {
    renderDetail('zzz')

    expect(await screen.findByText('문장을 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '갈피로 돌아가기' })).toHaveAttribute('href', '/galpis/g1')
  })

  it('editAfterFavoriteKeepsPositionAndOrder', async () => {
    const fetchMock = renderDetail('c', {
      'GET /api/galpis': () => jsonResponse([galpi]),
      'PUT /api/phrases/c/favorite': () => jsonResponse(phrase({ id: 'c', content: '쉬면서 하기', favorite: true })),
      'PUT /api/phrases/c': () =>
        jsonResponse(phrase({ id: 'c', title: '휴식', content: '쉬면서 하기', favorite: true })),
      'GET /api/galpis/g1/phrases': (() => {
        let count = 0
        return () =>
          jsonResponse(
            count++ === 0 ? phrases : [phrase({ id: 'c', title: '휴식', content: '쉬면서 하기', favorite: true }), phrases[0], phrases[1]],
          )
      })(),
    })

    await userEvent.click(await screen.findByRole('button', { name: '즐겨찾기' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))
    const dialog = screen.getByRole('dialog', { name: '문장 편집' })
    await userEvent.type(within(dialog).getByLabelText('제목 (선택)'), '휴식')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('heading', { name: '휴식' })).toBeInTheDocument()
    expect(screen.getByText('3/3')).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/galpis/g1/phrases')).toHaveLength(1)
  })

  it('backAfterDeleteDoesNotReturnToDeletedPhrase', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderDetail('b', { 'DELETE /api/phrases/b': noContent })

    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(await screen.findByText('갈피 화면')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '브라우저 뒤로' }))

    expect(location()).not.toBe('/galpis/g1/phrases/b')
  })

  it('backAfterMoveDoesNotReturnToMovedPhrase', async () => {
    renderDetail('b', {
      'GET /api/galpis': () => jsonResponse([galpi, { ...galpi, id: 'g2', title: '공부' }]),
      'PUT /api/phrases/b': () => jsonResponse(phrase({ id: 'b', galpiId: 'g2', content: '발부터 보기' })),
    })

    await userEvent.click(await screen.findByRole('button', { name: '편집' }))
    const dialog = screen.getByRole('dialog', { name: '문장 편집' })
    await within(dialog).findByRole('option', { name: '공부' })
    await userEvent.selectOptions(within(dialog).getByLabelText('갈피'), 'g2')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByText('갈피 화면')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '브라우저 뒤로' }))

    expect(location()).not.toBe('/galpis/g1/phrases/b')
  })
})
