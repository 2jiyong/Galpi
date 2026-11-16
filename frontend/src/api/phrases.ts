import { request } from './client'

export type Phrase = {
  id: string
  galpiId: string
  content: string
  sources: string[]
  favorite: boolean
  createdAt: string
}

/** `galpiId` is where the phrase is saved: the galpi to create it in, or to move it to on update. */
export type PhraseInput = {
  content: string
  sources: string[]
  galpiId: string
}

export function listPhrases(galpiId: string): Promise<Phrase[]> {
  return request(`/api/galpis/${galpiId}/phrases`)
}

export function createPhrase({ galpiId, content, sources }: PhraseInput): Promise<Phrase> {
  return request(`/api/galpis/${galpiId}/phrases`, {
    method: 'POST',
    body: JSON.stringify({ content, sources }),
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
