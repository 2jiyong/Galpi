import type { GalpiInput } from '../api/galpis'

export type Field = 'title' | 'description'
export type FieldErrors = Partial<Record<Field, string>>

const TITLE_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 200

export function validateGalpiInput(input: GalpiInput): FieldErrors {
  const errors: FieldErrors = {}
  const title = input.title.trim()
  if (title.length === 0) {
    errors.title = '제목을 입력해 주세요'
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = '제목은 50자까지 쓸 수 있어요'
  }
  if (input.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = '설명은 200자까지 쓸 수 있어요'
  }
  return errors
}
