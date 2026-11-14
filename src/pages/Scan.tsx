import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { BottleRow } from '@/components/BottleRow'
import { CameraIcon, GlassIcon } from '@/components/icons'
import { Button, Card, PageHeader } from '@/components/ui'
import type { Bottle } from '@/data/bottles'
import { useWd } from '@/data/WdContext'
import { ScanError } from '@/lib/labelReader'
import { matchLabel, type LabelReading } from '@/lib/matchLabel'
import { pickScanBottle } from '@/lib/scan'
import { searchBottles } from '@/lib/searchBottles'
import { usePageTitle } from '@/lib/usePageTitle'

/** How long the pretend "reading the label" moment lasts. Short on purpose: a scan should feel instant. */
export const SCAN_DELAY_MS = 500

/** What the photo scan has to say after a try. */
type PhotoResult =
  | { kind: 'not-label' }
  | { kind: 'unknown'; seen: string }
  | { kind: 'similar'; seen: string; bottles: Bottle[] }
  | { kind: 'error'; message: string }

const describeReading = (r: LabelReading) => [r.producer, r.name, r.vintage].filter(Boolean).join(' · ')

/**
 * Scan a bottle. When the app is connected to Supabase it reads a photo of the label (take one, or choose one) and
 * opens the bottle's wine card. Otherwise it's simulated: one button picks a bottle. Either way a typed search is
 * always there underneath for the "can't find it" moments.
 */
