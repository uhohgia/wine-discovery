import { Link } from 'react-router-dom'

/**
 * A big, friendly choice: an emoji for charm (hidden from screen readers), a title and a short hint.
 * `layout="inline"` puts the emoji beside the title (the meal tiles); "stacked" puts it above (the occasion tiles).
 * Inline falls back to stacked on its own when a tile is too narrow, so large text never forces a sideways scroll.
 */
export function Tile({ to, title, hint, emoji, layout = 'stacked' }: { to: string; title: string; hint?: string; emoji?: string; layout?: 'stacked' | 'inline' }) {
  const inline = layout === 'inline'
  const emojiEl = emoji && (
    <span aria-hidden="true" className="text-3xl leading-none">
      {emoji}
    </span>
  )
  const titleEl = <span className={`text-lg leading-snug font-bold ${inline ? 'min-w-0 pt-1' : 'mt-1'}`}>{title}</span>
  return (
    <Link
      to={to}
      className="flex min-h-24 flex-col justify-center rounded-2xl border-2 border-edge bg-card p-4 active:bg-sand hover:border-wine"
    >
      {inline ? (
        <span className="flex flex-wrap items-start gap-x-2">
          {emojiEl}
          {titleEl}
        </span>
      ) : (
        <>
          {emojiEl}
          {titleEl}
        </>
      )}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </Link>
  )
}

/** Tiles flow into as many columns as fit, measured in text-size units, so large text simply stacks them. */
export function TileGrid({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
      {children}
    </ul>
  )
}
