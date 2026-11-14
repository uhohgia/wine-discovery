import { Navigate, Outlet } from 'react-router-dom'
import { useWd } from '@/data/WdContext'
import { Button } from './ui'

/** Everything past the sign-in needs a confirmed 21+ answer. Loads the person's profile first. */
export function AgeGuard() {
  const { status, profile, reload } = useWd()

  if (status === 'loading') {
    return (
      <p role="status" aria-live="polite" className="p-6 text-center text-muted">
        One moment…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <div className="px-4 pt-8 text-center">
        <h1 className="text-2xl">We couldn’t load your profile</h1>
        <p className="mt-2 text-muted">Please check your connection and try again.</p>
        <Button className="mt-6" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }
  if (!profile.ageConfirmedAt) return <Navigate to="/age" replace />
  return <Outlet />
}
