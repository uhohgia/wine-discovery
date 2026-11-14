import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/ui'
import { useWd } from '@/data/WdContext'
import { isEmptyProfile } from '@/lib/profile'
import { usePageTitle } from '@/lib/usePageTitle'

/** Shown once after the first sign-in. An honor-system confirmation, remembered in the person's profile. */
export default function AgeGate() {
  usePageTitle('Are you 21 or older?')
  const { status, profile, confirmAge } = useWd()
  const { signOut } = useAuth()
  const [declined, setDeclined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading') {
    return (
      <p role="status" className="p-6 text-center text-muted">
        One moment…
      </p>
    )
  }
  // Once confirmed, new people go straight to the quiz; anyone who already has a profile goes home.
  if (profile.ageConfirmedAt) return <Navigate to={isEmptyProfile(profile.prefs) ? '/quiz' : '/'} replace />

  if (declined) {
    return (
      <div className="px-4 pt-8">
        <h1 className="text-3xl">Thanks for checking in</h1>
        <p className="mt-3 text-lg text-muted">Wine Discovery is for people 21 and over, so we can’t show you anything yet. We didn’t save anything about this answer.</p>
        <Button variant="secondary" className="mt-6 w-full" onClick={signOut}>
          Sign out
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setDeclined(false)}>
          I tapped the wrong one
        </Button>
      </div>
    )
  }

  const yes = async () => {
    setError(null)
    setBusy(true)
    try {
      await confirmAge() // the redirect above takes over once this is saved
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pt-8">
      <h1 className="text-3xl">Before we start</h1>
      <p className="mt-3 text-lg text-muted">Wine Discovery is for people 21 and over. Are you 21 or older?</p>
      {error && (
        <div className="mt-4">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      <Button className="mt-8 w-full" onClick={yes} disabled={busy}>
        Yes, I’m 21 or older
      </Button>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => setDeclined(true)} disabled={busy}>
        No
      </Button>
    </div>
  )
}
