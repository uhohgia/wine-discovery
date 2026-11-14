import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { BottleRow } from '@/components/BottleRow'
import { Button, Card, PageHeader } from '@/components/ui'
import { useWd } from '@/data/WdContext'
import { searchBottles } from '@/lib/searchBottles'
import { usePageTitle } from '@/lib/usePageTitle'

/** Browse or search the catalog and put bottles on the shelf, as bought or gifted. */
export default function AddBottles() {
  usePageTitle('Add bottles')
  const { bottles, shelf, addToShelf } = useWd()
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const results = useMemo(() => searchBottles(bottles, query), [bottles, query])
  const onShelf = new Set(shelf.map((i) => i.bottleId))

  const add = async (id: string, name: string, source: 'bought' | 'gift') => {
    setError(null)
    setMessage(null)
    setBusyId(id)
    try {
      await addToShelf(id, source)
      setMessage(`Added ${name} to your shelf.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader title="Add bottles" subtitle="Find a bottle by name, or describe it: “light red” or “crisp white”." />
      <div className="px-4">
        <Link to="/shelf" className="inline-flex min-h-11 items-center font-semibold text-wine underline">
          ← My shelf
        </Link>
        <label htmlFor="bottle-search" className="mt-2 block font-semibold">
          Search the catalog
        </label>
        <input
          id="bottle-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, maker, or how it tastes"
          className="mt-1 min-h-12 w-full rounded-full border-2 border-edge bg-card px-5 text-base placeholder:text-muted/70 focus:border-wine"
        />

        <div className="mt-3" aria-live="polite">
          {message && <Banner>{message}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>

        <p role="status" className="mt-3 font-semibold text-muted">
          {results.length === 0 ? 'No bottles match' : `${results.length} bottle${results.length === 1 ? '' : 's'}`}
        </p>
        {results.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line bg-card p-5 text-center text-muted">
            Nothing matches yet. Try fewer words, like “red” or “crisp”.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {results.map((b) => (
              <li key={b.id}>
                <Card>
                  <BottleRow bottle={b} />
                  {onShelf.has(b.id) ? (
                    <p className="mt-3 font-semibold text-ok">
                      <span aria-hidden="true">✓ </span>On your shelf
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className="min-h-11 flex-1 px-4" disabled={busyId === b.id} onClick={() => add(b.id, b.name, 'bought')}>
                        I bought it
                        <span className="sr-only"> ({b.name})</span>
                      </Button>
                      <Button variant="secondary" className="min-h-11 flex-1 px-4" disabled={busyId === b.id} onClick={() => add(b.id, b.name, 'gift')}>
                        It was a gift
                        <span className="sr-only"> ({b.name})</span>
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
