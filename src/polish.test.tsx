import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { seedPerson } from './test-helpers'

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('moving between pages', () => {
  it('puts focus on the new page and scrolls to the top, so screen readers land in the right place', async () => {
    const user = userEvent.setup()
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    seedPerson({ age: true })
    render(<App demo />)
    await screen.findByRole('heading', { name: /^Hi / })
    expect(document.getElementById('main')).not.toHaveFocus() // not on the very first load
    await user.click(screen.getByRole('link', { name: 'My shelf' }))
    await screen.findByRole('heading', { name: 'Your shelf is empty' })
    expect(document.getElementById('main')).toHaveFocus()
    expect(scroll).toHaveBeenCalledWith(0, 0)
    scroll.mockRestore()
  })

  it('has a skip link and one main landmark that can take focus', async () => {
    seedPerson({ age: true })
    render(<App demo />)
    await screen.findByRole('heading', { name: /^Hi / })
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })
})

describe('being offline', () => {
  const setOnline = (value: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value })
    act(() => window.dispatchEvent(new Event(value ? 'online' : 'offline')))
  }

  it('says so kindly, and goes away when the connection returns', async () => {
    seedPerson({ age: true })
    render(<App demo />)
    await screen.findByRole('heading', { name: /^Hi / })
    expect(screen.queryByText('You’re offline')).not.toBeInTheDocument()
    setOnline(false)
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
    expect(screen.getByText(/may not load or save/)).toBeInTheDocument()
    setOnline(true)
    expect(screen.queryByText('You’re offline')).not.toBeInTheDocument()
  })
})

describe('when something unexpected breaks', () => {
  it('shows a calm message with a Reload button instead of a blank page', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const Boom = () => {
      throw new Error('boom')
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText(/wasn’t your fault/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByText(/not a sommelier/i)).toBeInTheDocument()
    quiet.mockRestore()
  })

  it('renders children normally when nothing breaks', () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All fine')).toBeInTheDocument()
  })
})
