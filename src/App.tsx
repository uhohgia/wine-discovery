import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { SupabaseAuthProvider } from '@/auth/SupabaseAuthProvider'
import { AgeGuard } from '@/components/AgeGuard'
import { AppShell } from '@/components/AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedLayout } from '@/components/ProtectedLayout'
import { WdProvider } from '@/data/WdContext'
import type { WdRepo } from '@/data/wdRepo'
import type { LabelReader } from '@/lib/labelReader'
import { isCloudConfigured } from '@/lib/supabase'
import AddBottles from '@/pages/AddBottles'
import AgeGate from '@/pages/AgeGate'
import Concept from '@/pages/Concept'
import Eat from '@/pages/Eat'
import Ideas from '@/pages/Ideas'
import Home from '@/pages/Home'
import NotFound from '@/pages/NotFound'
import Quiz from '@/pages/Quiz'
import Rate from '@/pages/Rate'
import Scan from '@/pages/Scan'
import Shelf from '@/pages/Shelf'
import SignIn from '@/pages/SignIn'
import TasteProfile from '@/pages/TasteProfile'
import WineCard from '@/pages/WineCard'
import You from '@/pages/You'

const ResetPassword = lazy(() => import('@/pages/ResetPassword'))

function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center text-muted">
      One moment…
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedLayout />}>
          <Route element={<AppShell />}>
            <Route path="age" element={<AgeGate />} />
            <Route element={<AgeGuard />}>
              <Route index element={<Home />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="profile" element={<TasteProfile />} />
              <Route path="eat/:id" element={<Eat />} />
              <Route path="you" element={<You />} />
              <Route path="scan" element={<Scan />} />
              <Route path="ideas" element={<Ideas />} />
              <Route path="ideas/:id" element={<Concept />} />
              <Route path="shelf" element={<Shelf />} />
              <Route path="shelf/add" element={<AddBottles />} />
              <Route path="bottle/:id" element={<WineCard />} />
              <Route path="bottle/:id/rate" element={<Rate />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

/**
 * Real Supabase accounts when the env vars are set (and not under test); otherwise device-only demo
 * accounts. Tests render with `demo` so they never touch the real project.
 */
export default function App({ demo = false, wdRepo, labelReader }: { demo?: boolean; wdRepo?: WdRepo; labelReader?: LabelReader | null }) {
  const Auth = !demo && isCloudConfigured() ? SupabaseAuthProvider : AuthProvider
  return (
    <Auth>
      <WdProvider repo={wdRepo} labelReader={labelReader}>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </WdProvider>
    </Auth>
  )
}
