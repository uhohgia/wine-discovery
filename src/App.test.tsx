import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { readLocalEvents } from './data/localWdRepo'
import { quizToProfile } from './lib/quiz'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

const USER = { id: 'u1', email: 'gia@example.com', display_name: 'gia' }

/** A signed-in person, optionally with age confirmed and a finished quiz. */
function seedPerson(opts: { age?: boolean; quiz?: Parameters<typeof quizToProfile>[0] } = {}) {
  localStorage.setItem('wd:demo-users', JSON.stringify({ [USER.email]: USER }))
  localStorage.setItem('wd:session', USER.id)
  if (opts.age || opts.quiz) {
    localStorage.setItem(
      'wd:demo:u1:profile',
      JSON.stringify({ prefs: opts.quiz ? quizToProfile(opts.quiz) : {}, ratingCount: 0, ageConfirmedAt: opts.age === false ? null : '2026-11-08T00:00:00Z' }),
    )
  }
}

const eventNames = () => readLocalEvents('u1').map((e) => e.name)

describe('accounts (demo mode)', () => {
  it('sends a signed-out visitor to sign-in, and creating an account leads to the age question', async () => {
    const user = userEvent.setup()
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email'), 'gia@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'correct-horse-9')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Before we start' })).toBeInTheDocument()
    expect(screen.getByText(/not a sommelier/i)).toBeInTheDocument()
    expect(screen.getByText(/enjoy responsibly/i)).toBeInTheDocument()
  })

  it('shows helpful errors: bad email, short password, unknown email', async () => {
    const user = userEvent.setup()
    render(<App demo />)
    await user.click(await screen.findByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'abcdefgh1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.clear(screen.getByLabelText('Password', { exact: true }))
    await user.type(screen.getByLabelText('Password', { exact: true }), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i)

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/don’t match/i)
  })
})

describe('21+ gate', () => {
  it('asks once, and saying no stores nothing and offers a way out', async () => {
    const user = userEvent.setup()
    seedPerson()
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Before we start' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'No' }))
    expect(await screen.findByRole('heading', { name: 'Thanks for checking in' })).toBeInTheDocument()
    expect(localStorage.getItem('wd:demo:u1:profile')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'I tapped the wrong one' }))
    expect(screen.getByRole('heading', { name: 'Before we start' })).toBeInTheDocument()
  })

  it('yes goes to the quiz, remembers the answer, and is never asked again', async () => {
    const user = userEvent.setup()
    seedPerson()
    const { unmount } = render(<App demo />)
    await user.click(await screen.findByRole('button', { name: /yes, i’m 21 or older/i }))
    expect(await screen.findByRole('heading', { name: 'What do you usually reach for?' })).toBeInTheDocument()
    unmount()

    window.history.pushState({}, '', '/')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Hi gia' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Before we start' })).not.toBeInTheDocument()
  })

  it('sends someone who skipped the gate back to it from any page', async () => {
    seedPerson()
    window.history.pushState({}, '', '/profile')
    render(<App demo />)
    expect(await screen.findByRole('heading', { name: 'Before we start' })).toBeInTheDocument()
  })
})

