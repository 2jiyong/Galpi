import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the Galpi introduction and a connected server state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'UP', application: 'galpi' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /흔들리는 순간/ }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('서버와 연결됨')).toBeInTheDocument()
    })
  })

  it('shows a disconnected state when the health request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('서버 연결 필요')).toBeInTheDocument()
    })
  })
})
