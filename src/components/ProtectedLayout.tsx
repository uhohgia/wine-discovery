import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

/** Signed-out visitors are sent to sign-in; everyone else continues. */
export function ProtectedLayout() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center text-muted">
        One moment…
      </div>
    )
  }
  if (status === 'signed-out') return <Navigate to="/sign-in" state={{ from: location.pathname, view: 'sign-in' }} replace />
  return <Outlet />
}
