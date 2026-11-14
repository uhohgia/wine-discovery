import { useId, useState } from 'react'
import { GLOSSARY } from '@/data/glossary'

/**
 * A row of tappable words. Tap one to read what it means; tap it again to close. Meanings come from the
 * glossary, so technical terms are optional and never in the way.
 */
export function TermChips({ label, ids }: { label: string; ids: readonly string[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const panelId = useId()
  const entry = open ? GLOSSARY[open] : null

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {ids.map((id) => {
          const e = GLOSSARY[id]
          if (!e) return null
          const on = open === id
          return (
            <li key={id}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={panelId}
                onClick={() => setOpen(on ? null : id)}
                className={`min-h-11 rounded-full border-2 px-4 text-base font-semibold ${on ? 'border-wine bg-wine text-white' : 'border-edge bg-card text-ink'}`}
              >
                {e.term}
              </button>
            </li>
          )
        })}
      </ul>
      <div id={panelId} aria-live="polite" className="mt-2">
        {entry && (
          <p className="rounded-2xl border-2 border-line bg-sand p-3 text-base">
            <span className="font-bold">{entry.term}: </span>
            {entry.plain}
            {entry.alsoCalled && <span className="text-muted"> Also called “{entry.alsoCalled}”.</span>}
          </p>
        )}
      </div>
    </div>
  )
}
