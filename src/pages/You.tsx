import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Banner } from '@/components/Banner'
import { Button, Card, PageHeader } from '@/components/ui'
import { useWd } from '@/data/WdContext'
import { isEmptyProfile } from '@/lib/profile'
import { usePageTitle } from '@/lib/usePageTitle'

/** Account, your taste, and "Delete my data". */
export default function You() {
  usePageTitle('You')
  const { user, signOut, mode } = useAuth()
  const { profile, shelf, ratings, deleteMyData } = useWd()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLHeadingElement>(null)

  // When the "are you sure?" panel opens, move focus into it so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  const remove = async () => {
    setError(null)
    setBusy(true)
    try {
      await deleteMyData()
      navigate('/age', { replace: true }) // starts fresh: 21+ question, then the quiz
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Nothing was deleted. Please try again.')
      setBusy(false)
    }
  }

  const taken = !isEmptyProfile(profile.prefs)

  return (
    <>
      <PageHeader title="You" subtitle={user?.email} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-4">
        <Card>
          <h2 className="text-xl">Your taste</h2>
          <p className="mt-1 text-muted">{taken ? 'Your taste profile learns from the quiz and every rating.' : 'You haven’t taken the quick quiz yet.'}</p>
          <Link to={taken ? '/profile' : '/quiz'} className="mt-2 inline-flex min-h-11 items-center font-semibold text-wine underline">
            {taken ? 'See my taste profile' : 'Take the quiz'}
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl">Your data</h2>
          <p className="mt-1 text-muted">
            We keep your taste profile, your shelf ({shelf.length}), your ratings ({ratings.length}) and simple activity counts, like which screens you open. We don’t use any
            outside tracking, and we never sell anything.
          </p>
          {!confirming ? (
            <Button variant="danger" className="mt-4 w-full" onClick={() => setConfirming(true)}>
              Delete my data
            </Button>
          ) : (
            <section aria-labelledby="confirm-title" className="mt-4 rounded-2xl border-2 border-red-800 bg-red-50 p-4 text-red-950">
              <h3 id="confirm-title" ref={confirmRef} tabIndex={-1} className="text-xl outline-none">
                Delete everything?
              </h3>
              <p className="mt-1">
                This removes your taste profile, shelf, ratings and activity. You’ll start over with the 21+ question and the quiz. It can’t be undone.
              </p>
              <p className="mt-2 text-sm">
                {mode === 'account'
                  ? 'Your sign-in (email and password) stays. Deleting the sign-in account itself isn’t available in the app yet.'
                  : 'Everything is stored on this device only, and this clears it.'}
              </p>
              {error && (
                <div className="mt-3">
                  <Banner tone="error">{error}</Banner>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3">
                <Button variant="danger" onClick={remove} disabled={busy}>
                  {busy ? 'Deleting…' : 'Yes, delete my data'}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                  Keep my data
                </Button>
              </div>
            </section>
          )}
        </Card>

        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </>
  )
}
