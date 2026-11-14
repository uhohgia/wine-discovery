// Device-only WdRepo for demo mode and tests. Persists to localStorage when it's available.
import { emptyProfile, parseProfile } from '@/lib/profile'
import { SEED_BOTTLES } from './bottles'
import type { NewRating, Rating, ShelfItem, WdProfilePatch, WdProfileRow, WdRepo } from './wdRepo'
import type { EventName } from './vocab'

export interface LocalEvent {
  name: EventName
  properties: Record<string, unknown>
  created_at: string
}

const key = (userId: string, what: 'profile' | 'events' | 'shelf' | 'ratings') => `wd:demo:${userId}:${what}`

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(k: string, value: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch {
    /* private mode: data just won't survive a reload */
  }
}

export function readLocalEvents(userId: string): LocalEvent[] {
  return read<LocalEvent[]>(key(userId, 'events'), [])
}

export function createLocalWdRepo(): WdRepo {
  return {
    listBottles: async () => SEED_BOTTLES,

    listShelf: async (userId) => read<ShelfItem[]>(key(userId, 'shelf'), []),

    addToShelf: async (userId, bottleId, source) => {
      if (!SEED_BOTTLES.some((b) => b.id === bottleId)) throw new Error('We don’t know that bottle.')
      const rest = read<ShelfItem[]>(key(userId, 'shelf'), []).filter((i) => i.bottleId !== bottleId)
      const addedOn = new Date().toISOString().slice(0, 10)
      write(key(userId, 'shelf'), [{ bottleId, source, addedOn }, ...rest])
    },

    listRatings: async (userId) => read<Rating[]>(key(userId, 'ratings'), []),

    addRating: async (userId, r: NewRating) => {
      if (!SEED_BOTTLES.some((b) => b.id === r.bottleId)) throw new Error('We don’t know that bottle.')
      const rating: Rating = { id: crypto.randomUUID(), ...r, reasons: [...r.reasons], createdAt: new Date().toISOString() }
      write(key(userId, 'ratings'), [...read<Rating[]>(key(userId, 'ratings'), []), rating])
      return rating
    },

    removeRating: async (userId, ratingId) => {
      write(key(userId, 'ratings'), read<Rating[]>(key(userId, 'ratings'), []).filter((x) => x.id !== ratingId))
    },

    removeFromShelf: async (userId, bottleId) => {
      write(key(userId, 'shelf'), read<ShelfItem[]>(key(userId, 'shelf'), []).filter((i) => i.bottleId !== bottleId))
    },

    getProfile: async (userId) => {
      const row = read<{ prefs?: unknown; ratingCount?: number; ageConfirmedAt?: string | null } | null>(key(userId, 'profile'), null)
      if (!row) return null
      return { prefs: parseProfile(row.prefs), ratingCount: row.ratingCount ?? 0, ageConfirmedAt: row.ageConfirmedAt ?? null }
    },

    saveProfile: async (userId, patch: WdProfilePatch) => {
      const current = read<Partial<WdProfileRow> | null>(key(userId, 'profile'), null)
      const next: WdProfileRow = {
        prefs: patch.prefs ?? parseProfile(current?.prefs ?? emptyProfile()),
        ratingCount: patch.ratingCount ?? current?.ratingCount ?? 0,
        ageConfirmedAt: patch.ageConfirmedAt ?? current?.ageConfirmedAt ?? null,
      }
      write(key(userId, 'profile'), next)
      return next
    },

    deleteMyData: async (userId) => {
      for (const what of ['profile', 'events', 'shelf', 'ratings'] as const) {
        try {
          localStorage.removeItem(key(userId, what))
        } catch {
          /* nothing stored, nothing to delete */
        }
      }
    },

    recordEvent: async (userId, name, properties = {}) => {
      write(key(userId, 'events'), [...readLocalEvents(userId), { name, properties, created_at: new Date().toISOString() }])
    },
  }
}