export default function Scan() {
  usePageTitle('Scan a bottle')
  const { bottles, shelf, track, labelReader } = useWd()
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState<string | null>(null)
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const lastId = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const onShelf = useMemo(() => shelf.flatMap((i) => bottles.find((b) => b.id === i.bottleId) ?? []), [shelf, bottles])
  const results = useMemo(() => (searched === null ? [] : searchBottles(bottles, searched)), [bottles, searched])

  const scan = () => {
    const pick = pickScanBottle(onShelf, bottles, lastId.current)
    if (!pick) return
    lastId.current = pick.bottle.id
    setScanning(true)
    track('scan_simulated', { source: pick.from, bottle_id: pick.bottle.id })
    timer.current = setTimeout(() => navigate(`/bottle/${pick.bottle.id}`, { state: { scanned: true } }), SCAN_DELAY_MS)
  }

  const readPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same photo again still counts
    if (!file || !labelReader || scanning) return
    setPhotoResult(null)
    setSearched(null)
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    try {
      const reading = await labelReader.read(file)
      const found = matchLabel(bottles, reading)
      // We log how it went, never the photo or the words that were read.
      if (found.kind === 'match') {
        track('scan_photo', { outcome: 'matched' })
        navigate(`/bottle/${found.bottle.id}`, { state: { scanned: true, read: true } })
        return
      }
      if (!reading.is_wine_label) {
        track('scan_photo', { outcome: 'not-label' })
        setPhotoResult({ kind: 'not-label' })
      } else if (found.kind === 'similar') {
        track('scan_photo', { outcome: 'similar' })
        setPhotoResult({ kind: 'similar', seen: describeReading(reading), bottles: found.bottles })
      } else {
        track('scan_photo', { outcome: 'unknown' })
        const seen = describeReading(reading)
        setPhotoResult({ kind: 'unknown', seen })
        setQuery([reading.producer, reading.name].filter(Boolean).join(' '))
      }
    } catch (err) {
      const kind = err instanceof ScanError ? err.kind : 'unavailable'
      track('scan_photo', { outcome: 'error', error: kind })
      setPhotoResult({ kind: 'error', message: err instanceof ScanError ? err.message : 'We couldn’t read that right now. Try again, or type the name instead.' })
    } finally {
      setScanning(false)
    }
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearched(q)
    // We log how often people need this and whether it found anything, never what they typed.
    track('scan_fallback_used', { query_length: q.length, results: searchBottles(bottles, q).length })
  }

  return (
    <>
      <PageHeader title="Scan a bottle" subtitle="Standing in a shop, or looking at a gift? Let’s see what it is." />
      <div className="px-4">
        {labelReader ? (
          <>
            <p className="text-lg">
              Take a photo of the front of the bottle, or of the label on the back. We read it and look for it in our collection.
            </p>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={readPhoto} className="hidden" tabIndex={-1} aria-hidden="true" data-testid="scan-camera" />
            <input ref={libraryInput} type="file" accept="image/*" onChange={readPhoto} className="hidden" tabIndex={-1} aria-hidden="true" data-testid="scan-library" />
            <Button className="mt-5 min-h-16 w-full text-lg" onClick={() => cameraInput.current?.click()} disabled={scanning}>
              <CameraIcon /> {scanning ? 'Reading the label…' : 'Take a photo'}
            </Button>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => libraryInput.current?.click()} disabled={scanning}>
              <GlassIcon /> Choose a photo
            </Button>
            <p role="status" aria-live="polite" className="mt-2 text-muted">
              {scanning ? 'Reading the label…' : ''}
            </p>
            <p className="mt-1 text-sm text-muted">Your photo is sent securely to be read. We don’t keep it.</p>

            {preview && (
              <img src={preview} alt="The photo you chose" className="mt-4 max-h-48 rounded-2xl border border-line object-contain" />
            )}

            {photoResult?.kind === 'error' && (
              <div className="mt-4">
                <Banner tone="error">{photoResult.message}</Banner>
              </div>
            )}
            {photoResult?.kind === 'not-label' && (
              <div className="mt-4">
                <Banner title="That doesn’t look like a wine label">Try again with the label facing the camera, in good light. Or type the name below.</Banner>
              </div>
            )}
            {photoResult?.kind === 'unknown' && (
              <div className="mt-4">
                <Banner title="We don’t have that one yet">
                  {photoResult.seen ? `We read “${photoResult.seen}”, but it isn’t in our collection. ` : 'We couldn’t make out the label. '}
                  Try a clearer photo, or search below.
                </Banner>
              </div>
            )}
            {photoResult?.kind === 'similar' && (
              <div className="mt-4">
                <Banner title="We’re not sure which one it is">{photoResult.seen ? `We read “${photoResult.seen}”. ` : ''}Is it one of these?</Banner>
                <ul className="mt-3 flex flex-col gap-3">
                  {photoResult.bottles.map((b) => (
                    <li key={b.id}>
                      <Card>
                        <BottleRow bottle={b} level={3} />
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <Banner tone="concept" title="Simulated scan">
              Real label recognition isn’t switched on yet, so this picks a bottle for you to show how it will feel.
            </Banner>

            <Button className="mt-5 min-h-16 w-full text-lg" onClick={scan} disabled={scanning || bottles.length === 0}>
              <CameraIcon /> {scanning ? 'Reading the label…' : 'Scan a bottle'}
            </Button>
            <p role="status" aria-live="polite" className="mt-2 text-muted">
              {scanning
                ? 'Reading the label…'
                : onShelf.length === 0
                  ? 'Your shelf is empty, so we’ll pick one of our sample bottles.'
                  : 'We’ll pick one of the bottles on your shelf.'}
            </p>
          </>
        )}

        <section aria-labelledby="fallback" className="mt-8">
          <h2 id="fallback" className="text-2xl">
            Can’t find it?
          </h2>
          <p className="mt-1 text-muted">Type the name or describe it, like “light red” or “crisp white”.</p>
          <form onSubmit={search} role="search" className="mt-3">
            <label htmlFor="describe" className="block font-semibold">
              Bottle name or description
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                id="describe"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, maker, or how it tastes"
                className="min-h-12 min-w-0 flex-1 rounded-full border-2 border-edge bg-card px-5 text-base placeholder:text-muted/70 focus:border-wine"
              />
              <Button type="submit" variant="secondary">
                Find it
              </Button>
            </div>
          </form>

          {searched !== null && (
            <div className="mt-4">
              <p role="status" className="font-semibold text-muted">
                {results.length === 0 ? 'No bottles match' : `${results.length} bottle${results.length === 1 ? '' : 's'}`}
              </p>
              {results.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed border-line bg-card p-5 text-center text-muted">
                  We don’t have that one yet. Try a word or two, like “red” or “crisp”, or{' '}
                  <Link to="/shelf/add" className="font-semibold text-wine underline">
                    browse every bottle
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-3">
                  {results.map((b) => (
                    <li key={b.id}>
                      <Card>
                        <BottleRow bottle={b} level={3} />
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
