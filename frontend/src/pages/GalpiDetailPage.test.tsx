import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Galpi } from '../api/galpis'
import type { Phrase } from '../api/phrases'
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
  const fetchMock = mockFetch({
    'POST /api/galpis/g1/views': noContent,
    'GET /api/galpis/g1/phrases': () => jsonResponse([]),
    ...handlers,
  })
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

/** Answers each call with the next response; the last one repeats. */
function sequence(...responses: (() => Response)[]): FetchHandler {
  let index = 0
  return () => responses[Math.min(index++, responses.length - 1)]()
}

async function phraseItems() {
  const list = await screen.findByRole('list', { name: '문장 목록' })
  return within(list).getAllByRole('listitem')
}

async function contents() {
  return (await phraseItems()).map((item) => within(item).getByTestId('phrase-content').textContent)
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

  it('listsPhrasesInServerOrder', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse({ ...base, phraseCount: 2 }),
      'GET /api/galpis/g1/phrases': () =>
        jsonResponse([
          phrase({ id: 'p2', content: '다리로 밀기', favorite: true, sources: ['수업', '영상'] }),
          phrase({ id: 'p1', content: '발부터 보기' }),
        ]),
    })

    expect(await contents()).toEqual(['다리로 밀기', '발부터 보기'])
    const [first, second] = await phraseItems()
    expect(within(first).getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(second).getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(first).getByText('수업 · 영상')).toBeInTheDocument()
    expect(screen.getByText('문장 2개')).toBeInTheDocument()
  })

  it('favoriteToggleKeepsOrder', async () => {
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': () =>
        jsonResponse([phrase({ id: 'a', content: '가', favorite: true }), phrase({ id: 'b', content: '나' })]),
      'PUT /api/phrases/a/favorite': () => jsonResponse(phrase({ id: 'a', content: '가', favorite: false })),
    })

    const [first] = await phraseItems()
    await userEvent.click(within(first).getByRole('button', { name: '즐겨찾기' }))

    expect(within(first).getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'false')
    expect(await contents()).toEqual(['가', '나'])
    expect(JSON.parse(calls(fetchMock, 'PUT', '/api/phrases/a/favorite')[0][1]!.body as string)).toEqual({
      favorite: false,
    })
    expect(calls(fetchMock, 'GET', '/api/galpis/g1/phrases')).toHaveLength(1)
  })

  it('showsErrorWhenFavoriteFails', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': () => jsonResponse([phrase({ id: 'a', content: '가' })]),
      'PUT /api/phrases/a/favorite': () => jsonResponse({ status: 500 }, 500),
    })

    const [first] = await phraseItems()
    await userEvent.click(within(first).getByRole('button', { name: '즐겨찾기' }))

    expect(await screen.findByText('잠시 후 다시 시도해 주세요')).toBeInTheDocument()
    expect(within(first).getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('changingSortSavesAndReloads', async () => {
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': sequence(
        () => jsonResponse([phrase({ id: 'a', content: '오래된' }), phrase({ id: 'b', content: '최신' })]),
        () => jsonResponse([phrase({ id: 'b', content: '최신' }), phrase({ id: 'a', content: '오래된' })]),
      ),
      'PUT /api/galpis/g1/phrase-sort': () => jsonResponse({ ...base, phraseSort: 'NEWEST' }),
    })

    expect(await contents()).toEqual(['오래된', '최신'])
    await userEvent.selectOptions(screen.getByLabelText('정렬'), 'NEWEST')

    await vi.waitFor(async () => expect(await contents()).toEqual(['최신', '오래된']))
    expect(screen.getByLabelText('정렬')).toHaveValue('NEWEST')
    expect(JSON.parse(calls(fetchMock, 'PUT', '/api/galpis/g1/phrase-sort')[0][1]!.body as string)).toEqual({
      phraseSort: 'NEWEST',
    })
  })

  it('addsPhraseAndReloads', async () => {
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': sequence(
        () => jsonResponse({ ...base, phraseCount: 0 }),
        () => jsonResponse({ ...base, phraseCount: 1 }),
      ),
      'GET /api/galpis/g1/phrases': sequence(
        () => jsonResponse([]),
        () => jsonResponse([phrase({ id: 'new', content: '새 문장' })]),
      ),
      'GET /api/galpis': () => jsonResponse([base, { ...base, id: 'g2', title: '공부' }]),
      'POST /api/galpis/g1/phrases': () => jsonResponse(phrase({ id: 'new', content: '새 문장' }), 201),
    })

    expect(await screen.findByText('아직 문장이 없어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ 문장 추가' }))
    const dialog = screen.getByRole('dialog', { name: '문장 추가' })
    await userEvent.type(within(dialog).getByLabelText('내용'), '새 문장')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await contents()).toEqual(['새 문장'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '집중해서 보기' })).toBeEnabled()
    expect(JSON.parse(calls(fetchMock, 'POST', '/api/galpis/g1/phrases')[0][1]!.body as string)).toEqual({
      title: '',
      content: '새 문장',
      sources: [],
    })
  })

  it('movingPhraseRemovesItFromList', async () => {
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': sequence(
        () => jsonResponse({ ...base, phraseCount: 1 }),
        () => jsonResponse({ ...base, phraseCount: 0 }),
      ),
      'GET /api/galpis/g1/phrases': sequence(
        () => jsonResponse([phrase({ id: 'p1', content: '옮길 문장', sources: ['책'] })]),
        () => jsonResponse([]),
      ),
      'GET /api/galpis': () => jsonResponse([base, { ...base, id: 'g2', title: '공부' }]),
      'PUT /api/phrases/p1': () => jsonResponse(phrase({ id: 'p1', galpiId: 'g2', content: '옮길 문장' })),
    })

    const [item] = await phraseItems()
    await userEvent.click(within(item).getByRole('button', { name: '문장 편집' }))
    const dialog = screen.getByRole('dialog', { name: '문장 편집' })
    expect(within(dialog).getByLabelText('내용')).toHaveValue('옮길 문장')
    expect(within(dialog).getByLabelText('출처 1')).toHaveValue('책')
    await within(dialog).findByRole('option', { name: '공부' })
    await userEvent.selectOptions(within(dialog).getByLabelText('갈피'), 'g2')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByText('아직 문장이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '집중해서 보기' })).toBeDisabled()
    expect(JSON.parse(calls(fetchMock, 'PUT', '/api/phrases/p1')[0][1]!.body as string)).toEqual({
      title: '',
      content: '옮길 문장',
      sources: ['책'],
      galpiId: 'g2',
    })
  })

  it('deletesPhraseAfterConfirm', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': sequence(
        () => jsonResponse([phrase({ id: 'p1', content: '지울 문장' })]),
        () => jsonResponse([]),
      ),
      'GET /api/galpis': () => jsonResponse([base]),
      'DELETE /api/phrases/p1': noContent,
    })

    const [item] = await phraseItems()
    await userEvent.click(within(item).getByRole('button', { name: '문장 편집' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('이 문장을 삭제할까요?')
    expect(await screen.findByText('아직 문장이 없어요')).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/api/phrases/p1')).toHaveLength(1)
  })

  it('keepsPhraseWhenDeleteCancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': () => jsonResponse([phrase({ id: 'p1' })]),
      'GET /api/galpis': () => jsonResponse([base]),
    })

    const [item] = await phraseItems()
    await userEvent.click(within(item).getByRole('button', { name: '문장 편집' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    expect(calls(fetchMock, 'DELETE', '/api/phrases/p1')).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: '문장 편집' })).toBeInTheDocument()
  })

  it('keepsPhraseSheetOpenWhileSaving', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis': () => jsonResponse([base]),
      'POST /api/galpis/g1/phrases': () => new Promise<Response>(() => {}),
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ 문장 추가' }))
    const dialog = screen.getByRole('dialog', { name: '문장 추가' })
    await userEvent.type(within(dialog).getByLabelText('내용'), '문장')
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }))
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.getByRole('dialog', { name: '문장 추가' })).toBeInTheDocument()
  })

  it('offersCurrentGalpiWhenGalpiListFails', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis': () => jsonResponse({ status: 500 }, 500),
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ 문장 추가' }))

    const select = within(screen.getByRole('dialog')).getByLabelText('갈피')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['클라이밍'])
  })

  it('showsRetryWhenPhrasesFail', async () => {
    renderDetail({
      'GET /api/galpis/g1': () => jsonResponse(base),
      'GET /api/galpis/g1/phrases': sequence(
        () => jsonResponse({ status: 500 }, 500),
        () => jsonResponse([phrase({ content: '다시 불러온 문장' })]),
      ),
    })

    expect(await screen.findByText('문장을 불러오지 못했어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await contents()).toEqual(['다시 불러온 문장'])
  })
})
