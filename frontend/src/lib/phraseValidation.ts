import type { PhraseInput } from '../api/phrases'

export type PhraseField = 'content' | 'sources'
export type PhraseFieldErrors = Partial<Record<PhraseField, string>>

export const CONTENT_MAX_LENGTH = 500
export const SOURCE_MAX_LENGTH = 200
export const MAX_SOURCES = 10

/** Trims content and sources and drops empty source rows, the shape sent to the server. */
export function normalizePhraseInput(input: PhraseInput): PhraseInput {
  return {
    content: input.content.trim(),
    sources: input.sources.map((source) => source.trim()).filter((source) => source.length > 0),
    galpiId: input.galpiId,
  }
}

export function validatePhraseInput(input: PhraseInput): PhraseFieldErrors {
  const errors: PhraseFieldErrors = {}
  if (input.content.length === 0) {
    errors.content = '내용을 입력해 주세요'
  } else if (input.content.length > CONTENT_MAX_LENGTH) {
    errors.content = '내용은 500자까지 쓸 수 있어요'
  }
  if (input.sources.some((source) => source.length > SOURCE_MAX_LENGTH)) {
    errors.sources = '출처는 200자까지 쓸 수 있어요'
  } else if (new Set(input.sources).size > MAX_SOURCES) {
    errors.sources = '출처는 10개까지 넣을 수 있어요'
  }
  return errors
}
