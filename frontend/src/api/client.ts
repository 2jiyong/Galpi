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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
