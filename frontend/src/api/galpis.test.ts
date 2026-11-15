import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../test/mockFetch'
import { ApiError, createGalpi, deleteGalpi } from './galpis'

const galpi = {
  id: 'g1',
  title: '공부',
  description: null,
  phraseSort: 'OLDEST',
  phraseCount: 0,
  lastViewedAt: null,
  createdAt: '2026-11-13T10:00:00Z',
}

describe('galpis api', () => {
  afterEach(() => vi.restoreAllMocks())

  it('createGalpiPostsJson', async () => {
    const fetchMock = mockFetch({ 'POST /api/galpis': () => jsonResponse(galpi, 201) })

    await expect(createGalpi({ title: '공부', description: '' })).resolves.toEqual(galpi)

    const init = fetchMock.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({ title: '공부', description: '' })
  })

  it('throwsApiErrorWithFieldErrors', async () => {
    mockFetch({
      'POST /api/galpis': () =>
        jsonResponse({ status: 400, errors: [{ field: 'title', message: 'x' }] }, 400),
    })

    const error = await createGalpi({ title: '', description: '' }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ title: 'x' })
  })

  it('deleteGalpiAcceptsNoContent', async () => {
    mockFetch({ 'DELETE /api/galpis/g1': () => new Response(null, { status: 204 }) })

    await expect(deleteGalpi('g1')).resolves.toBeUndefined()
  })
})
