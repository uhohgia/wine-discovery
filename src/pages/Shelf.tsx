import { BottleRow } from '@/components/BottleRow'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { GlassIcon } from '@/components/icons'
import { VERDICT_LABELS } from '@/data/dislikeRules'
import { useWd } from '@/data/WdContext'
import { usePageTitle } from '@/lib/usePageTitle'

/** The label of the person's most recent rating for a bottle, as a one-item list (or empty). */
function latestVerdict(ratings: { bottleId: string; verdict: keyof typeof VERDICT_LABELS }[], bottleId: string): string[] {
  const last = ratings.filter((r) => r.bottleId === bottleId).at(-1)
  return last ? [VERDICT_LABELS[last.verdict]] : []
}

/** The bottles the person has at home, whether they bought them or were given them. */
export default function Shelf() {
  usePageTitle('My shelf')
  const { bottles, shelf, ratings } = useWd()
  const rows = shelf.flatMap((item) => {
    const bottle = bottles.find((b) => b.id === item.bottleId)
    return bottle ? [{ item, bottle }] : []
  })

  return (
    <>
      <PageHeader title="My shelf" subtitle={rows.length > 0 ? `${rows.length} bottle${rows.length === 1 ? '' : 's'} at home` : undefined} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<GlassIcon />}
          title="Your shelf is empty"
          action={<ButtonLink to="/shelf/add">Add bottles</ButtonLink>}
        >
          Add the bottles you have at home, bought or gifted. Then we can tell you which to open with dinner.
        </EmptyState>
      ) : (
        <div className="px-4">
          <ButtonLink to="/shelf/add" variant="secondary" className="w-full">
            Add bottles
          </ButtonLink>
          <ul className="mt-4 flex flex-col gap-3">
            {rows.map(({ item, bottle }) => (
              <li key={bottle.id}>
                <Card>
                  <BottleRow
                    bottle={bottle}
                    notes={[item.source === 'gift' ? 'Gift' : 'Bought', ...latestVerdict(ratings, bottle.id)]}
                  />
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
