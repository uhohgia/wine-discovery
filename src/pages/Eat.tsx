import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { BottleRow } from '@/components/BottleRow'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { GlassIcon } from '@/components/icons'
import { ButtonLink, Card, EmptyState } from '@/components/ui'
import { PAIRING_RULES } from '@/data/pairingRules'
import { useWd } from '@/data/WdContext'
import { isEmptyProfile } from '@/lib/profile'
import { rankForMeal } from '@/lib/ranking'
import { usePageTitle } from '@/lib/usePageTitle'

/** Ranked bottles from the person's shelf for one meal or occasion, each with a label and a plain-language why. */
export default function Eat() {
  const { id = '' } = useParams()
  const rule = Object.prototype.hasOwnProperty.call(PAIRING_RULES, id) ? PAIRING_RULES[id as keyof typeof PAIRING_RULES] : undefined
  const { bottles, shelf, profile, track } = useWd()
  usePageTitle(rule ? `Best bets for ${rule.forWhat}` : 'Not found')

  const onShelf = useMemo(() => shelf.flatMap((i) => bottles.find((b) => b.id === i.bottleId) ?? []), [shelf, bottles])
  const ranked = useMemo(() => (rule ? rankForMeal(profile.prefs, onShelf, rule, profile.ratingCount) : []), [rule, profile.prefs, profile.ratingCount, onShelf])

  // One event per visit to a meal, however many times the list re-renders.
  const logged = useRef<string | null>(null)
  useEffect(() => {
    if (!rule || logged.current === rule.id) return
    logged.current = rule.id
    track('meal_selected', { kind: rule.kind, id: rule.id, shelf_size: onShelf.length })
  }, [rule, onShelf.length, track])

  if (!rule) {
    return (
      <div className="px-4 pt-8 text-center">
        <h1 className="text-2xl">We couldn’t find that one</h1>
        <ButtonLink to="/" className="mt-6">
          Back to home
        </ButtonLink>
      </div>
    )
  }

  const knows = !isEmptyProfile(profile.prefs)

  return (
    <div className="px-4 pt-4 pb-6">
      <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-wine underline">
        ← What are you eating?
      </Link>
      <h1 className="mt-2 text-3xl leading-tight">
        <span aria-hidden="true">{rule.emoji} </span>
        Best bets for {rule.forWhat}
      </h1>

      {ranked.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<GlassIcon />} title="Your shelf is empty" action={<ButtonLink to="/shelf/add">Add bottles</ButtonLink>}>
            Add the bottles you have at home and we’ll tell you which to open for {rule.forWhat}.
          </EmptyState>
        </div>
      ) : (
        <>
          {!knows && (
            <div className="mt-3">
              <Banner>
                We’re going by the food alone for now.{' '}
                <Link to="/quiz" className="font-semibold text-wine underline">
                  Take the quick quiz
                </Link>{' '}
                and we’ll also tell you which bottles suit you.
              </Banner>
            </div>
          )}
          <p className="mt-2 text-muted">From your shelf, best first. We blend how well each bottle goes with {rule.forWhat} and how well it suits your taste.</p>
          <ol className="mt-4 flex flex-col gap-3">
            {ranked.map((r, i) => (
              <li key={r.bottle.id}>
                <Card>
                  {i === 0 && <p className="mb-1 text-sm font-bold tracking-wide text-wine uppercase">Best pick</p>}
                  <BottleRow bottle={r.bottle} />
                  {r.confidence && (
                    <p className="mt-2">
                      <ConfidenceBadge confidence={r.confidence} />
                    </p>
                  )}
                  <p className="mt-2 text-lg">{r.why}</p>
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
