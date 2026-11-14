import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MIN_PASSWORD, useAuth } from '@/auth/AuthProvider'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'

/** Where the "reset your password" email link lands. The link signs the person in briefly so they can choose a new password. */
export default function ResetPassword() {
  usePageTitle('Choose a new password')
  const { status, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading') {
    return (
      <p role="status" className="grid min-h-dvh place-items-center text-muted">
        One moment…
      </p>
    )
  }

  if (status === 'signed-out') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
        <h1 className="text-3xl">This link has expired</h1>
        <p className="mt-3 text-lg text-muted">Reset links only work once, for a short time. Request a new one from the sign-in page.</p>
        <Link to="/sign-in" className="mt-6 inline-flex min-h-12 items-center font-semibold text-wine underline">
          Go to sign in
        </Link>
      </main>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) return setError(`Choose a password with at least ${MIN_PASSWORD} characters.`)
    if (password !== confirm) return setError('Those passwords don’t match.')
    setBusy(true)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-10">
      <form onSubmit={submit} noValidate>
        <h1 className="text-3xl">Choose a new password</h1>
        <label htmlFor="new-password" className="mt-8 block font-semibold">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="new-password-hint"
          className="mt-2 min-h-12 w-full rounded-xl border-2 border-edge bg-card px-4 text-lg focus:border-wine"
        />
        <p id="new-password-hint" className="mt-1 text-sm text-muted">
          At least {MIN_PASSWORD} characters.
        </p>
        <label htmlFor="confirm-password" className="mt-5 block font-semibold">
          Type it again
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border-2 border-edge bg-card px-4 text-lg focus:border-wine"
        />
        {error && (
          <p role="alert" className="mt-3 font-medium text-red-800">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          Save new password
        </Button>
      </form>
      <Footer />
    </main>
  )
}