describe('taste quiz', () => {
  it('has 6 screens, with "Not sure" everywhere and "Show me wines now" only after screen 2', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    render(<App demo />)
    window.history.pushState({}, '', '/quiz')
    await user.click(await screen.findByRole('link', { name: 'Start the quiz' }))

    for (let i = 1; i <= 6; i++) {
      expect(await screen.findByText(`Question ${i} of 6`)).toBeInTheDocument()
      expect(screen.getAllByLabelText('Not sure').length).toBeGreaterThanOrEqual(1)
      const early = screen.queryByRole('button', { name: 'Show me wines now' })
      if (i <= 2 || i === 6) expect(early).not.toBeInTheDocument()
      else expect(early).toBeInTheDocument()
      if (i < 6) await user.click(screen.getByRole('button', { name: 'Next' }))
    }
    expect(screen.getByRole('button', { name: 'See my taste profile' })).toBeInTheDocument()
  })

  it('"Not sure" is exclusive with the other choices', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    window.history.pushState({}, '', '/quiz')
    render(<App demo />)
    const red = await screen.findByRole('checkbox', { name: 'Red wine' })
    const white = screen.getByRole('checkbox', { name: 'White wine' })
    const unsure = screen.getByRole('checkbox', { name: 'Not sure' })
    await user.click(red)
    await user.click(white)
    expect(red).toBeChecked()
    expect(white).toBeChecked()
    await user.click(unsure)
    expect(unsure).toBeChecked()
    expect(red).not.toBeChecked()
    await user.click(white)
    expect(white).toBeChecked()
    expect(unsure).not.toBeChecked()
  })

  it('finishing all six screens saves a profile and shows it in plain words', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    window.history.pushState({}, '', '/quiz')
    render(<App demo />)
    await screen.findByRole('heading', { name: 'What do you usually reach for?' })
    await user.click(screen.getByRole('checkbox', { name: 'Red wine' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Skim' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' })) // coffee and tea: skip both
    await user.click(screen.getByRole('checkbox', { name: 'Strawberry or cranberry' }))
    await user.click(screen.getByRole('radio', { name: /fresh and crisp/i }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('checkbox', { name: 'Roses' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Not sure' }))
    await user.click(screen.getByRole('button', { name: 'See my taste profile' }))

    expect(await screen.findByRole('heading', { name: 'Bright & Berry' })).toBeInTheDocument()
    expect(screen.getByText('You mostly reach for red. You like lighter, fresh, red-berry wines with a little floral.')).toBeInTheDocument()
    expect(screen.getByText(/based on your quiz answers/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /body/i })).toHaveTextContent(/closest to Skim milk/)
    expect(screen.getByRole('group', { name: /zing/i })).toHaveTextContent(/no preference yet/i)
    expect(eventNames()).toEqual(['quiz_started', 'quiz_completed'])
    expect(readLocalEvents('u1')[1]!.properties).toMatchObject({ steps_answered: 4 })
  })

  it('stopping after two screens still gives results, and records where they stopped', async () => {
    const user = userEvent.setup()
    seedPerson({ age: true })
    window.history.pushState({}, '', '/quiz')
    render(<App demo />)
    await screen.findByRole('heading', { name: 'What do you usually reach for?' })
    await user.click(screen.getByRole('checkbox', { name: 'White wine' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Whole' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(await screen.findByRole('button', { name: 'Show me wines now' }))

    expect(await screen.findByText('You mostly reach for white. You like fuller wines.')).toBeInTheDocument()
    expect(eventNames()).toEqual(['quiz_started', 'quiz_stopped_early'])
    expect(readLocalEvents('u1')[1]!.properties).toEqual({ at_step: 3, steps_answered: 2 })
  })

  it('"Edit my answers" reopens the quiz with the earlier answers filled in', async () => {
    const user = userEvent.setup()
    seedPerson({ quiz: { type: ['red'], body: ['whole'] } })
    window.history.pushState({}, '', '/profile')
    render(<App demo />)
    await user.click(await screen.findByRole('link', { name: 'Edit my answers' }))
    expect(await screen.findByRole('checkbox', { name: 'Red wine' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'White wine' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('radio', { name: 'Whole' })).toBeChecked()
    await waitFor(() => expect(readLocalEvents('u1')[0]?.properties).toEqual({ editing: true }))
  })

  it('an empty profile invites the quiz instead of showing blanks', async () => {
    seedPerson({ age: true })
    window.history.pushState({}, '', '/profile')
    render(<App demo />)
    expect(await screen.findByRole('link', { name: 'Take the quiz' })).toBeInTheDocument()
  })

  it('home shows the profile name once the quiz is done', async () => {
    seedPerson({ quiz: { body: ['skim'], fruit: ['strawberry'] } })
    render(<App demo />)
    const card = await screen.findByText('Your taste')
    expect(within(card.parentElement!).getByText('Bright & Berry')).toBeInTheDocument()
  })
})
