import type { ReactNode } from 'react'

type SheetProps = {
  label: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet over the current page. Not a native <dialog>, which jsdom does not fully support. */
function Sheet({ label, onClose, children }: SheetProps) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/30 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-md rounded-t-3xl bg-paper p-6 shadow-xl sm:rounded-3xl"
      >
        <h2 className="mb-5 font-serif text-xl font-semibold">{label}</h2>
        {children}
      </div>
    </div>
  )
}

export default Sheet
