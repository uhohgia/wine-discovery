// Demo-mode auth: email + password sign-up and sign-in that live only on this device, so the app and
// its tests work with no server. PASSWORDS ARE NOT CHECKED in demo mode. Real accounts (with real
// password checking) are in SupabaseAuthProvider. Screens only use `useAuth()`.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const SESSION_KEY = 'wd:session'
const USERS_KEY = 'wd:demo-users'

export const MIN_PASSWORD = 8

/** What the app needs to know about the signed-in person. */
export interface AuthUser {
  id: string
  email: string
  display_name: string
}

/** 'signed-in' = account created and signed in; 'confirm-email' = they must click a link in their email first. */
export type SignUpResult = 'signed-in' | 'confirm-email'

export interface AuthContextValue {
  /** 'demo' = device-only accounts (passwords unchecked); 'account' = real Supabase accounts. */
  mode: 'demo' | 'account'
  status: 'loading' | 'signed-out' | 'signed-in'
  user: AuthUser | null
  signUp(email: string, password: string): Promise<SignUpResult>
  signIn(email: string, password: string): Promise<void>
  resendConfirmation(email: string): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const store = {
  get: (k: string): string | null => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* private mode: the session just won't persist */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

/** First problem with the entered credentials, or null. `creating` also enforces the password rules. */
export function checkCredentials(email: string, password: string, creating: boolean): string | null {
  if (!isValidEmail(email)) return 'Please enter a valid email address, like you@example.com.'
  if (!password) return 'Please enter your password.'
  if (creating && password.length < MIN_PASSWORD) return `Choose a password with at least ${MIN_PASSWORD} characters.`
  return null
}

export const displayNameFor = (email: string): string => email.split('@')[0] ?? 'friend'

function readUsers(): Record<string, AuthUser> {
  try {
    return JSON.parse(store.get(USERS_KEY) ?? '{}') as Record<string, AuthUser>
  } catch {
    return {}
  }
}

function readSession(): AuthUser | null {
  const id = store.get(SESSION_KEY)
  return id ? (Object.values(readUsers()).find((u) => u.id === id) ?? null) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession)

  const startSession = useCallback((u: AuthUser) => {
    store.set(SESSION_KEY, u.id)
    setUser(u)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      const problem = checkCredentials(email, password, true)
      if (problem) throw new Error(problem)
      const address = email.trim().toLowerCase()
      const users = readUsers()
      if (users[address]) throw new Error('An account with that email already exists. Try signing in instead.')
      const created: AuthUser = { id: crypto.randomUUID(), email: address, display_name: displayNameFor(address) }
      store.set(USERS_KEY, JSON.stringify({ ...users, [address]: created }))
      startSession(created)
      return 'signed-in'
    },
    [startSession],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const problem = checkCredentials(email, password, false)
      if (problem) throw new Error(problem)
      const found = readUsers()[email.trim().toLowerCase()]
      if (!found) throw new Error('That email and password don’t match. New here? Create an account.')
      startSession(found)
    },
    [startSession],
  )

  const notAvailable = useCallback(async () => {
    throw new Error('This isn’t available in demo mode.')
  }, [])

  const signOut = useCallback(() => {
    store.del(SESSION_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'demo' as const,
      status: user ? 'signed-in' : 'signed-out',
      user,
      signUp,
      signIn,
      resendConfirmation: notAvailable,
      sendPasswordReset: notAvailable,
      updatePassword: notAvailable,
      signOut,
    }),
    [user, signUp, signIn, notAvailable, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an auth provider')
  return ctx
}
