import { render, screen, within } from '@testing-library/react'
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
const LEMONADE_FAN = { type: ['white'], acidity: ['lemonade'], body: ['skim'], fruitStyle: ['fresh'] }
const stored = <T,>(key: string): T => JSON.parse(localStorage.getItem(key)!)

describe('Rate screen', () => {
  it('asks how it was, with three friendly choices and no "Not sure"', async () => {
    seedPerson({ quiz: LEMONADE_FAN })
    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    expect(await screen.findByRole('heading', { level: 1, name: 'How was Sample White 1?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Loved it' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'It was fine' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Not for me' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Not sure' })).not.toBeInTheDocument()
    expect(screen.getByText(/No wrong answers/)).toBeInTheDocument()
  })

  it('asks for a choice before saving, kindly', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: LEMONADE_FAN })
    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Save my rating' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/pick how it was first/i)
    expect(readLocalEvents('u1')).toEqual([])
  })

  it('"Loved it" saves, says something warm, and teaches the profile', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: { type: ['red'], body: ['2pct'] } })
    open('/bottle/sample-red-3/rate')
    render(<App demo />)
    await user.click(await screen.findByRole('radio', { name: 'Loved it' }))
    expect(screen.queryByText(/What didn’t you like/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save my rating' }))
    expect(await screen.findByText('Great! We’ll look for more wines like this one.')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'See my taste profile' }))
    expect(await screen.findByText('Based on 1 rating, so more bottles will sharpen this.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^Body/ })).toHaveTextContent(/closest to Whole milk|closest to 2% milk/) // pulled from 2% toward whole (1.35)

    expect(stored<unknown[]>('wd:demo:u1:ratings')).toHaveLength(1)
    expect(eventNames()).toEqual(['rating_saved'])
    expect(readLocalEvents('u1')[0]!.properties).toEqual({ bottle_id: 'sample-red-3', verdict: 'loved', reasons_count: 0 })
  })

  it('"Not for me" asks why, with every reason from the brief plus "Not sure"', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: LEMONADE_FAN })
    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    await user.click(await screen.findByRole('radio', { name: 'Not for me' }))
    expect(screen.getByText('Not your style? That helps us too')).toBeInTheDocument()
    const reasons = ['Too dry', 'Too sharp or sour', 'Too heavy', 'Too sweet', 'Mouth-drying or bitter', 'Too light or watery', 'Didn’t like the flavor', 'Not sure']
    for (const r of reasons) expect(screen.getByRole('checkbox', { name: r })).toBeInTheDocument()
    // Choosing another answer hides the question and forgets the reasons.
    await user.click(screen.getByRole('checkbox', { name: 'Too heavy' }))
    await user.click(screen.getByRole('radio', { name: 'It was fine' }))
    expect(screen.queryByText(/What didn’t you like/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Not for me' }))
    expect(screen.getByRole('checkbox', { name: 'Too heavy' })).not.toBeChecked()
  })

  it('"Not for me: too sharp" confirms warmly, changes the profile, and logs both events', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: LEMONADE_FAN, ratings: [] })
    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    await user.click(await screen.findByRole('radio', { name: 'Not for me' }))
    await user.click(screen.getByRole('checkbox', { name: 'Too sharp or sour' }))
    await user.click(screen.getByRole('button', { name: 'Save my rating' }))
    expect(await screen.findByText('Good to know. We’ll steer away from sharp wines.')).toBeInTheDocument()

    expect(eventNames()).toEqual(['rating_saved', 'dislike_reason_selected'])
    expect(readLocalEvents('u1').map((e) => e.properties)).toEqual([
      { bottle_id: 'sample-white-1', verdict: 'not-for-me', reasons_count: 1 },
      { bottle_id: 'sample-white-1', reason: 'too-sharp' },
    ])

    // The profile visibly moved: from "Lemonade" toward "Lemon water".
    await user.click(screen.getByRole('link', { name: 'See my taste profile' }))
    expect(await screen.findByRole('group', { name: /^Zing/ })).toHaveTextContent(/closest to Lemon water/)
  })

  it('"Not sure" is logged but changes nothing', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: LEMONADE_FAN })
    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    const before = localStorage.getItem('wd:demo:u1:profile')
    await user.click(await screen.findByRole('radio', { name: 'Not for me' }))
    await user.click(screen.getByRole('checkbox', { name: 'Not sure' }))
    await user.click(screen.getByRole('button', { name: 'Save my rating' }))
    expect(await screen.findByText('Not your style? That helps us too. We’ve noted it.')).toBeInTheDocument()
    expect(readLocalEvents('u1').at(-1)!.properties).toEqual({ bottle_id: 'sample-white-1', reason: 'not-sure' })
    const after = stored<{ prefs: unknown; ratingCount: number }>('wd:demo:u1:profile')
    expect(after.prefs).toEqual((JSON.parse(before!) as { prefs: unknown }).prefs)
    expect(after.ratingCount).toBe(1) // it still counts as a rating
  })

  it('rating the same bottle again keeps both ratings, and shows the last one', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: LEMONADE_FAN, shelf: [{ bottleId: 'sample-white-1', source: 'bought' }], ratings: [{ bottleId: 'sample-white-1', verdict: 'not-for-me', reasons: ['too-sharp'] }] })
    open('/bottle/sample-white-1')
    render(<App demo />)
    expect(await screen.findByText(/You said:/)).toHaveTextContent('Not for me')
    await user.click(screen.getByRole('link', { name: 'Rate it again' }))
    expect(await screen.findByText(/Last time you said/)).toHaveTextContent('Not for me')
    await user.click(screen.getByRole('radio', { name: 'Loved it' }))
    await user.click(screen.getByRole('button', { name: 'Save my rating' }))
    await screen.findByText(/Thanks for rating/)
    expect(stored<unknown[]>('wd:demo:u1:ratings')).toHaveLength(2)
    await user.click(screen.getByRole('link', { name: /Back to Sample White 1/ }))
    expect(await screen.findByText(/You said:/)).toHaveTextContent('Loved it')
  })

  it('the shelf shows the latest rating next to bought or gift', async () => {
    seedPerson({ quiz: LEMONADE_FAN, shelf: [{ bottleId: 'sample-white-1', source: 'gift' }, { bottleId: 'sample-red-1', source: 'bought' }], ratings: [{ bottleId: 'sample-white-1', verdict: 'fine' }, { bottleId: 'sample-white-1', verdict: 'loved' }] })
    open('/shelf')
    render(<App demo />)
    const items = await screen.findAllByRole('listitem')
    const white = items.find((li) => within(li).queryByRole('link', { name: 'Sample White 1' }))!
    expect(white).toHaveTextContent('Gift')
    expect(white).toHaveTextContent('Loved it')
    expect(white).not.toHaveTextContent('It was fine')
    const red = items.find((li) => within(li).queryByRole('link', { name: 'Sample Red 1' }))!
    expect(red).not.toHaveTextContent(/Loved it|It was fine|Not for me/)
  })

  it('handles a bottle that doesn’t exist', async () => {
    seedPerson({ age: true })
    open('/bottle/nope/rate')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'We couldn’t find that bottle' })).toBeInTheDocument()
  })
})

