import { Link } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { Card, PageHeader } from '@/components/ui'
import { CONCEPTS } from '@/data/concepts'
import { usePageTitle } from '@/lib/usePageTitle'

/** The list of concept previews: ideas we're testing that don't work yet. */
export default function Ideas() {
  usePageTitle('Ideas we’re testing')
  return (
    <>
      <PageHeader title="Ideas we’re testing" subtitle="Sketches of what could come next. Tell us which ones you’d use." />
      <div className="px-4">
        <Banner tone="concept" title="Concept previews">
          Nothing here works yet. Each screen is a sketch to see if the idea would be useful.
        </Banner>
        <ul className="mt-4 flex flex-col gap-3">
          {CONCEPTS.map((c) => (
            <li key={c.id}>
              <Card>
                <h2 className="text-xl leading-snug">
                  <span aria-hidden="true">{c.emoji} </span>
                  <Link to={`/ideas/${c.id}`} className="inline-flex min-h-11 items-center font-display font-semibold text-wine underline decoration-1 underline-offset-2">
                    {c.title}
                  </Link>
                </h2>
                <p className="text-muted">{c.summary}</p>
                <p className="mt-1 text-sm font-semibold text-flag-text">Concept preview</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
