import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Footer } from './Footer'

/** If something unexpected breaks while drawing a screen, show a calm message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] a screen failed to draw:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 text-center">
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-3 text-lg text-muted">That wasn’t your fault. Reloading usually fixes it, and nothing you saved is lost.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mx-auto mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-wine px-6 text-base font-semibold text-white hover:bg-wine-dark"
        >
          Reload
        </button>
        <Footer />
      </div>
    )
  }
}
