import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Tile, TileGrid } from '@/components/Tile'
import { ButtonLink, Card, PageHeader } from '@/components/ui'
import { MEAL_RULES, OCCASION_RULES } from '@/data/pairingRules'
import { useWd } from '@/data/WdContext'
import { pickProfileName } from '@/lib/describe'
import { isEmptyProfile } from '@/lib/profile'
import { usePageTitle } from '@/lib/usePageTitle'

/** "What are you eating?": pick a meal or an occasion and we choose from the shelf. */
export default function Home() {
  usePageTitle('Home')
  const { user } = useAuth()
  const { profile, shelf } = useWd()
  const taken = !isEmptyProfile(profile.prefs)

  return (
    <>
      <PageHeader title={`Hi ${user?.display_name ?? 'there'}`} subtitle="Let’s find a wine you’ll actually like." />
      <div className="px-4">
        {!taken && (
          <Card className="mb-6">
            <h2 className="text-2xl">Take the quick taste quiz</h2>
            <p className="mt-1 text-muted">About two minutes, no wrong answers, and you can stop whenever you like. It helps us tell you which bottles suit you.</p>
            <ButtonLink to="/quiz" className="mt-4 w-full">
              Start the quiz
            </ButtonLink>
          </Card>
        )}

        <section aria-labelledby="eating">
          <h2 id="eating" className="text-3xl leading-tight">
            What are you eating?
          </h2>
          <p className="mt-1 mb-3 text-muted">Pick one and we’ll choose from the bottles on your shelf.</p>
          <TileGrid label="Meals">
            {MEAL_RULES.map((r) => (
              <li key={r.id} className="contents">
                <Tile to={`/eat/${r.id}`} title={r.label} hint={r.hint} emoji={r.emoji} />
              </li>
            ))}
          </TileGrid>
        </section>

        <section aria-labelledby="occasions" className="mt-8">
          <h2 id="occasions" className="text-2xl">
            Or what’s the occasion?
          </h2>
          <div className="mt-3">
            <TileGrid label="Occasions">
              {OCCASION_RULES.map((r) => (
                <li key={r.id} className="contents">
                  <Tile to={`/eat/${r.id}`} title={r.label} hint={r.hint} emoji={r.emoji} />
                </li>
              ))}
            </TileGrid>
          </div>
        </section>

        <div className="mt-8 grid gap-3">
          <Card>
            <p className="font-semibold text-muted">My shelf</p>
            <h2 className="text-2xl">{shelf.length === 0 ? 'No bottles yet' : `${shelf.length} bottle${shelf.length === 1 ? '' : 's'} at home`}</h2>
            <Link to={shelf.length === 0 ? '/shelf/add' : '/shelf'} className="mt-2 inline-flex min-h-11 items-center font-semibold text-wine underline">
              {shelf.length === 0 ? 'Add your first bottle' : 'See my shelf'}
            </Link>
          </Card>
          <Card>
            <p className="font-semibold text-muted">In a shop?</p>
            <h2 className="text-2xl">Scan a bottle</h2>
            <Link to="/scan" className="mt-2 inline-flex min-h-11 items-center font-semibold text-wine underline">
              Scan or search for a bottle
            </Link>
          </Card>
          {taken && (
            <Card>
              <p className="font-semibold text-muted">Your taste</p>
              <h2 className="text-2xl">{pickProfileName(profile.prefs).name}</h2>
              <Link to="/profile" className="mt-2 inline-flex min-h-11 items-center font-semibold text-wine underline">
                See my taste profile
              </Link>
            </Card>
          )}
          <Card>
            <p className="font-semibold text-muted">Coming soon</p>
            <h2 className="text-2xl">Ideas we’re testing</h2>
            <Link to="/ideas" className="mt-2 inline-flex min-h-11 items-center font-semibold text-wine underline">
              See the concept previews
            </Link>
          </Card>
        </div>
      </div>
    </>
  )
}
