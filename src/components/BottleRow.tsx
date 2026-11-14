import { Link } from 'react-router-dom'
import type { Bottle } from '@/data/bottles'
import { TYPE_WORDS } from '@/data/whyPhrases'
import { BottlePhoto } from './BottlePhoto'
import { PriceFeel } from './PriceFeel'

/** A bottle in a list: name, maker, type and price feel. The whole name is the link to its wine card. */
/** `level` is the heading level of the bottle's name, so headings never skip a level on the page it sits in. */
export function BottleRow({ bottle, notes = [], level = 2 }: { bottle: Bottle; notes?: string[]; level?: 2 | 3 }) {
  const Heading = `h${level}` as const
  return (
    <div className="flex items-start gap-3">
      <BottlePhoto bottle={bottle} size="thumb" />
      <div className="min-w-0 flex-1">
        <Heading className="text-lg leading-snug">
          <Link
            to={`/bottle/${bottle.id}`}
            className="inline-flex min-h-11 max-w-full items-center font-display font-semibold text-wine underline decoration-1 underline-offset-2 [overflow-wrap:anywhere]"
          >
            {bottle.name}
          </Link>
        </Heading>
        <p className="text-muted [overflow-wrap:anywhere]">
          {bottle.producer}
          {bottle.vintage ? ` · ${bottle.vintage}` : ''}
        </p>
        <p className="mt-1 text-sm">
          <span className="capitalize">{TYPE_WORDS[bottle.type]}</span> · <PriceFeel price={bottle.price} />
          {notes.map((n) => (
            <span key={n} className="mr-1 ml-2 inline-block rounded-full bg-sand px-2 py-0.5 font-semibold">
              {n}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
