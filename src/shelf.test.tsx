import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { readLocalEvents } from './data/localWdRepo'
import { eventNames, seedPerson } from './test-helpers'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

const open = (path: string) => window.history.pushState({}, '', path)
const BRIGHT = { type: ['red'], body: ['skim'], fruit: ['strawberry'], fruitStyle: ['fresh'], scent: ['roses'] }

describe('My shelf', () => {
  it('starts empty, with a friendly way to add bottles', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/shelf')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Your shelf is empty' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Add bottles' }))
    expect(await screen.findByRole('heading', { name: 'Add bottles' })).toBeInTheDocument()
    expect(screen.getByText('10 bottles')).toBeInTheDocument()
  })

  it('searches by name or description, adds a bottle as bought or gift, and shows it on the shelf', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/shelf/add')
    render(<App demo />)
    await user.type(await screen.findByLabelText('Search the catalog'), 'light red')
    expect(await screen.findByText('2 bottles')).toBeInTheDocument()
    const first = screen.getAllByRole('listitem')[0]!
    expect(within(first).getByRole('link', { name: 'Sample Red 1' })).toBeInTheDocument()

    await user.click(within(first).getByRole('button', { name: /I bought it/ }))
    expect(await screen.findByText('Added Sample Red 1 to your shelf.')).toBeInTheDocument()
    expect(within(first).getByText('On your shelf')).toBeInTheDocument()
    expect(within(first).queryByRole('button', { name: /I bought it/ })).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search the catalog'))
    await user.type(screen.getByLabelText('Search the catalog'), 'bubbly')
    await user.click(await screen.findByRole('button', { name: /It was a gift/ }))
    expect(await screen.findByText('Added Sample Bubbly 1 to your shelf.')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '← My shelf' }))
    expect(await screen.findByText('2 bottles at home')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Sample Bubbly 1')
    expect(items[0]).toHaveTextContent('Gift')
    expect(items[1]).toHaveTextContent('Sample Red 1')
    expect(items[1]).toHaveTextContent('Bought')
  })

  it('says so, kindly, when nothing matches', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    open('/shelf/add')
    render(<App demo />)
    await user.type(await screen.findByLabelText('Search the catalog'), 'zzzz')
    expect(await screen.findByText('No bottles match')).toBeInTheDocument()
    expect(screen.getByText(/try fewer words/i)).toBeInTheDocument()
  })

  it('keeps each person’s shelf to themselves', async () => {
    seedPerson({ age: true, shelf: [{ bottleId: 'sample-red-2', source: 'bought' }] })
    localStorage.setItem('wd:demo-users', JSON.stringify({ 'gia@example.com': { id: 'u1', email: 'gia@example.com', display_name: 'gia' }, 'other@example.com': { id: 'u2', email: 'other@example.com', display_name: 'other' } }))
    localStorage.setItem('wd:session', 'u2')
    localStorage.setItem('wd:demo:u2:profile', JSON.stringify({ prefs: {}, ratingCount: 0, ageConfirmedAt: '2026-11-08T00:00:00Z' }))
    open('/shelf')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Your shelf is empty' })).toBeInTheDocument()
  })

  it('home shows how many bottles are at home', async () => {
    seedPerson({ age: true, shelf: [{ bottleId: 'sample-red-2', source: 'bought' }, { bottleId: 'sample-white-1', source: 'gift' }] })
    render(<App demo />)
    expect(await screen.findByText('2 bottles at home')).toBeInTheDocument()
  })
})

