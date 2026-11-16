import { request } from './client'

export type PhraseSort = 'OLDEST' | 'NEWEST'

export type Galpi = {
  id: string
  title: string
  description: string | null
  phraseSort: PhraseSort
  phraseCount: number
  lastViewedAt: string | null
  createdAt: string
}

export type GalpiInput = {
  title: string
  description: string
}

export { ApiError } from './client'

export function listGalpis(): Promise<Galpi[]> {
  return request('/api/galpis')
}

export function getGalpi(id: string): Promise<Galpi> {
  return request(`/api/galpis/${id}`)
}

export function createGalpi(input: GalpiInput): Promise<Galpi> {
  return request('/api/galpis', { method: 'POST', body: JSON.stringify(input) })
}

export function updateGalpi(id: string, input: GalpiInput): Promise<Galpi> {
  return request(`/api/galpis/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteGalpi(id: string): Promise<void> {
  return request(`/api/galpis/${id}`, { method: 'DELETE' })
}

export function markGalpiViewed(id: string): Promise<void> {
  return request(`/api/galpis/${id}/views`, { method: 'POST' })
}

export function changePhraseSort(id: string, phraseSort: PhraseSort): Promise<Galpi> {
  return request(`/api/galpis/${id}/phrase-sort`, { method: 'PUT', body: JSON.stringify({ phraseSort }) })
}
