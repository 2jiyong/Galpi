import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../test/mockFetch'
import { changePhraseSort } from './galpis'
import { ApiError } from './client'
import { createPhrase, deletePhrase, listPhrases, setPhraseFavorite, updatePhrase } from './phrases'

const phrase = {
  id: 'p1',
  galpiId: 'g1',
  title: null,
  content: '발부터 보기',
  sources: ['수업'],
  favorite: false,
  createdAt: '2026-11-13T10:00:00Z',
}

function body(init: RequestInit | undefined) {
  return JSON.parse(init!.body as string)
}

describe('phrases api', () => {
  afterEach(() => vi.restoreAllMocks())

  it('listPhrasesGetsGalpiPhrases', async () => {
    mockFetch({ 'GET /api/galpis/g1/phrases': () => jsonResponse([phrase]) })

    await expect(listPhrases('g1')).resolves.toEqual([phrase])
  })

  it('createPhrasePostsToChosenGalpi', async () => {
    const fetchMock = mockFetch({ 'POST /api/galpis/g2/phrases': () => jsonResponse(phrase, 201) })

    await createPhrase({ title: '제목', content: '문장', sources: ['책'], galpiId: 'g2' })

    expect(body(fetchMock.mock.calls[0][1])).toEqual({ title: '제목', content: '문장', sources: ['책'] })
  })

  it('updatePhraseSendsGalpiId', async () => {
    const fetchMock = mockFetch({ 'PUT /api/phrases/p1': () => jsonResponse(phrase) })

    await updatePhrase('p1', { title: '', content: '문장', sources: [], galpiId: 'g2' })

    expect(body(fetchMock.mock.calls[0][1])).toEqual({ title: '', content: '문장', sources: [], galpiId: 'g2' })
  })

  it('setPhraseFavoritePutsFlag', async () => {
    const fetchMock = mockFetch({ 'PUT /api/phrases/p1/favorite': () => jsonResponse({ ...phrase, favorite: true }) })

    await expect(setPhraseFavorite('p1', true)).resolves.toMatchObject({ favorite: true })
    expect(body(fetchMock.mock.calls[0][1])).toEqual({ favorite: true })
  })

  it('deletePhraseAcceptsNoContent', async () => {
    mockFetch({ 'DELETE /api/phrases/p1': () => new Response(null, { status: 204 }) })

    await expect(deletePhrase('p1')).resolves.toBeUndefined()
  })

  it('changePhraseSortPutsSetting', async () => {
    const fetchMock = mockFetch({ 'PUT /api/galpis/g1/phrase-sort': () => jsonResponse({ id: 'g1' }) })

    await changePhraseSort('g1', 'NEWEST')

    expect(body(fetchMock.mock.calls[0][1])).toEqual({ phraseSort: 'NEWEST' })
  })

  it('reportsSourceFieldErrors', async () => {
    mockFetch({
      'POST /api/galpis/g1/phrases': () =>
        jsonResponse({ status: 400, errors: [{ field: 'sources', message: 'x' }] }, 400),
    })

    const error = await createPhrase({ title: '', content: '문장', sources: [], galpiId: 'g1' }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.fieldErrors).toEqual({ sources: 'x' })
  })
})
