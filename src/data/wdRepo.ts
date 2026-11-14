// The one seam between screens and storage for Wine Discovery. Screens only talk to `WdRepo`.
// Real accounts use supabaseWdRepo; demo mode and tests use localWdRepo.
import type { TasteProfile } from '@/lib/profile'
import type { Bottle } from './bottles'
import type { DislikeReason, EventName, ShelfSource, Verdict } from './vocab'

/** The per-user profile row. `prefs` is empty until the quiz has been taken. */
export interface WdProfileRow {
  prefs: TasteProfile
  ratingCount: number
  /** When the person confirmed they are 21 or older, or null if they haven't yet. */
  ageConfirmedAt: string | null
}

export interface WdProfilePatch {
  prefs?: TasteProfile
  ratingCount?: number
  ageConfirmedAt?: string
}

/** One bottle the person has at home. */
export interface ShelfItem {
  bottleId: string
  source: ShelfSource
  /** YYYY-MM-DD */
  addedOn: string
}

/** One rating the person gave a bottle. People can rate the same bottle again; every rating is kept. */
export interface Rating {
  id: string
  bottleId: string
  verdict: Verdict
  reasons: DislikeReason[]
  /** ISO timestamp */
  createdAt: string
}

export interface NewRating {
  bottleId: string
  verdict: Verdict
  reasons: DislikeReason[]
}

export interface WdRepo {
  /** The whole bottle catalog (read-only for the app). */
  listBottles(): Promise<Bottle[]>
  /** The person's shelf, newest first. */
  listShelf(userId: string): Promise<ShelfItem[]>
  /** Puts a bottle on the shelf. Adding it again just updates bought/gift. */
  addToShelf(userId: string, bottleId: string, source: ShelfSource): Promise<void>
  removeFromShelf(userId: string, bottleId: string): Promise<void>
  /** All of the person's ratings, oldest first (the order they should be replayed in). */
  listRatings(userId: string): Promise<Rating[]>
  addRating(userId: string, rating: NewRating): Promise<Rating>
  /** Only used to undo a rating whose profile update failed. */
  removeRating(userId: string, ratingId: string): Promise<void>

  /** The person's profile row, or null if they have none yet. */
  getProfile(userId: string): Promise<WdProfileRow | null>
  /** Creates or updates the row, changing only the fields given. */
  saveProfile(userId: string, patch: WdProfilePatch): Promise<WdProfileRow>
  /** Deletes everything this app stored about the person: profile, shelf, ratings and activity. The sign-in account itself stays. */
  deleteMyData(userId: string): Promise<void>
  /** Fire-and-forget analytics. Never throws: a lost event is not worth a broken screen. */
  recordEvent(userId: string, name: EventName, properties?: Record<string, unknown>): Promise<void>
}
