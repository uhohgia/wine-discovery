import { useId } from 'react'

/**
 * A three-stop scale with an everyday analogy at each end (skim, 2%, whole milk). `value` runs from 0 to 2
 * and can fall between stops; null means "no preference yet". The nearest stop is also spelled out in
 * words for screen readers, so nothing depends on seeing the marker.
 */
export function ScaleMeter({
  title,
  stops,
  value,
  emptyText = 'No preference yet',
  help,
}: {
  title: string
  stops: readonly [string, string, string]
  value: number | null
  emptyText?: string
  /** An optional plain-language explanation, one tap away. */
  help?: string
}) {
  const id = useId()
  const nearest = value === null ? null : Math.round(Math.min(2, Math.max(0, value)))
  return (
    <div role="group" aria-labelledby={id} className="@container py-2">
      <p id={id} className="font-semibold">
        {title}
        <span className="sr-only">
          {nearest === null ? `: ${emptyText}` : `: closest to ${stops[nearest]}`}
        </span>
      </p>
      <div className="relative mt-3 mb-1 h-3" aria-hidden="true">
        <div className="absolute inset-x-1.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-edge" style={{ left: `calc(${i * 50}% - ${i * 12}px)` }} />
        ))}
        {value !== null && (
          <span
            className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-wine shadow"
            style={{ left: `calc(6px + (100% - 12px) * ${Math.min(2, Math.max(0, value)) / 2})` }}
          />
        )}
      </div>
      {/* Measured in text-size units: when text is scaled up and three labels no longer fit side by side, they stack. */}
      <div className="mt-2 flex items-start justify-between gap-2 text-sm @max-[16rem]:flex-col @max-[16rem]:gap-0.5" aria-hidden="true">
        {stops.map((s, i) => (
          <span key={s} className={`flex-1 ${i === 1 ? 'text-center' : i === 2 ? 'text-right' : 'text-left'} @max-[16rem]:text-left ${nearest === i ? 'font-bold text-ink' : 'text-muted'}`}>
            {s}
          </span>
        ))}
      </div>
      {value === null && <p className="mt-1 text-sm text-muted">{emptyText}</p>}
      {help && (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-wine underline">What’s this?</summary>
          <p className="pb-2 text-sm text-muted">{help}</p>
        </details>
      )}
    </div>
  )
}
