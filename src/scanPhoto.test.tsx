import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { readLocalEvents } from './data/localWdRepo'
import { ScanError, type LabelReader } from './lib/labelReader'
import type { LabelReading } from './lib/matchLabel'
import { seedPerson } from './test-helpers'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  window.scrollTo = vi.fn()
})

const open = (path: string) => window.history.pushState({}, '', path)
const photo = () => new File(['pretend photo'], 'bottle.jpg', { type: 'image/jpeg' })
const reading = (over: Partial<LabelReading> = {}): LabelReading => ({ is_wine_label: true, producer: null, name: null, vintage: null, type: null, ...over })
const readerReturning = (r: LabelReading | Error): { reader: LabelReader; read: ReturnType<typeof vi.fn> } => {
  const read = vi.fn(async () => {
    if (r instanceof Error) throw r
    return r
  })
  return { reader: { read } as LabelReader, read }
}

// The tests run on the made-up sample bottles ("Sample Bubbly 1"…), so the readings below describe those.
const BUBBLY = reading({ producer: 'Placeholder Cellars', name: 'Sample Bubbly 1', type: 'sparkling' })

async function scanWith(r: LabelReading | Error) {
  const user = userEvent.setup()
  seedPerson({ age: true })
  open('/scan')
  const { reader, read } = readerReturning(r)
  render(<App demo labelReader={reader} />)
  await screen.findByRole('heading', { level: 1, name: 'Scan a bottle' })
  await user.upload(screen.getByTestId('scan-library'), photo())
  return { read }
}

describe('Scan a bottle from a photo', () => {
  it('offers a camera button and a choose-a-photo button, and no longer says it is simulated', async () => {
    seedPerson({ age: true })
    open('/scan')
    render(<App demo labelReader={readerReturning(BUBBLY).reader} />)
    expect(await screen.findByRole('button', { name: 'Take a photo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeEnabled()
    expect(screen.queryByText('Simulated scan')).not.toBeInTheDocument()
    expect(screen.getByText(/We don’t keep it/)).toBeInTheDocument() // says what happens to the photo
    // The camera input asks the phone for the back camera; the other one opens the photo library.
    expect(screen.getByTestId('scan-camera')).toHaveAttribute('capture', 'environment')
    expect(screen.getByTestId('scan-library')).not.toHaveAttribute('capture')
  })

  it('reads the photo and opens the wine card of the bottle it found', async () => {
    const { read } = await scanWith(BUBBLY)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sample Bubbly 1' })).toBeInTheDocument()
    expect(screen.getByText('Found by scan')).toBeInTheDocument()
    expect(screen.getByText(/We read the label in your photo/)).toBeInTheDocument()
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('logs how it went, and never the photo or the words that were read', async () => {
    await scanWith(BUBBLY)
    await screen.findByRole('heading', { level: 1, name: 'Sample Bubbly 1' })
    await waitFor(() => expect(readLocalEvents('u1').map((e) => e.name)).toEqual(['scan_photo', 'wine_card_viewed']))
    const events = readLocalEvents('u1')
    expect(events[0]!.properties).toEqual({ outcome: 'matched' })
    expect(JSON.stringify(events)).not.toMatch(/Placeholder|Sample Bubbly|pretend photo/)
  })

  it('says so kindly when the wine is not in the collection, and starts a search for it', async () => {
    await scanWith(reading({ producer: 'Opus One', name: 'Overture', vintage: 2019, type: 'red' }))
    expect(await screen.findByText('We don’t have that one yet')).toBeInTheDocument()
    expect(screen.getByText(/Opus One · Overture · 2019/)).toBeInTheDocument()
    expect(screen.getByLabelText('Bottle name or description')).toHaveValue('Opus One Overture')
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ outcome: 'unknown' })
  })

  it('says so when the photo is not a wine label', async () => {
    await scanWith(reading({ is_wine_label: false }))
    expect(await screen.findByText('That doesn’t look like a wine label')).toBeInTheDocument()
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ outcome: 'not-label' })
  })

  it('offers close matches when it is not sure', async () => {
    await scanWith(reading({ producer: 'Placeholder Cellars', name: 'Sample' }))
    expect(await screen.findByText('We’re not sure which one it is')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Sample / }).length).toBeGreaterThan(0)
  })

  it('shows a kind message when reading fails, and keeps the typed search available', async () => {
    await scanWith(new ScanError('rate-limited', 'That’s a lot of scans for one hour. Try again a little later, or type the name instead.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('That’s a lot of scans for one hour')
    expect(screen.getByLabelText('Bottle name or description')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Take a photo' })).toBeEnabled() // can try again
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ outcome: 'error', error: 'rate-limited' })
  })

  it('treats an unexpected failure like "try again", not a crash', async () => {
    await scanWith(new Error('network down'))
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t read that right now')
  })

  it('blocks a second photo while one is being read', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/scan')
    let finish: (r: LabelReading) => void = () => undefined
    const read = vi.fn(() => new Promise<LabelReading>((resolve) => (finish = resolve)))
    render(<App demo labelReader={{ read } as LabelReader} />)
    await screen.findByRole('heading', { level: 1, name: 'Scan a bottle' })
    await user.upload(screen.getByTestId('scan-library'), photo())
    expect(await screen.findByRole('button', { name: /Reading the label/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeDisabled()
    finish(BUBBLY)
    await screen.findByRole('heading', { level: 1, name: 'Sample Bubbly 1' })
    expect(read).toHaveBeenCalledTimes(1)
  })
})

describe('Scan without a label reader (device-only demo mode)', () => {
  it('keeps the simulated scan', async () => {
    seedPerson({ age: true })
    open('/scan')
    render(<App demo labelReader={null} />)
    expect(await screen.findByText('Simulated scan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan a bottle' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Take a photo' })).not.toBeInTheDocument()
  })
})
