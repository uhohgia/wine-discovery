import { Link } from 'react-router-dom'

/** A big, friendly choice: an emoji for charm (hidden from screen readers), a title and a short hint. */
export function Tile({ to, title, hint, emoji }: { to: string; title: string; hint?: string; emoji?: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-24 flex-col justify-center rounded-2xl border-2 border-edge bg-card p-4 active:bg-sand hover:border-wine"
    >
      {emoji && (
        <span aria-hidden="true" className="text-3xl leading-none">
          {emoji}
        </span>
      )}
      <span className="mt-1 text-lg leading-snug font-bold">{title}</span>
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
