export type PhraseSort = 'OLDEST' | 'NEWEST'

export type Galpi = {
  id: string
  title: string
  description: string | null
  phraseSort: PhraseSort
  phraseCount: number
  lastViewedAt: string | null
  createdAt: string
}

export type GalpiInput = {
  title: string
  description: string
}

/** Non-2xx API response. `fieldErrors` maps a request field name to the server's message for it. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, fieldErrors: Record<string, string> = {}) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type ProblemBody = {
  errors?: { field: string; message: string }[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  })
  if (!response.ok) {
    throw new ApiError(response.status, await readFieldErrors(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

async function readFieldErrors(response: Response): Promise<Record<string, string>> {
  try {
    const body = (await response.json()) as ProblemBody
    return Object.fromEntries((body.errors ?? []).map((error) => [error.field, error.message]))
  } catch {
    return {}
  }
}

export function listGalpis(): Promise<Galpi[]> {
  return request('/api/galpis')
}

export function getGalpi(id: string): Promise<Galpi> {
  return request(`/api/galpis/${id}`)
}

export function createGalpi(input: GalpiInput): Promise<Galpi> {
  return request('/api/galpis', { method: 'POST', body: JSON.stringify(input) })
}

export function updateGalpi(id: string, input: GalpiInput): Promise<Galpi> {
  return request(`/api/galpis/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteGalpi(id: string): Promise<void> {
  return request(`/api/galpis/${id}`, { method: 'DELETE' })
}

export function markGalpiViewed(id: string): Promise<void> {
  return request(`/api/galpis/${id}/views`, { method: 'POST' })
}
