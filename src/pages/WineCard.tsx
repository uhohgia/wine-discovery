import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { BottleScales } from '@/components/BottleScales'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { PriceFeel } from '@/components/PriceFeel'
import { TermChips } from '@/components/TermChips'
import { Button, ButtonLink, Card } from '@/components/ui'
import type { Bottle } from '@/data/bottles'
import { BottlePhoto } from '@/components/BottlePhoto'
import { VERDICT_LABELS } from '@/data/dislikeRules'
import { TYPE_WORDS } from '@/data/whyPhrases'
import { useWd } from '@/data/WdContext'
import { isEmptyProfile } from '@/lib/profile'
import { confidenceFor, explainWhy, scoreBottle } from '@/lib/scoring'
import { usePageTitle } from '@/lib/usePageTitle'

/** Words worth explaining for this bottle: the four feel words plus whatever is special about it. */
function wordsFor(b: Bottle): string[] {
  const ids = ['body', 'sweetness', 'acidity', 'tannin', 'fruit-style', b.fruit_character]
  if (b.sweetness !== 'dry') ids.push(b.sweetness)
  if (b.type === 'rosé' || b.type === 'sparkling' || b.type === 'orange') ids.push(b.type)
  if (b.vintage) ids.push('vintage')
  ids.push('producer')
  return ids
}