describe('Wine card', () => {
  it('shows everything about the bottle in plain words', async () => {
    seedPerson({ quiz: BRIGHT })
    open('/bottle/sample-red-1')
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sample Red 1' })).toBeInTheDocument()
    expect(screen.getByText(/Placeholder Cellars · 2022/)).toBeInTheDocument()
    expect(screen.getByText('Mid-range, about $14'.replace('Mid-range', 'Easy on the wallet'))).toBeInTheDocument() // price feel in words, for screen readers
    expect(screen.getByText('Sample bottle')).toBeInTheDocument()

    // The four scales with their everyday analogies.
    expect(screen.getByRole('group', { name: /Body/ })).toHaveTextContent('closest to Skim milk')
    expect(screen.getByRole('group', { name: /Sweetness/ })).toHaveTextContent('closest to Black coffee')
    expect(screen.getByRole('group', { name: /Zing/ })).toHaveTextContent('closest to Lemon water')
    expect(screen.getByRole('group', { name: /Dry, grippy feel/ })).toHaveTextContent('closest to Green tea')

    // Will you like it: a label and a plain-language why.
    expect(screen.getByText('A good bet')).toBeInTheDocument()
    expect(screen.getByText(/just the way you like it/)).toBeInTheDocument()

    // 2 to 3 pairings, a serving tip, and one thing to say.
    const pairings = within(screen.getByRole('region', { name: 'Good with' })).getAllByRole('listitem')
    expect(pairings.map((li) => li.textContent)).toEqual(['Pizza', 'Roast chicken', 'Burgers'])
    expect(screen.getByText(/Pop it in the fridge/)).toBeInTheDocument()
    expect(screen.getByText(/ask you to think too hard/)).toBeInTheDocument()
  })

  it('a clashing bottle is "A stretch", and says why honestly', async () => {
    seedPerson({ quiz: BRIGHT })
    open('/bottle/sample-red-3')
    render(<App demo />)
    expect(await screen.findByText('A stretch')).toBeInTheDocument()
    expect(screen.getByText(/full-bodied and jammy, and you like lighter wines/)).toBeInTheDocument()
  })

  it('before the quiz it says it can’t guess, and invites the quiz', async () => {
    seedPerson({ age: true })
    open('/bottle/sample-red-1')
    render(<App demo />)
    expect(await screen.findByText(/we don’t know your taste yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Take the quiz' })).toBeInTheDocument()
    expect(screen.queryByText('A good bet')).not.toBeInTheDocument()
  })

  it('tap a word to see what it means, tap again to close', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: BRIGHT })
    open('/bottle/sample-red-1')
    render(<App demo />)
    const flavors = await screen.findByRole('list', { name: 'Flavors' })
    const chip = within(flavors).getByRole('button', { name: 'Strawberry & cranberry' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Bright red fruit flavors/)).toBeInTheDocument()
    await user.click(chip)
    expect(screen.queryByText(/Bright red fruit flavors/)).not.toBeInTheDocument()

    const words = screen.getByRole('list', { name: 'Wine words' })
    const grip = within(words).getByRole('button', { name: 'Dry, grippy feel' })
    await user.click(grip)
    // The meaning appears in a polite live region tied to the word, so screen readers announce it.
    const panel = document.getElementById(grip.getAttribute('aria-controls')!)!
    expect(panel).toHaveTextContent(/strong black tea leaves on your tongue/)
    expect(panel).toHaveTextContent(/Also called “tannin”/)
  })

  it('adds to the shelf as bought or gift, and removes again', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: BRIGHT })
    open('/bottle/sample-white-1')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: /it was a gift/i }))
    expect(await screen.findByRole('heading', { name: 'On your shelf' })).toBeInTheDocument()
    expect(screen.getByText(/You got this as a gift/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove from my shelf' }))
    expect(await screen.findByRole('heading', { name: 'Have it at home?' })).toBeInTheDocument()
  })

  it('logs one wine_card_viewed per visit, even after the shelf changes', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: BRIGHT })
    open('/bottle/sample-white-1')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: /i bought it/i }))
    await screen.findByRole('heading', { name: 'On your shelf' })
    await waitFor(() => expect(eventNames().filter((n) => n === 'wine_card_viewed')).toHaveLength(1))
    expect(readLocalEvents('u1').find((e) => e.name === 'wine_card_viewed')!.properties).toEqual({ bottle_id: 'sample-white-1', on_shelf: false })
  })

  it('handles a bottle that doesn’t exist', async () => {
    seedPerson({ age: true })
    open('/bottle/nope')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'We couldn’t find that bottle' })).toBeInTheDocument()
  })
})

describe('navigation', () => {
  it('has Home, My shelf and My taste, and marks where you are', async () => {
    seedPerson({ age: true })
    open('/shelf')
    render(<App demo />)
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'My shelf' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: 'My taste' })).toBeInTheDocument()
  })
})