describe('ratings and recommendations', () => {
  it('a "not for me" rating visibly changes what the next recommendation says', async () => {
    const user = userEvent.setup()
    // A lemonade fan with a zippy white on the shelf.
    seedPerson({ quiz: LEMONADE_FAN, shelf: [{ bottleId: 'sample-white-1', source: 'bought' }] })
    open('/eat/seafood')
    const first = render(<App demo />)
    const before = (await screen.findAllByRole('listitem'))[0]!.textContent!
    expect(before).toMatch(/It’s light and zippy, like you like/)
    first.unmount()

    open('/bottle/sample-white-1/rate')
    render(<App demo />)
    await user.click(await screen.findByRole('radio', { name: 'Not for me' }))
    await user.click(screen.getByRole('checkbox', { name: 'Too sharp or sour' }))
    await user.click(screen.getByRole('button', { name: 'Save my rating' }))
    await screen.findByText('Good to know. We’ll steer away from sharp wines.')
    await user.click(screen.getByRole('link', { name: 'What are we eating next?' }))
    await user.click(await screen.findByRole('link', { name: /Seafood/ }))
    const after = (await screen.findAllByRole('listitem'))[0]!.textContent!
    // "zippy" is no longer something this person is described as liking.
    expect(after).not.toMatch(/zippy, like you like|light and zippy/)
    expect(after).not.toBe(before)
  })

  it('retaking the quiz keeps what ratings taught the app', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: { type: ['red'], body: ['skim'] }, ratings: [{ bottleId: 'sample-red-3', verdict: 'loved' }] })
    open('/quiz')
    render(<App demo />)
    await screen.findByRole('heading', { name: 'What do you usually reach for?' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(await screen.findByRole('radio', { name: 'Skim' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(await screen.findByRole('button', { name: 'Show me wines now' }))
    expect(await screen.findByText('Based on 1 rating, so more bottles will sharpen this.')).toBeInTheDocument()
    // A fresh Skim answer alone would read "Skim milk"; the loved full-bodied red pulled it up to 2% milk.
    expect(screen.getByRole('group', { name: /^Body/ })).toHaveTextContent(/closest to 2% milk/)
  })
})