/** The hero screen: everything about one bottle in plain words. */
export default function WineCard() {
  const { id = '' } = useParams()
  const scanState = useLocation().state as { scanned?: boolean; read?: boolean } | null
  const scanned = scanState?.scanned === true
  const readFromPhoto = scanState?.read === true
  const { bottles, shelf, ratings, profile, track, addToShelf, removeFromShelf } = useWd()
  const bottle = bottles.find((b) => b.id === id)
  usePageTitle(bottle?.name ?? 'Wine')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // One "viewed" event per visit to a card, even though effects can run twice in development.
  const viewed = useRef<string | null>(null)
  const onShelfAtOpen = shelf.some((i) => i.bottleId === id)
  useEffect(() => {
    if (!bottle || viewed.current === id) return
    viewed.current = id
    track('wine_card_viewed', { bottle_id: id, on_shelf: onShelfAtOpen })
  }, [bottle, id, onShelfAtOpen, track])

  if (!bottle) {
    return (
      <div className="px-4 pt-8 text-center">
        <h1 className="text-2xl">We couldn’t find that bottle</h1>
        <ButtonLink to="/shelf" className="mt-6">
          Back to my shelf
        </ButtonLink>
      </div>
    )
  }

  const item = shelf.find((i) => i.bottleId === bottle.id)
  const lastRating = ratings.filter((r) => r.bottleId === bottle.id).at(-1)
  const prefs = profile.prefs
  const known = !isEmptyProfile(prefs)
  const scored = scoreBottle(prefs, bottle)
  const confidence = known ? confidenceFor(scored, bottle, profile.ratingCount) : null

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const notes = [...bottle.fruit_notes, ...bottle.flower_notes, ...bottle.extras]

  return (
    <article className="px-4 pt-4 pb-6">
      <Link to="/shelf" className="inline-flex min-h-11 items-center font-semibold text-wine underline">
        ← My shelf
      </Link>

      {scanned && (
        <div className="mt-2">
          <Banner title="Found by scan">
            {readFromPhoto
              ? 'We read the label in your photo and found this bottle. Here’s what to know about it.'
              : 'This is the bottle your scan picked (simulated). Here’s what to know about it.'}
          </Banner>
        </div>
      )}

      {bottle.is_placeholder && (
        <div className="mt-2">
          <Banner tone="concept" title="Sample bottle">
            This is a placeholder for testing, not a real wine.
          </Banner>
        </div>
      )}

      <BottlePhoto bottle={bottle} size="hero" />

      <h1 className="mt-3 text-4xl leading-tight [overflow-wrap:anywhere]">{bottle.name}</h1>
      <p className="mt-1 text-lg text-muted [overflow-wrap:anywhere]">
        {bottle.producer}
        {bottle.vintage ? ` · ${bottle.vintage}` : ''}
      </p>
      <p className="mt-2 text-lg">
        <span className="capitalize">{TYPE_WORDS[bottle.type]}</span> · <PriceFeel price={bottle.price} />
      </p>

      <Card className="mt-5">
        <h2 className="text-xl">Will you like it?</h2>
        {confidence ? (
          <>
            <p className="mt-2">
              <ConfidenceBadge confidence={confidence} />
            </p>
            <p className="mt-3 text-lg">{explainWhy(prefs, bottle, scored)}</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg">We don’t know your taste yet, so we can’t say. The quick quiz takes about two minutes.</p>
            <ButtonLink to="/quiz" variant="secondary" className="mt-3 w-full">
              Take the quiz
            </ButtonLink>
          </>
        )}
      </Card>

      <section className="mt-6" aria-labelledby="feel">
        <h2 id="feel" className="text-2xl">
          How it feels
        </h2>
        <Card className="mt-2">
          <BottleScales bottle={bottle} />
        </Card>
      </section>

      {notes.length > 0 && (
        <section className="mt-6" aria-labelledby="flavors">
          <h2 id="flavors" className="text-2xl">
            Flavors you might notice
          </h2>
          <p className="mt-1 mb-2 text-muted">Tap a flavor to see what it means.</p>
          <TermChips label="Flavors" ids={notes} />
        </section>
      )}

      <section className="mt-6" aria-labelledby="pairings">
        <h2 id="pairings" className="text-2xl">
          Good with
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
          {bottle.pairings.slice(0, 3).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-3">
        <Card>
          <h2 className="text-xl">Serving tip</h2>
          <p className="mt-1 text-lg">{bottle.serve_tip}</p>
        </Card>
        <Card>
          <h2 className="text-xl">One thing to say</h2>
          <p className="mt-1 text-lg">“{bottle.talking_point}”</p>
        </Card>
      </div>

      <section className="mt-6" aria-labelledby="tried">
        <h2 id="tried" className="text-2xl">
          {lastRating ? 'Your rating' : 'Tried it?'}
        </h2>
        {lastRating ? (
          <p className="mt-1 text-lg">
            You said: <strong>{VERDICT_LABELS[lastRating.verdict]}</strong>.
          </p>
        ) : (
          <p className="mt-1 text-lg text-muted">Tell us how it was and we’ll learn what you like. Every answer helps, even “not for me”.</p>
        )}
        <ButtonLink to={`/bottle/${bottle.id}/rate`} variant={lastRating ? 'secondary' : 'primary'} className="mt-3 w-full">
          {lastRating ? 'Rate it again' : 'Rate this bottle'}
        </ButtonLink>
      </section>

      <section className="mt-6" aria-labelledby="words">
        <h2 id="words" className="text-2xl">
          Wine words, explained
        </h2>
        <p className="mt-1 mb-2 text-muted">Tap any word you’ve wondered about.</p>
        <TermChips label="Wine words" ids={wordsFor(bottle)} />
      </section>

      <section className="mt-8" aria-labelledby="shelf-actions">
        <h2 id="shelf-actions" className="text-2xl">
          {item ? 'On your shelf' : 'Have it at home?'}
        </h2>
        {error && (
          <div className="mt-2">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
        {item ? (
          <>
            <p className="mt-1 text-lg text-muted">You {item.source === 'gift' ? 'got this as a gift' : 'bought this'}.</p>
            <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={() => run(() => removeFromShelf(bottle.id))}>
              Remove from my shelf
            </Button>
          </>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <Button disabled={busy} onClick={() => run(() => addToShelf(bottle.id, 'bought'))}>
              Add to my shelf: I bought it
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => run(() => addToShelf(bottle.id, 'gift'))}>
              Add to my shelf: it was a gift
            </Button>
          </div>
        )}
      </section>
    </article>
  )
}
