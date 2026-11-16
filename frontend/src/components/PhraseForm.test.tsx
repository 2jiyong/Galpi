import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { PhraseInput } from '../api/phrases'
import PhraseForm from './PhraseForm'

const galpis = [
  { id: 'g1', title: '클라이밍' },
  { id: 'g2', title: '공부' },
]

function renderForm(props: {
  initial?: PhraseInput
  withGalpis?: boolean
  onSubmit?: (input: PhraseInput) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const onSubmit = props.onSubmit ?? vi.fn(async () => {})
  render(
    <PhraseForm
      initial={props.initial ?? { title: '', content: '', sources: [], galpiId: 'g1' }}
      galpis={props.withGalpis === false ? undefined : galpis}
      submitLabel="저장"
      onSubmit={onSubmit}
      onCancel={() => {}}
      onDelete={props.onDelete}
    />,
  )
  return onSubmit
}

describe('PhraseForm', () => {
  it('submitsTrimmedInputWithoutEmptySources', async () => {
    const onSubmit = renderForm({})

    await userEvent.type(screen.getByLabelText('내용'), '  발부터 보기 ')
    await userEvent.click(screen.getByRole('button', { name: '+ 출처 추가' }))
    await userEvent.type(screen.getByLabelText('출처 1'), ' 수업 ')
    await userEvent.click(screen.getByRole('button', { name: '+ 출처 추가' }))
    await userEvent.selectOptions(screen.getByLabelText('갈피'), 'g2')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: '', content: '발부터 보기', sources: ['수업'], galpiId: 'g2' })
  })

  it('showsContentLength', async () => {
    renderForm({})

    await userEvent.type(screen.getByLabelText('내용'), '발부터')

    expect(screen.getByText('3/500')).toBeInTheDocument()
  })

  it('showsContentErrorWithoutSubmitting', async () => {
    const onSubmit = renderForm({})

    await userEvent.type(screen.getByLabelText('내용'), '   ')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('내용을 입력해 주세요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejectsOverlongSource', async () => {
    const onSubmit = renderForm({ initial: { title: '', content: '문장', sources: ['가'.repeat(201)], galpiId: 'g1' } })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('출처는 200자까지 쓸 수 있어요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('limitsSourcesToTen', async () => {
    const sources = Array.from({ length: 9 }, (_, index) => `출처${index}`)
    renderForm({ initial: { title: '', content: '문장', sources, galpiId: 'g1' } })

    const add = screen.getByRole('button', { name: '+ 출처 추가' })
    await userEvent.click(add)

    expect(screen.getAllByLabelText(/^출처 \d+$/)).toHaveLength(10)
    expect(add).toBeDisabled()
  })

  it('removesSourceRow', async () => {
    const onSubmit = renderForm({ initial: { title: '', content: '문장', sources: ['a', 'b'], galpiId: 'g1' } })

    await userEvent.click(screen.getByRole('button', { name: '출처 1 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: '', content: '문장', sources: ['b'], galpiId: 'g1' })
  })

  it('showsServerFieldError', async () => {
    renderForm({
      initial: { title: '', content: '문장', sources: [], galpiId: 'g1' },
      onSubmit: async () => {
        throw new ApiError(400, { sources: 'too many' })
      },
    })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('출처는 10개까지 넣을 수 있어요')).toBeInTheDocument()
  })

  it('disablesButtonsWhileSaving', async () => {
    renderForm({
      initial: { title: '', content: '문장', sources: [], galpiId: 'g1' },
      onSubmit: () => new Promise<void>(() => {}),
      onDelete: async () => {},
    })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
  })

  it('hidesDeleteWithoutHandler', () => {
    renderForm({})

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('sendsTrimmedTitle', async () => {
    const onSubmit = renderForm({})

    await userEvent.type(screen.getByLabelText('제목 (선택)'), ' 다리로 밀기 ')
    await userEvent.type(screen.getByLabelText('내용'), '팔보다 다리')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: '다리로 밀기', content: '팔보다 다리', sources: [], galpiId: 'g1' })
  })

  it('rejectsOverlongTitle', async () => {
    const onSubmit = renderForm({ initial: { title: '가'.repeat(51), content: '문장', sources: [], galpiId: 'g1' } })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('제목은 50자까지 쓸 수 있어요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('hidesGalpiSelectWithoutGalpis', () => {
    renderForm({ withGalpis: false })

    expect(screen.queryByLabelText('갈피')).not.toBeInTheDocument()
  })
})
