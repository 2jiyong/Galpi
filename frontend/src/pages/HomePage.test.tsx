import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Galpi } from '../api/galpis'
import { jsonResponse, mockFetch } from '../test/mockFetch'
import { recentGalpis } from '../lib/recentGalpis'
import HomePage from './HomePage'

function galpi(overrides: Partial<Galpi>): Galpi {
  return {
    id: 'g1',
    title: '공부',
    description: null,
    phraseSort: 'OLDEST',
    phraseCount: 0,
    lastViewedAt: null,
    createdAt: '2026-11-13T10:00:00Z',
    ...overrides,
  }
}

function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/galpis/:galpiId" element={<p>상세 화면</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('showsEmptyState', async () => {
    mockFetch({ 'GET /api/galpis': () => jsonResponse([]) })

    renderHome()

    expect(await screen.findByText('첫 갈피를 만들어 보세요')).toBeInTheDocument()
    expect(screen.queryByText('최근에 본 갈피')).not.toBeInTheDocument()
  })

  it('listsGalpisInServerOrderWithCounts', async () => {
    mockFetch({
      'GET /api/galpis': () =>
        jsonResponse([
          galpi({ id: 'a', title: '공부', phraseCount: 2 }),
          galpi({ id: 'b', title: '클라이밍' }),
        ]),
    })

    renderHome()

    const list = await screen.findByRole('list', { name: '모든 갈피' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/galpis/a', '/galpis/b'])
    expect(within(links[0]).getByText('공부')).toBeInTheDocument()
    expect(within(links[0]).getByText('문장 2개')).toBeInTheDocument()
  })

  it('recentGalpisShowsLatestThree', () => {
    const galpis = [
      galpi({ id: '1', lastViewedAt: '2026-11-10T00:00:00Z' }),
      galpi({ id: '2', lastViewedAt: '2026-11-13T00:00:00Z' }),
      galpi({ id: '3', lastViewedAt: null }),
      galpi({ id: '4', lastViewedAt: '2026-11-12T00:00:00Z' }),
      galpi({ id: '5', lastViewedAt: '2026-11-11T00:00:00Z' }),
    ]

    expect(recentGalpis(galpis).map((item) => item.id)).toEqual(['2', '4', '5'])
  })

  it('showsRecentSectionWhenViewed', async () => {
    mockFetch({
      'GET /api/galpis': () =>
        jsonResponse([galpi({ id: 'a', title: '클라이밍', lastViewedAt: '2026-11-13T00:00:00Z' })]),
    })

    renderHome()

    const recent = await screen.findByRole('list', { name: '최근에 본 갈피' })
    expect(within(recent).getByRole('link', { name: '클라이밍' })).toHaveAttribute('href', '/galpis/a')
  })

  it('createsGalpiAndNavigates', async () => {
    const fetchMock = mockFetch({
      'GET /api/galpis': () => jsonResponse([]),
      'POST /api/galpis': () => jsonResponse(galpi({ id: 'new', title: '운동' }), 201),
    })

    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: '새 갈피' }))
    await userEvent.type(screen.getByLabelText('제목'), '운동')
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(await screen.findByText('상세 화면')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]!.body as string)).toEqual({ title: '운동', description: '' })
  })

  it('disablesSubmitWhileSaving', async () => {
    mockFetch({
      'GET /api/galpis': () => jsonResponse([]),
      'POST /api/galpis': () => new Promise<Response>(() => {}),
    })

    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: '갈피 만들기' }))
    await userEvent.type(screen.getByLabelText('제목'), '운동')
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(screen.getByRole('button', { name: '만들기' })).toBeDisabled()
  })

  it('showsRetryOnLoadFailure', async () => {
    let calls = 0
    mockFetch({
      'GET /api/galpis': () => {
        calls += 1
        return calls === 1 ? jsonResponse({ status: 500 }, 500) : jsonResponse([])
      },
    })

    renderHome()
    expect(await screen.findByText('갈피를 불러오지 못했어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('첫 갈피를 만들어 보세요')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
