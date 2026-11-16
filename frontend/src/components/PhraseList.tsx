import { Link } from 'react-router'
import type { Phrase } from '../api/phrases'
import { displayTitle } from '../lib/phraseTitle'

type PhraseListProps = {
  galpiId: string
  phrases: Phrase[]
  /** Phrases whose favorite change is in flight; their star is disabled until it settles. */
  pendingIds: ReadonlySet<string>
  onToggleFavorite: (phrase: Phrase) => void
}

/** One row per phrase: a favorite star and the title, which opens the phrase. */
function PhraseList({ galpiId, phrases, pendingIds, onToggleFavorite }: PhraseListProps) {
  return (
    <ul aria-label="문장 목록" className="flex flex-col divide-y divide-ink/10">
      {phrases.map((phrase) => (
        <li key={phrase.id} className="flex items-center gap-3">
          <button
            type="button"
            className={`py-3 text-xl leading-6 disabled:opacity-50 ${phrase.favorite ? 'text-amber-500' : 'text-ink/30'}`}
            aria-label="즐겨찾기"
            aria-pressed={phrase.favorite}
            disabled={pendingIds.has(phrase.id)}
            onClick={() => onToggleFavorite(phrase)}
          >
            {phrase.favorite ? '★' : '☆'}
          </button>
          <Link
            to={`/galpis/${galpiId}/phrases/${phrase.id}`}
            className="min-w-0 flex-1 truncate py-3 font-serif text-lg"
          >
            {displayTitle(phrase)}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default PhraseList
