import { request } from './client'

export type Phrase = {
  id: string
  galpiId: string
  title: string | null
  content: string
  sources: string[]
  favorite: boolean
  createdAt: string
}

/** `galpiId` is where the phrase is saved: the galpi to create it in, or to move it to on update. */
export type PhraseInput = {
  /** Optional; an empty title is stored as none and the content's first line is shown instead. */
  title: string
  content: string
  sources: string[]
  galpiId: string
}

export function listPhrases(galpiId: string): Promise<Phrase[]> {
  return request(`/api/galpis/${galpiId}/phrases`)
}

export function createPhrase({ galpiId, title, content, sources }: PhraseInput): Promise<Phrase> {
  return request(`/api/galpis/${galpiId}/phrases`, {
    method: 'POST',
    body: JSON.stringify({ title, content, sources }),
  })
}

export function updatePhrase(id: string, input: PhraseInput): Promise<Phrase> {
  return request(`/api/phrases/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deletePhrase(id: string): Promise<void> {
  return request(`/api/phrases/${id}`, { method: 'DELETE' })
}

export function setPhraseFavorite(id: string, favorite: boolean): Promise<Phrase> {
  return request(`/api/phrases/${id}/favorite`, { method: 'PUT', body: JSON.stringify({ favorite }) })
}
