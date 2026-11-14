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
const WHITE_FAN = { type: ['white'], body: ['skim'], acidity: ['lemonade'], fruit: ['lemon'], fruitStyle: ['fresh'] }
const SHELF = [
  { bottleId: 'sample-red-3', source: 'bought' as const },
  { bottleId: 'sample-white-2', source: 'gift' as const },
  { bottleId: 'sample-red-1', source: 'bought' as const },
]

describe('Home: what are you eating?', () => {
  it('shows 7 meals and 4 occasions as big tiles that link to their results', async () => {
    seedPerson({ age: true })
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'What are you eating?' })).toBeInTheDocument()
    const meals = within(screen.getByRole('list', { name: 'Meals' })).getAllByRole('link')
    const occasions = within(screen.getByRole('list', { name: 'Occasions' })).getAllByRole('link')
    expect(meals.map((a) => a.textContent)).toEqual([
      expect.stringContaining('BBQ & grilled meat'),
      expect.stringContaining('Pasta & tomato sauce'),
      expect.stringContaining('Cheese & cured meats'),
      expect.stringContaining('Seafood'),
      expect.stringContaining('Spicy takeout'),
      expect.stringContaining('Pizza'),
      expect.stringContaining('Salad & veggies'),
    ])
    expect(occasions.map((a) => a.textContent)).toEqual([
      expect.stringContaining('Dinner party'),
      expect.stringContaining('Date night'),
      expect.stringContaining('Weeknight'),
      expect.stringContaining('A gift'),
    ])
    expect(meals[0]).toHaveAttribute('href', '/eat/bbq')
    expect(occasions[3]).toHaveAttribute('href', '/eat/gift')
  })

  it('still invites the quiz first for someone who hasn’t taken it', async () => {
    seedPerson({ age: true })
    render(<App demo />)
    expect(await screen.findByRole('link', { name: 'Start the quiz' })).toBeInTheDocument()
  })
})

describe('ranked results', () => {
  it('ranks the shelf for a meal, best first, with a label and a plain-language why on each', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: WHITE_FAN, shelf: SHELF })
    render(<App demo />)
    await user.click(await screen.findByRole('link', { name: /Spicy takeout/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /Best bets for spicy takeout/ })).toBeInTheDocument()

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Sample White 2')
    expect(items[0]).toHaveTextContent('Best pick')
    expect(items[0]).toHaveTextContent('A touch of sweetness calms the heat.')
    expect(items.at(-1)).toHaveTextContent('Sample Red 3')
    for (const li of items) {
      expect(li).toHaveTextContent(/A good bet|Worth a try|A stretch/)
      expect(li.textContent).toMatch(/\.$/)
    }
    expect(items.at(-1)).toHaveTextContent('A stretch')
    expect(within(items[1]!).queryByText('Best pick')).not.toBeInTheDocument()
  })

  it('only ranks bottles that are on the shelf', async () => {
    seedPerson({ quiz: WHITE_FAN, shelf: [{ bottleId: 'sample-white-1', source: 'bought' }] })
    open('/eat/seafood')
    render(<App demo />)
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Sample White 1')
    expect(items[0]).toHaveTextContent('A good bet')
  })

  it('the same meal ranks differently for a different taste', async () => {
    // A big-red lover: the bottle that suits their taste now beats the textbook spicy-food pairing.
    seedPerson({ quiz: { type: ['red'], body: ['whole'], tannin: ['like'], fruitStyle: ['jammy'] }, shelf: SHELF })
    open('/eat/spicy-takeout')
    render(<App demo />)
    const items = await screen.findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Sample Red 3')
    expect(items.at(-1)).toHaveTextContent('Sample White 2')
    expect(items.at(-1)).toHaveTextContent('A stretch')
    // ...but it still explains that the pairing itself is a good one.
    expect(items.at(-1)).toHaveTextContent('A touch of sweetness calms the heat.')
    expect(items.at(-1)).toHaveTextContent(/It’s a white, and you usually reach for red/)
  })

  it('an empty shelf gets a friendly prompt, not a blank list', async () => {
    seedPerson({ quiz: WHITE_FAN })
    open('/eat/bbq')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Your shelf is empty' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add bottles' })).toHaveAttribute('href', '/shelf/add')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('before the quiz it ranks by the food alone, says so, and shows no confidence labels', async () => {
    seedPerson({ age: true, shelf: SHELF })
    open('/eat/spicy-takeout')
    render(<App demo />)
    const items = await screen.findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Sample White 2')
    expect(screen.getByText(/going by the food alone/i)).toBeInTheDocument()
    expect(screen.queryByText(/A good bet|Worth a try|A stretch/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Take the quick quiz/ })).toBeInTheDocument()
  })

  it('works for occasions too', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: WHITE_FAN, shelf: [{ bottleId: 'sample-bubbly-1', source: 'gift' }, { bottleId: 'sample-white-1', source: 'bought' }] })
    render(<App demo />)
    await user.click(await screen.findByRole('link', { name: /A gift/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /Best bets for a gift/ })).toBeInTheDocument()
    expect((await screen.findAllByRole('listitem'))[0]).toHaveTextContent('Sample Bubbly 1')
  })

  it('logs meal_selected once per visit, with what was picked', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: WHITE_FAN, shelf: SHELF })
    render(<App demo />)
    await user.click(await screen.findByRole('link', { name: /Seafood/ }))
    await screen.findByRole('heading', { level: 1, name: /Best bets for seafood/ })
    // The event is logged by an effect that can land just after the heading shows, so wait for it.
    await waitFor(() => expect(eventNames().filter((n) => n === 'meal_selected')).toHaveLength(1))
    expect(readLocalEvents('u1').find((e) => e.name === 'meal_selected')!.properties).toEqual({ kind: 'meal', id: 'seafood', shelf_size: 3 })
    await user.click(screen.getByRole('link', { name: /What are you eating\?/ }))
    await user.click(await screen.findByRole('link', { name: /Date night/ }))
    await screen.findByRole('heading', { level: 1, name: /Best bets for date night/ })
    await waitFor(() => expect(readLocalEvents('u1').filter((e) => e.name === 'meal_selected').map((e) => e.properties.id)).toEqual(['seafood', 'date-night']))
  })

  it('an unknown meal is handled kindly', async () => {
    seedPerson({ age: true })
    open('/eat/toString') // not inherited object keys, either
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'We couldn’t find that one' })).toBeInTheDocument()
  })
})
