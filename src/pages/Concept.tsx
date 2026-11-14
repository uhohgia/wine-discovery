import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { BottleRow } from '@/components/BottleRow'
import { PriceFeel } from '@/components/PriceFeel'
import { ButtonLink, Card } from '@/components/ui'
import type { Bottle } from '@/data/bottles'
import { CONCEPTS, isConceptId, type ConceptId } from '@/data/concepts'
import { CHEAP_UNDER, MID_UP_TO, PRICE_FEEL_WORDS } from '@/data/pricing'
import { BOTTLE_WORDS } from '@/data/whyPhrases'
import { useWd } from '@/data/WdContext'
import { priceFeel, priceSymbols } from '@/lib/pricing'
import { usePageTitle } from '@/lib/usePageTitle'

/** A pretend control: looks like a label, can't be tapped, so nobody wonders why a button does nothing. */
function Mock({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border-2 border-dashed border-edge bg-paper p-4">{children}</div>
}

const byId = (bottles: Bottle[], id: string): Bottle | undefined => bottles.find((b) => b.id === id) ?? bottles[0]

function NonAlcoholic({ bottles }: { bottles: Bottle[] }) {
  const a = byId(bottles, 'sample-white-1')
  const b = byId(bottles, 'sample-red-1')
  return (
    <>
      <p className="text-lg">Not drinking tonight, or hosting someone who isn’t? Alcohol-free bottles would show up in your results as a normal choice, never an afterthought.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      <Mock>
        <p className="font-semibold">Best bets for spicy takeout</p>
        <ol className="mt-3 flex flex-col gap-3">
          {a && (
            <li>
              <Card>
                <BottleRow bottle={a} level={3} />
              </Card>
            </li>
          )}
          <li>
            <Card>
              <h3 className="text-lg leading-snug font-display font-semibold">Sample Alcohol-Free Sparkling</h3>
              <p className="text-muted">Placeholder Cellars · Zero-proof</p>
              <p className="mt-1">
                <span className="rounded-full border-2 border-ok px-2 py-0.5 text-sm font-bold text-ok">Alcohol-free</span>
              </p>
              <p className="mt-2">Crisp and refreshing, with a little zip. Great with spicy food.</p>
            </Card>
          </li>
          {b && (
            <li>
              <Card>
                <BottleRow bottle={b} level={3} />
              </Card>
            </li>
          )}
        </ol>
      </Mock>
      <p className="mt-3 text-muted">Same ranking, same plain-language reasons. Just more choices for more people.</p>
    </>
  )
}

function GiftMode({ bottles }: { bottles: Bottle[] }) {
  const gift = byId(bottles, 'sample-bubbly-1')
  return (
    <>
      <p className="text-lg">Picking a bottle for someone else? Answer a few quick questions about them, and we’d suggest something they’re likely to enjoy.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      <Mock>
        <p className="font-semibold">A gift for…</p>
        <dl className="mt-2 grid gap-1">
          <div>
            <dt className="text-sm text-muted">What they usually drink</dt>
            <dd>Bubbly and light whites</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">How they take their coffee</dt>
            <dd>Skim milk, no sugar</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Your budget</dt>
            <dd>$$ · {PRICE_FEEL_WORDS[2]}</dd>
          </div>
        </dl>
        {gift && (
          <Card className="mt-3">
            <p className="text-sm font-bold tracking-wide text-wine uppercase">A good gift</p>
            <BottleRow bottle={gift} level={3} />
            <p className="mt-2">“{gift.talking_point}”</p>
          </Card>
        )}
      </Mock>
    </>
  )
}

function Budget({ bottles }: { bottles: Bottle[] }) {
  const bands = [
    { symbols: '$', label: `Under $${CHEAP_UNDER}`, feel: 1 },
    { symbols: '$$', label: `$${CHEAP_UNDER} to $${MID_UP_TO}`, feel: 2 },
    { symbols: '$$$', label: `Over $${MID_UP_TO}`, feel: 3 },
  ] as const
  return (
    <>
      <p className="text-lg">Set a comfortable price range once, and every recommendation would stay inside it.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      <Mock>
        <p className="font-semibold">Show me bottles that are…</p>
        <ul className="mt-3 flex flex-col gap-2">
          {bands.map((b) => {
            const n = bottles.filter((x) => priceFeel(x.price) === b.feel).length
            return (
              <li key={b.symbols} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-edge bg-card px-4 py-3">
                <span>
                  <span className="font-bold">{b.symbols}</span> <span className="text-muted">·</span> {b.label}
                </span>
                <span className="text-sm text-muted">
                  {n} bottle{n === 1 ? '' : 's'}
                </span>
              </li>
            )
          })}
        </ul>
      </Mock>
      <p className="mt-3 text-muted">Today we show a price feel on every bottle. A budget setting would let you filter by it.</p>
    </>
  )
}

function StoreFinder({ bottles }: { bottles: Bottle[] }) {
  const b = byId(bottles, 'sample-red-2')
  return (
    <>
      <p className="text-lg">Loved a bottle and want more? We’d tell you the kinds of stores that usually carry it.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      <Mock>
        {b && (
          <>
            <BottleRow bottle={b} level={3} />
            <p className="mt-3 font-semibold">Usually sold at</p>
            <ul className="mt-1 list-disc pl-6">
              {b.usually_sold_at.length > 0 ? b.usually_sold_at.map((s) => <li key={s}>{s}</li>) : <li>Wine shops</li>}
            </ul>
          </>
        )}
      </Mock>
      <p className="mt-3 text-muted">No location needed, no live prices or stock. Just a helpful starting point.</p>
    </>
  )
}

function HostCard({ bottles }: { bottles: Bottle[] }) {
  const b = byId(bottles, 'sample-white-2')
  return (
    <>
      <p className="text-lg">Hosting? A small card for the table that tells guests what they’re drinking, why it’s there, and one fun thing to say.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      {b && (
        <Mock>
          <div className="rounded-2xl border-2 border-wine bg-card p-5 text-center">
            <p className="text-sm font-bold tracking-wide text-wine uppercase">Tonight we’re pouring</p>
            <p className="mt-1 font-display text-2xl font-semibold">{b.name}</p>
            <p className="text-muted">
              <PriceFeel price={b.price} />
            </p>
            <p className="mt-3">
              It’s {BOTTLE_WORDS.body[b.body]}, {BOTTLE_WORDS.sweetness[b.sweetness]} and {BOTTLE_WORDS.acidity[b.acidity]}.
            </p>
            <p className="mt-2">Goes with: {b.pairings.slice(0, 2).join(', ')}.</p>
            <p className="mt-3 italic">“{b.talking_point}”</p>
          </div>
        </Mock>
      )}
      <p className="mt-3 text-muted">Imagine it printed, or sent to a guest’s phone.</p>
    </>
  )
}

function MoreFromProducer({ bottles }: { bottles: Bottle[] }) {
  const b = byId(bottles, 'sample-red-1')
  const others = b ? bottles.filter((x) => x.producer === b.producer && x.id !== b.id).slice(0, 3) : []
  return (
    <>
      <p className="text-lg">Liked a bottle? See what else the same maker offers, so a favorite is easy to follow.</p>
      <h2 className="mt-5 text-xl">What it could look like</h2>
      <Mock>
        {b && <p className="font-semibold">More from {b.producer}</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {others.map((o) => (
            <li key={o.id}>
              <Card>
                <h3 className="text-lg leading-snug font-display font-semibold">{o.name}</h3>
                <p className="text-muted">
                  {o.vintage ? `${o.vintage} · ` : ''}
                  <span aria-hidden="true">{priceSymbols(o.price)}</span>
                  <span className="sr-only">{PRICE_FEEL_WORDS[priceFeel(o.price)]}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Mock>
    </>
  )
}

const BODIES: Record<ConceptId, (p: { bottles: Bottle[] }) => ReactNode> = {
  'non-alcoholic': NonAlcoholic,
  'gift-mode': GiftMode,
  budget: Budget,
  'store-finder': StoreFinder,
  'host-card': HostCard,
  'more-from-producer': MoreFromProducer,
}

/** One concept preview: a clear banner, a short idea, a mock of how it could look. Nothing here is interactive. */
export default function Concept() {
  const { id = '' } = useParams()
  const concept = isConceptId(id) ? CONCEPTS.find((c) => c.id === id) : undefined
  const { bottles, track } = useWd()
  usePageTitle(concept ? `Concept preview: ${concept.title}` : 'Not found')

  const logged = useRef<string | null>(null)
  useEffect(() => {
    if (!concept || logged.current === concept.id) return
    logged.current = concept.id
    track('concept_screen_viewed', { screen: concept.id })
  }, [concept, track])

  if (!concept) {
    return (
      <div className="px-4 pt-8 text-center">
        <h1 className="text-2xl">We couldn’t find that idea</h1>
        <ButtonLink to="/ideas" className="mt-6">
          Back to ideas
        </ButtonLink>
      </div>
    )
  }

  const Body = BODIES[concept.id]
  return (
    <div className="px-4 pt-4 pb-6">
      <Link to="/ideas" className="inline-flex min-h-11 items-center font-semibold text-wine underline">
        ← Ideas we’re testing
      </Link>
      <div className="mt-2">
        <Banner tone="concept" title="Concept preview">
          This isn’t built yet. It’s a sketch to see if the idea would be useful, and nothing on this screen works.
        </Banner>
      </div>
      <h1 className="mt-4 text-3xl leading-tight">
        <span aria-hidden="true">{concept.emoji} </span>
        {concept.title}
      </h1>
      <div className="mt-3">
        <Body bottles={bottles} />
      </div>
    </div>
  )
}
