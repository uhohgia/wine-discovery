import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { ChoiceGroup } from '@/components/Choice'
import { Button, ButtonLink } from '@/components/ui'
import { DISLIKE_RULES, VERDICT_HINTS, VERDICT_LABELS } from '@/data/dislikeRules'
import { UNSURE } from '@/data/quizRules'
import { DISLIKE_REASONS, VERDICTS, type DislikeReason, type Verdict } from '@/data/vocab'
import { useWd } from '@/data/WdContext'
import { usePageTitle } from '@/lib/usePageTitle'

const VERDICT_OPTIONS = VERDICTS.map((v) => ({ value: v, label: VERDICT_LABELS[v] }))
// "Not sure" is added by the choice group itself, so it isn't listed here.
const REASON_OPTIONS = DISLIKE_REASONS.filter((r) => r !== 'not-sure').map((r) => ({ value: r, label: DISLIKE_RULES[r].label }))

/** Loved it / It was fine / Not for me. "Not for me" asks why, and each reason teaches the app something. */
export default function Rate() {
  const { id = '' } = useParams()
  const { bottles, ratings, rateBottle, track } = useWd()
  const bottle = bottles.find((b) => b.id === id)
  usePageTitle(bottle ? `Rate ${bottle.name}` : 'Rate')

  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ message: string; verdict: Verdict } | null>(null)

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

  const previous = ratings.filter((r) => r.bottleId === bottle.id).at(-1)

  const save = async () => {
    setError(null)
    if (!verdict) {
      setError('Pick how it was first: loved it, it was fine, or not for me.')
      return
    }
    // The choice group says "unsure"; the database and rules say "not-sure".
    const chosen: DislikeReason[] = verdict === 'not-for-me' ? reasons.map((r) => (r === UNSURE ? 'not-sure' : (r as DislikeReason))) : []
    setBusy(true)
    try {
      const message = await rateBottle(bottle.id, verdict, chosen)
      track('rating_saved', { bottle_id: bottle.id, verdict, reasons_count: chosen.length })
      for (const reason of chosen) track('dislike_reason_selected', { bottle_id: bottle.id, reason })
      setDone({ message, verdict })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="px-4 pt-6 pb-6">
        <h1 className="text-3xl leading-tight">Thanks for rating {bottle.name}</h1>
        <div className="mt-4" role="status">
          <Banner title={VERDICT_LABELS[done.verdict]}>{done.message}</Banner>
        </div>
        <p className="mt-4 text-lg text-muted">Your taste profile just learned from this, so your recommendations may shift.</p>
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink to="/profile">See my taste profile</ButtonLink>
          <ButtonLink to={`/bottle/${bottle.id}`} variant="secondary">
            Back to {bottle.name}
          </ButtonLink>
          <ButtonLink to="/" variant="ghost">
            What are we eating next?
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <Link to={`/bottle/${bottle.id}`} className="inline-flex min-h-11 items-center font-semibold text-wine underline">
        ← {bottle.name}
      </Link>
      <h1 className="mt-2 text-3xl leading-tight">How was {bottle.name}?</h1>
      <p className="mt-2 text-lg text-muted">No wrong answers. Every one helps us learn what you like.</p>
      {previous && (
        <p className="mt-2 text-muted">
          Last time you said <strong>{VERDICT_LABELS[previous.verdict]}</strong>. A new rating adds to what we’ve learned.
        </p>
      )}

      <ChoiceGroup
        legend="How was it?"
        options={VERDICT_OPTIONS}
        value={verdict ? [verdict] : []}
        onChange={(v) => {
          setVerdict((v[0] as Verdict | undefined) ?? null)
          setReasons([])
        }}
        multi={false}
        allowUnsure={false}
      />
      {verdict && <p className="mt-2 text-muted">{VERDICT_HINTS[verdict]}</p>}

      {verdict === 'not-for-me' && (
        <ChoiceGroup legend="What didn’t you like? Pick any that fit." options={REASON_OPTIONS} value={reasons} onChange={setReasons} multi />
      )}

      {error && (
        <div className="mt-4">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      <Button className="mt-8 w-full" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save my rating'}
      </Button>
    </div>
  )
}
