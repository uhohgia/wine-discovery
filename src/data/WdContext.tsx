// Holds the signed-in person's Wine Discovery state (age confirmation, taste profile) for every screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { emptyProfile, type TasteProfile } from '@/lib/profile'
import { createFakeLabelReader } from '@/lib/fakeLabelReader'
import { createLabelReader, type LabelReader } from '@/lib/labelReader'
import { supabase } from '@/lib/supabase'
import { createLocalWdRepo } from './localWdRepo'
import { createSupabaseWdRepo } from './supabaseWdRepo'
import type { Bottle } from './bottles'
import { applyRating, replayRatings } from '@/lib/rating'
import type { DislikeReason, EventName, ShelfSource, Verdict } from './vocab'
import type { Rating, ShelfItem, WdProfileRow, WdRepo } from './wdRepo'

export interface WdValue {
  repo: WdRepo
  userId: string
  status: 'loading' | 'ready' | 'error'
  /** Always set once status is "ready"; a brand-new person has an empty profile and no age confirmation. */
  profile: WdProfileRow
  /** The whole catalog, and the person's shelf (newest first). Empty until status is "ready". */
  bottles: Bottle[]
  shelf: ShelfItem[]
  /** Every rating, oldest first. */
  ratings: Rating[]
  /** Reads a bottle's label from a photo. Null when the app isn't connected to Supabase (demo mode): Scan is then simulated. */
  labelReader: LabelReader | null
  reload(): void
  /** Deletes everything stored about the person (the sign-in account stays) and resets this screen's state. */
  deleteMyData(): Promise<void>
  /** Saves a rating, updates the taste profile, and returns the warm confirmation to show. */
  rateBottle(bottleId: string, verdict: Verdict, reasons: DislikeReason[]): Promise<string>
  addToShelf(bottleId: string, source: ShelfSource): Promise<void>
  removeFromShelf(bottleId: string): Promise<void>
  confirmAge(): Promise<void>
  saveQuizProfile(prefs: TasteProfile): Promise<void>
  track(name: EventName, properties?: Record<string, unknown>): void
}

const WdContext = createContext<WdValue | null>(null)

const NEW_PERSON: WdProfileRow = { prefs: emptyProfile(), ratingCount: 0, ageConfirmedAt: null }

/** Mounts the per-user state once someone is signed in. Pages outside the signed-in area never call useWd. */
/** `labelReader` is for tests: pass a fake reader, or null for "no photo scanning". Left out, the real one is used when signed in with Supabase. */
export function WdProvider({ children, repo, labelReader }: { children: ReactNode; repo?: WdRepo; labelReader?: LabelReader | null }) {
  const { user } = useAuth()
  if (!user) return <>{children}</>
  return (
    <WdInner key={user.id} userId={user.id} repoOverride={repo} readerOverride={labelReader}>
      {children}
    </WdInner>
  )
}

function WdInner({ userId, repoOverride, readerOverride, children }: { userId: string; repoOverride?: WdRepo; readerOverride?: LabelReader | null; children: ReactNode }) {
  const { mode } = useAuth()
  const repo = useMemo<WdRepo>(
    () => repoOverride ?? (mode === 'account' && supabase ? createSupabaseWdRepo(supabase) : createLocalWdRepo()),
    [repoOverride, mode],
  )
  const labelReader = useMemo<LabelReader | null>(
    () => {
      if (readerOverride !== undefined) return readerOverride
      // Photo scanning is switched off for now (Scan stays simulated). Set VITE_PHOTO_SCAN=1 to turn it back on.
      if (mode === 'account' && supabase && import.meta.env.VITE_PHOTO_SCAN === '1') return createLabelReader(supabase)
      // Development only (a constant that is false in the production build, so this is left out of it).
      return import.meta.env.DEV && import.meta.env.VITE_FAKE_SCAN === '1' ? createFakeLabelReader() : null
    },
    [readerOverride, mode],
  )
  const [state, setState] = useState<{ status: WdValue['status']; profile: WdProfileRow; bottles: Bottle[]; shelf: ShelfItem[]; ratings: Rating[] }>({
    status: 'loading',
    profile: NEW_PERSON,
    bottles: [],
    shelf: [],
    ratings: [],
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    Promise.all([repo.getProfile(userId), repo.listBottles(), repo.listShelf(userId), repo.listRatings(userId)]).then(
      ([row, bottles, shelf, ratings]) => live && setState({ status: 'ready', profile: row ?? NEW_PERSON, bottles, shelf, ratings }),
      () => live && setState((s) => ({ ...s, status: 'error' })),
    )
    return () => {
      live = false
    }
  }, [repo, userId, attempt])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const save = useCallback(
    async (patch: Parameters<WdRepo['saveProfile']>[1]) => {
      const row = await repo.saveProfile(userId, patch)
      setState((s) => ({ ...s, status: 'ready', profile: row }))
    },
    [repo, userId],
  )

  const value = useMemo<WdValue>(
    () => ({
      repo,
      userId,
      status: state.status,
      profile: state.profile,
      labelReader,
      reload,
      confirmAge: () => save({ ageConfirmedAt: new Date().toISOString() }),
      // Retaking the quiz starts from the new answers and re-applies every past rating on top.
      saveQuizProfile: (prefs) => save({ prefs: replayRatings(prefs, state.ratings, state.bottles), ratingCount: state.ratings.length }),
      ratings: state.ratings,
      deleteMyData: async () => {
        await repo.deleteMyData(userId)
        // Nothing to log: the point is that we keep nothing. The catalog stays; the person's own data is gone.
        setState((s) => ({ ...s, status: 'ready', profile: NEW_PERSON, shelf: [], ratings: [] }))
      },
      rateBottle: async (bottleId, verdict, reasons) => {
        const bottle = state.bottles.find((b) => b.id === bottleId)
        if (!bottle) throw new Error('We couldn’t find that bottle.')
        const rating = await repo.addRating(userId, { bottleId, verdict, reasons })
        try {
          const { profile: prefs, confirmation } = applyRating(state.profile.prefs, bottle, verdict, reasons)
          const row = await repo.saveProfile(userId, { prefs, ratingCount: state.ratings.length + 1 })
          setState((s) => ({ ...s, profile: row, ratings: [...s.ratings, rating] }))
          return confirmation
        } catch (e) {
          // No half-saved ratings: if the profile couldn't be updated, take the rating back out.
          await repo.removeRating(userId, rating.id).catch(() => undefined)
          throw e
        }
      },
      bottles: state.bottles,
      shelf: state.shelf,
      addToShelf: async (bottleId, source) => {
        await repo.addToShelf(userId, bottleId, source)
        const addedOn = new Date().toISOString().slice(0, 10)
        setState((s) => ({ ...s, shelf: [{ bottleId, source, addedOn }, ...s.shelf.filter((i) => i.bottleId !== bottleId)] }))
      },
      removeFromShelf: async (bottleId) => {
        await repo.removeFromShelf(userId, bottleId)
        setState((s) => ({ ...s, shelf: s.shelf.filter((i) => i.bottleId !== bottleId) }))
      },
      track: (name, properties) => {
        repo.recordEvent(userId, name, properties).catch(() => undefined)
      },
    }),
    [repo, userId, state, reload, save, labelReader],
  )

  return <WdContext.Provider value={value}>{children}</WdContext.Provider>
}

export function useWd(): WdValue {
  const ctx = useContext(WdContext)
  if (!ctx) throw new Error('useWd must be used inside the signed-in area')
  return ctx
}
