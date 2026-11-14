import { Link } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { ScaleMeter } from '@/components/ScaleMeter'
import { ButtonLink, Card } from '@/components/ui'
import { SCALES } from '@/data/scales'
import { useWd } from '@/data/WdContext'
import { evidenceLine, favoriteTypes, likedNotes, pickProfileName, summarize } from '@/lib/describe'
import { isEmptyProfile } from '@/lib/profile'
import { usePageTitle } from '@/lib/usePageTitle'

/** The person's taste in plain words: a playful name, one sentence, four scales and what they like. */
export default function TasteProfile() {
  usePageTitle('Your taste')
  const { profile } = useWd()
  const p = profile.prefs

  if (isEmptyProfile(p)) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-3xl">Your taste</h1>
        <p className="mt-3 text-lg text-muted">We don’t know your taste yet. The quick quiz takes about two minutes, and you can stop whenever you like.</p>
        <ButtonLink to="/quiz" className="mt-6 w-full">
          Take the quiz
        </ButtonLink>
      </div>
    )
  }

  const { name, blurb } = pickProfileName(p)
  const types = favoriteTypes(p)
  const notes = likedNotes(p)
  const fruitStyle = p.fruitCharacter === null ? null : p.fruitCharacter <= 0.6 ? 'Fresh and crisp' : p.fruitCharacter >= 1.4 ? 'Ripe and jammy' : null

  return (
    <div className="px-4 pt-6">
      <p className="font-semibold text-muted">You’re a</p>
      <h1 className="text-4xl leading-tight">{name}</h1>
      <p className="mt-2 text-lg">{blurb}</p>
      <p className="mt-3 text-lg text-muted">{summarize(p)}</p>

      <Card className="mt-6">
        <h2 className="text-xl">How you like it</h2>
        <ScaleMeter title={SCALES.body.title} stops={SCALES.body.stops} value={p.body} />
        <ScaleMeter title={SCALES.sweetness.title} stops={SCALES.sweetness.stops} value={p.sweetness} />
        <ScaleMeter title={SCALES.acidity.title} stops={SCALES.acidity.stops} value={p.acidity} />
        <ScaleMeter title={SCALES.tannin.title} stops={SCALES.tannin.stops} value={p.tannin} />
      </Card>

      {(types.length > 0 || notes.length > 0 || fruitStyle) && (
        <Card className="mt-4">
          <h2 className="text-xl">What you’re drawn to</h2>
          {types.length > 0 && (
            <p className="mt-2">
              <span className="font-semibold">Your usual picks: </span>
              {types.join(', ')}
            </p>
          )}
          {fruitStyle && (
            <p className="mt-2">
              <span className="font-semibold">Fruit style: </span>
              {fruitStyle}
            </p>
          )}
          {notes.length > 0 && (
            <>
              <p className="mt-2 font-semibold">Flavors you like</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {notes.map((n) => (
                  <li key={n} className="rounded-full border-2 border-edge bg-paper px-3 py-1 text-base">
                    {n}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      <div className="mt-4">
        <Banner>{evidenceLine(profile.ratingCount)}</Banner>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <ButtonLink to="/quiz" variant="secondary">
          Edit my answers
        </ButtonLink>
        <Link to="/" className="inline-flex min-h-12 items-center justify-center font-semibold text-wine underline">
          Back to home
        </Link>
      </div>
    </div>
  )
}
