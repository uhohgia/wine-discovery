import { ButtonLink } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl">We couldn’t find that page</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped.</p>
      <ButtonLink to="/" className="mt-6">
        Go to my journal
      </ButtonLink>
    </main>
  )
}
