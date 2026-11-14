import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isValidEmail, MIN_PASSWORD, useAuth } from '@/auth/AuthProvider'
import { Footer } from '@/components/Footer'
import { GlassIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'

type View = 'sign-in' | 'sign-up' | 'forgot' | 'confirm-email' | 'reset-sent'

const inputClass = 'mt-2 min-h-12 w-full rounded-xl border-2 border-edge bg-card px-4 text-lg placeholder:text-muted/70 focus:border-wine'

export default function SignIn() {
  const { mode, status, signUp, signIn, resendConfirmation, sendPasswordReset } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState<View>((location.state as { view?: View } | null)?.view ?? 'sign-up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  usePageTitle(view === 'sign-up' ? 'Create account' : view === 'forgot' || view === 'reset-sent' ? 'Reset password' : 'Sign in')

  if (status === 'signed-in') return <Navigate to="/" replace />

  const go = (next: View) => {
    setView(next)
    setError(null)
    setNotice(null)
  }

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      if (view === 'sign-up') {
        const result = await signUp(email, password)
        if (result === 'confirm-email') setView('confirm-email')
        else navigate('/', { replace: true })
      } else {
        await signIn(email, password)
        navigate('/', { replace: true })
      }
    })
  }

  const submitForgot = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      if (!isValidEmail(email)) throw new Error('Please enter a valid email address, like you@example.com.')
      await sendPasswordReset(email)
      setView('reset-sent')
    })
  }

  const creating = view === 'sign-up'
  const problemHint = error ? 'form-error' : undefined

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-wine text-white [&>svg]:size-7">
          <GlassIcon />
        </span>
        <span className="font-display text-xl font-semibold">Wine Discovery</span>
      </div>

      {view === 'confirm-email' && (
        <section aria-live="polite">
          <h1 className="text-3xl">Check your email</h1>
          <p className="mt-3 text-lg text-muted">
            We sent a confirmation link to <strong className="text-ink">{email.trim().toLowerCase()}</strong>. Tap it, then come back and sign in.
          </p>
          {error && (
            <p role="alert" className="mt-4 font-medium text-red-800">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-4 font-medium text-ok">
              {notice}
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-6 w-full"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await resendConfirmation(email)
                setNotice('Sent again. Check your inbox and spam folder.')
              })
            }
          >
            Send it again
          </Button>
          <Button className="mt-3 w-full" onClick={() => go('sign-in')}>
            Go to sign in
          </Button>
        </section>
      )}

      {view === 'reset-sent' && (
        <section aria-live="polite">
          <h1 className="text-3xl">Check your email</h1>
          <p className="mt-3 text-lg text-muted">
            If there’s an account for <strong className="text-ink">{email.trim().toLowerCase()}</strong>, we’ve sent a link to choose a new password.
          </p>
          <Button className="mt-6 w-full" onClick={() => go('sign-in')}>
            Back to sign in
          </Button>
        </section>
      )}

      {view === 'forgot' && (
        <form onSubmit={submitForgot} noValidate>
          <h1 className="text-3xl">Reset your password</h1>
          <p className="mt-3 text-lg text-muted">Enter your email and we’ll send you a link to choose a new one.</p>
          <label htmlFor="email" className="mt-8 block font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={problemHint}
            placeholder="you@example.com"
            className={inputClass}
          />
          {error && (
            <p id="form-error" role="alert" className="mt-2 font-medium text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-6 w-full" disabled={busy}>
            Send reset link
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => go('sign-in')}>
            Back to sign in
          </Button>
        </form>
      )}

      {(view === 'sign-in' || view === 'sign-up') && (
        <form onSubmit={submit} noValidate>
          <h1 className="text-3xl">{creating ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-3 text-lg text-muted">
            {creating ? 'Find wines you’ll actually like, in plain language.' : 'Sign in to pick up where you left off.'}
          </p>

          {mode === 'demo' && (
            <div className="mt-5 rounded-2xl border border-flag-ring bg-flag-bg p-3 text-flag-text">
              <p className="font-semibold">Demo mode</p>
              <p className="text-sm">Accounts live only on this device and passwords aren’t checked.</p>
            </div>
          )}

          <label htmlFor="email" className="mt-8 block font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={problemHint}
            placeholder="you@example.com"
            className={inputClass}
          />

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-3">
            <label htmlFor="password" className="font-semibold">
              Password
            </label>
            <button
              type="button"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-wine hover:bg-sand"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={creating ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={[creating ? 'password-hint' : '', problemHint ?? ''].filter(Boolean).join(' ') || undefined}
            className="mt-0 min-h-12 w-full rounded-xl border-2 border-edge bg-card px-4 text-lg focus:border-wine"
          />
          {creating && (
            <p id="password-hint" className="mt-1 text-sm text-muted">
              At least {MIN_PASSWORD} characters.
            </p>
          )}

          {error && (
            <p id="form-error" role="alert" className="mt-3 font-medium text-red-800">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={busy}>
            {busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
          </Button>

          {!creating && mode === 'account' && (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => go('forgot')}>
              Forgot your password?
            </Button>
          )}
          <p className="mt-6 text-center text-muted">
            {creating ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => go(creating ? 'sign-in' : 'sign-up')}
              className="min-h-11 font-semibold text-wine underline"
            >
              {creating ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      )}
      <Footer />
    </main>
  )
}
