import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { jsonResponse, mockFetch } from './test/mockFetch'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the home page at the root path', async () => {
    mockFetch({ 'GET /api/galpis': () => jsonResponse([]) })

    renderAt('/')

    expect(await screen.findByText('첫 갈피를 만들어 보세요')).toBeInTheDocument()
  })

  it('shows a not found message for unknown paths', () => {
    renderAt('/nowhere')

    expect(screen.getByText('페이지를 찾을 수 없어요')).toBeInTheDocument()
  })
})
