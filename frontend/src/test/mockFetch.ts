import { vi } from 'vitest'

export type FetchHandler = (init?: RequestInit) => Response | Promise<Response>

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Replaces fetch with handlers keyed by "METHOD /path". Unknown requests fail the test loudly.
 */
export function mockFetch(handlers: Record<string, FetchHandler>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    const handler = handlers[`${method} ${url}`]
    if (!handler) {
      throw new Error(`Unexpected request: ${method} ${url}`)
    }
    return handler(init)
  })
}
