import type { Phrase } from '../api/phrases'

const AUTO_TITLE_MAX_LENGTH = 30

/** The title people see: the phrase's own title, or the first line of its content cut to 30 characters. */
export function displayTitle(phrase: Pick<Phrase, 'title' | 'content'>): string {
  if (phrase.title) {
    return phrase.title
  }
  const firstLine = phrase.content.trim().split('\n')[0].trim()
  return firstLine.length > AUTO_TITLE_MAX_LENGTH ? `${firstLine.slice(0, AUTO_TITLE_MAX_LENGTH)}…` : firstLine
}
