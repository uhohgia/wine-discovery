import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { CONCEPTS } from './data/concepts'
import { readLocalEvents } from './data/localWdRepo'
import { eventNames, seedPerson } from './test-helpers'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

const open = (path: string) => window.history.pushState({}, '', path)
const ONE_BOTTLE = [{ bottleId: 'sample-white-2', source: 'bought' as const }]

describe('Scan a bottle (simulated)', () => {
  it('is honest that it is simulated, and offers a big scan button', async () => {
    seedPerson({ age: true, shelf: ONE_BOTTLE })
    open('/scan')
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Scan a bottle' })).toBeInTheDocument()
    expect(screen.getByText('Simulated scan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan a bottle' })).toBeEnabled()
    expect(screen.getByText('We’ll pick one of the bottles on your shelf.')).toBeInTheDocument()
  })

  it('picks a bottle from the shelf and opens its wine card, saying it was found by scan', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true, shelf: ONE_BOTTLE })
    open('/scan')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Scan a bottle' }))
    expect(screen.getByRole('button', { name: /Reading the label/ })).toBeDisabled() // no double scans
    expect(await screen.findByRole('heading', { level: 1, name: 'Sample White 2' })).toBeInTheDocument()
    expect(screen.getByText('Found by scan')).toBeInTheDocument()
    await waitFor(() => expect(eventNames()).toEqual(['scan_simulated', 'wine_card_viewed']))
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ source: 'shelf', bottle_id: 'sample-white-2' })
  })

  it('always works: an empty shelf scans a sample bottle that can be added to the shelf', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/scan')
    render(<App demo />)
    expect(await screen.findByText('Your shelf is empty, so we’ll pick one of our sample bottles.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Scan a bottle' }))
    expect(await screen.findByText('Found by scan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add to my shelf: I bought it/ })).toBeInTheDocument()
    expect(readLocalEvents('u1')[0]!.properties).toMatchObject({ source: 'catalog' })
  })

  it('a regular visit to a wine card has no "found by scan" note', async () => {
    seedPerson({ age: true })
    open('/bottle/sample-red-1')
    render(<App demo />)
    await screen.findByRole('heading', { level: 1, name: 'Sample Red 1' })
    expect(screen.queryByText('Found by scan')).not.toBeInTheDocument()
  })
})

describe('typed fallback: "Can’t find it?"', () => {
  it('finds bottles by name or description, and logs how often it is needed (not what was typed)', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/scan')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Can’t find it?' })).toBeInTheDocument()
    expect(screen.getByText(/Type the name or describe it/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Bottle name or description'), 'light red')
    expect(eventNames()).toEqual([]) // typing alone logs nothing
    await user.click(screen.getByRole('button', { name: 'Find it' }))
    expect(await screen.findByText('2 bottles')).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Sample Red 1')
    expect(readLocalEvents('u1')).toHaveLength(1)
    expect(readLocalEvents('u1')[0]).toMatchObject({ name: 'scan_fallback_used', properties: { query_length: 9, results: 2 } })
    expect(JSON.stringify(readLocalEvents('u1'))).not.toContain('light red')
    await user.click(within(items[0]!).getByRole('link', { name: 'Sample Red 1' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Sample Red 1' })).toBeInTheDocument()
  })

  it('says kindly when nothing matches, and points to the full list', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/scan')
    render(<App demo />)
    await user.type(await screen.findByLabelText('Bottle name or description'), 'zzzz{enter}')
    expect(await screen.findByText('No bottles match')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'browse every bottle' })).toHaveAttribute('href', '/shelf/add')
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ query_length: 4, results: 0 })
  })

  it('ignores an empty search', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/scan')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Find it' }))
    expect(eventNames()).toEqual([])
    expect(screen.queryByText('No bottles match')).not.toBeInTheDocument()
  })
})

describe('concept previews', () => {
  it('the Ideas page lists all six, each labelled as a concept preview', async () => {
    seedPerson({ age: true })
    open('/ideas')
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Ideas we’re testing' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(within(main).getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/ideas/'))).toHaveLength(6)
    expect(within(main).getAllByText('Concept preview').length).toBeGreaterThanOrEqual(6)
    expect(within(main).getByText(/Nothing here works yet/)).toBeInTheDocument()
  })

  it.each(CONCEPTS.map((c) => [c.id, c.title] as const))('%s is clearly bannered, inert, and logs one view', async (id, title) => {
    seedPerson({ age: true })
    open(`/ideas/${id}`)
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(title) })).toBeInTheDocument()
    const main = screen.getByRole('main')
    // The banner is the first thing, and says plainly that nothing works.
    expect(within(main).getByText('Concept preview')).toBeInTheDocument()
    expect(within(main).getByText(/This isn’t built yet/)).toBeInTheDocument()
    // Nothing on a concept screen can be pressed or typed into, so nothing pretends to work.
    expect(within(main).queryAllByRole('button')).toEqual([])
    expect(within(main).queryAllByRole('textbox')).toEqual([])
    expect(within(main).queryAllByRole('checkbox')).toEqual([])
    // The view is logged by an effect that can land just after the heading shows, so wait for it.
    await waitFor(() => expect(readLocalEvents('u1').filter((e) => e.name === 'concept_screen_viewed')).toEqual([expect.objectContaining({ properties: { screen: id } })]))
  })

  it('shows real catalog data where it helps: budget counts follow the price thresholds', async () => {
    seedPerson({ age: true })
    open('/ideas/budget')
    render(<App demo />)
    await screen.findByRole('heading', { level: 1, name: /Stay on budget/ })
    const rows = within(screen.getByRole('main')).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Under $15'),
      expect.stringContaining('$15 to $30'),
      expect.stringContaining('Over $30'),
    ])
    const counts = rows.map((r) => Number(/(\d+) bottle/.exec(within(r).getByText(/\d+ bottles?/).textContent!)![1]))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10)
  })

  it('store finder, host card and "more from this producer" use the placeholder bottles', async () => {
    seedPerson({ age: true })
    open('/ideas/store-finder')
    const first = render(<App demo />)
    expect(await screen.findByText('Usually sold at')).toBeInTheDocument()
    expect(screen.getByText('Wine shops')).toBeInTheDocument()
    first.unmount()

    open('/ideas/host-card')
    const second = render(<App demo />)
    expect(await screen.findByText('Tonight we’re pouring')).toBeInTheDocument()
    expect(screen.getByText(/calms down spicy food/)).toBeInTheDocument()
    second.unmount()

    open('/ideas/more-from-producer')
    render(<App demo />)
    expect(await screen.findByText('More from Placeholder Cellars')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getAllByRole('listitem')).toHaveLength(3)
  })

  it('an unknown idea is handled kindly', async () => {
    seedPerson({ age: true })
    open('/ideas/toString')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'We couldn’t find that idea' })).toBeInTheDocument()
  })
})

describe('navigation to the new screens', () => {
  it('Home links to scanning and to the ideas, and the menu has Scan', async () => {
    seedPerson({ age: true })
    render(<App demo />)
    expect(await screen.findByRole('link', { name: 'Scan or search for a bottle' })).toHaveAttribute('href', '/scan')
    expect(screen.getByRole('link', { name: 'See the concept previews' })).toHaveAttribute('href', '/ideas')
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Scan' })).toHaveAttribute('href', '/scan')
  })
})
