import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/galpis'
import GalpiForm from './GalpiForm'

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<GalpiForm submitLabel="만들기" onSubmit={onSubmit} onCancel={vi.fn()} />)
  return onSubmit
}

describe('GalpiForm', () => {
  it('requiresTitle', async () => {
    const onSubmit = renderForm()

    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(screen.getByText('제목을 입력해 주세요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validatesTrimmedLength', async () => {
    const onSubmit = renderForm()
    const title = screen.getByLabelText('제목')

    await userEvent.type(title, '가'.repeat(51))
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))
    expect(screen.getByText('제목은 50자까지 쓸 수 있어요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.clear(title)
    await userEvent.type(title, `  ${'가'.repeat(50)}  `)
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: `  ${'가'.repeat(50)}  `, description: '' })
  })

  it('rejectsOverlongDescription', async () => {
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText('제목'), '공부')
    await userEvent.type(screen.getByLabelText('설명 (선택)'), '나'.repeat(201))
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(screen.getByText('설명은 200자까지 쓸 수 있어요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('showsServerFieldError', async () => {
    renderForm(
      vi.fn().mockRejectedValue(
        new ApiError(400, { title: 'title must contain 1 to 50 characters' }),
      ),
    )

    await userEvent.type(screen.getByLabelText('제목'), '공부')
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(await screen.findByText('제목은 1~50자로 입력해 주세요')).toBeInTheDocument()
    expect(screen.queryByText(/must contain/)).not.toBeInTheDocument()
  })

  it('showsGenericErrorWhenRequestFails', async () => {
    renderForm(vi.fn().mockRejectedValue(new Error('offline')))

    await userEvent.type(screen.getByLabelText('제목'), '공부')
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(await screen.findByText('잠시 후 다시 시도해 주세요')).toBeInTheDocument()
  })
})
