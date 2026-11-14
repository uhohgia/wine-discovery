import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createLocalWdRepo, readLocalEvents } from './data/localWdRepo'
import { seedPerson } from './test-helpers'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

const open = (path: string) => window.history.pushState({}, '', path)
const WITH_DATA = {
  quiz: { type: ['red'], body: ['skim'] },
  shelf: [{ bottleId: 'sample-red-1', source: 'bought' as const }, { bottleId: 'sample-white-1', source: 'gift' as const }],
  ratings: [{ bottleId: 'sample-red-1', verdict: 'loved' as const }],
}

describe('You', () => {
  it('shows the account, what we keep, and a way to sign out', async () => {
    const user = userEvent.setup()
    seedPerson(WITH_DATA)
    open('/you')
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: 'You' })).toBeInTheDocument()
    expect(screen.getByText('gia@example.com')).toBeInTheDocument()
    expect(screen.getByText(/your shelf \(2\), your ratings \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/We don’t use any\s+outside tracking/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See my taste profile' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!)
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })

  it('invites the quiz when it hasn’t been taken', async () => {
    seedPerson({ age: true })
    open('/you')
    render(<App demo />)
    expect(await screen.findByRole('link', { name: 'Take the quiz' })).toHaveAttribute('href', '/quiz')
  })

  it('asks "Delete everything?" first, puts focus on the question, and can be cancelled safely', async () => {
    const user = userEvent.setup()
    seedPerson(WITH_DATA)
    open('/you')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Delete my data' }))
    const heading = await screen.findByRole('heading', { name: 'Delete everything?' })
    expect(heading).toHaveFocus()
    expect(screen.getByText(/It can’t be undone/)).toBeInTheDocument()
    expect(screen.getByText(/stored on this device only/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep my data' }))
    expect(screen.queryByRole('heading', { name: 'Delete everything?' })).not.toBeInTheDocument()
    expect(localStorage.getItem('wd:demo:u1:profile')).not.toBeNull()
    expect(localStorage.getItem('wd:demo:u1:shelf')).not.toBeNull()
  })

  it('deleting removes the profile, shelf, ratings and activity, and starts fresh at the 21+ question', async () => {
    const user = userEvent.setup()
    seedPerson(WITH_DATA)
    localStorage.setItem('wd:demo:u1:events', JSON.stringify([{ name: 'quiz_started', properties: {}, created_at: 'x' }]))
    open('/you')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Delete my data' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my data' }))
    expect(await screen.findByRole('heading', { name: 'Before we start' })).toBeInTheDocument()
    for (const what of ['profile', 'shelf', 'ratings', 'events']) expect(localStorage.getItem(`wd:demo:u1:${what}`), what).toBeNull()
    // Still signed in, with nothing left: the shelf and taste are empty.
    expect(localStorage.getItem('wd:session')).toBe('u1')
    // Deleting is not itself logged.
    expect(readLocalEvents('u1')).toEqual([])
  })

  it('only deletes the person’s own data', async () => {
    const user = userEvent.setup()
    seedPerson(WITH_DATA)
    localStorage.setItem('wd:demo:u2:profile', JSON.stringify({ prefs: {}, ratingCount: 3, ageConfirmedAt: 'x' }))
    localStorage.setItem('wd:demo:u2:shelf', JSON.stringify([{ bottleId: 'sample-red-2', source: 'bought', addedOn: '2026-11-01' }]))
    open('/you')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Delete my data' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my data' }))
    await screen.findByRole('heading', { name: 'Before we start' })
    expect(localStorage.getItem('wd:demo:u2:profile')).not.toBeNull()
    expect(localStorage.getItem('wd:demo:u2:shelf')).not.toBeNull()
  })

  it('after deleting, the shelf and ratings are really empty when the person returns', async () => {
    const user = userEvent.setup()
    seedPerson(WITH_DATA)
    open('/you')
    const first = render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Delete my data' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my data' }))
    await screen.findByRole('heading', { name: 'Before we start' })
    first.unmount()
    const repo = createLocalWdRepo()
    expect(await repo.listShelf('u1')).toEqual([])
    expect(await repo.listRatings('u1')).toEqual([])
    expect(await repo.getProfile('u1')).toBeNull()
  })
})
