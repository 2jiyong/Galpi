import type { Phrase } from '../api/phrases'

type PhraseListProps = {
  phrases: Phrase[]
  /** Phrases whose favorite change is in flight; their star is disabled until it settles. */
  pendingIds: ReadonlySet<string>
  onToggleFavorite: (phrase: Phrase) => void
  onEdit: (phrase: Phrase) => void
}

function PhraseList({ phrases, pendingIds, onToggleFavorite, onEdit }: PhraseListProps) {
  return (
    <ul aria-label="문장 목록" className="flex flex-col divide-y divide-ink/10">
      {phrases.map((phrase) => (
        <li key={phrase.id} className="flex items-start gap-3 py-4">
          <button
            type="button"
            className={`text-xl leading-6 disabled:opacity-50 ${phrase.favorite ? 'text-amber-500' : 'text-ink/30'}`}
            aria-label="즐겨찾기"
            aria-pressed={phrase.favorite}
            disabled={pendingIds.has(phrase.id)}
            onClick={() => onToggleFavorite(phrase)}
          >
            {phrase.favorite ? '★' : '☆'}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p data-testid="phrase-content" className="font-serif text-lg leading-snug break-words whitespace-pre-line">
              {phrase.content}
            </p>
            {phrase.sources.length > 0 && (
              <p className="text-sm text-ink/55 break-words">{phrase.sources.join(' · ')}</p>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-ink/50"
            aria-label="문장 편집"
            onClick={() => onEdit(phrase)}
          >
            편집
          </button>
        </li>
      ))}
    </ul>
  )
}

export default PhraseList
