import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useOnline } from '@/lib/useOnline'
import { Banner } from './Banner'
import { Footer } from './Footer'
import { GlassIcon } from './icons'

/** Page frame for signed-in screens. The full navigation arrives with the screens it links to. */
export function AppShell() {
  const { signOut } = useAuth()
  const online = useOnline()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  // A new page should start at the top, and screen readers should land on it instead of staying where the old page was.
  useEffect(() => {
    // Only when the path really changed (not on first load, and not when React runs effects twice in development).
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-wine focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-x-3 px-4 pt-4">
        <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-wine text-white [&>svg]:size-5">
            <GlassIcon />
          </span>
          Wine Discovery
        </Link>
        <button type="button" onClick={signOut} className="min-h-11 rounded-full px-4 font-semibold text-wine hover:bg-sand">
          Sign out
        </button>
      </header>
      <nav aria-label="Main" className="flex flex-wrap gap-x-1 px-2">
        {[
          { to: '/', label: 'Home', end: true },
          { to: '/scan', label: 'Scan', end: false },
          { to: '/shelf', label: 'My shelf', end: false },
          { to: '/profile', label: 'My taste', end: false },
          { to: '/you', label: 'You', end: false },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center border-b-4 px-3 font-semibold ${isActive ? 'border-wine text-wine' : 'border-transparent text-muted hover:text-ink'}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      {!online && (
        <div className="px-4 pt-3" role="status">
          <Banner tone="concept" title="You’re offline">
            Some things may not load or save until you’re back online.
          </Banner>
        </div>
      )}
      <main id="main" ref={main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
