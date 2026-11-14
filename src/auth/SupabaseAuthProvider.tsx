// Real accounts with Supabase: email + password. Passwords are checked (and hashed) by Supabase Auth;
// this app never stores or sees them beyond sending them over HTTPS to Supabase.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, checkCredentials, displayNameFor, MIN_PASSWORD, type AuthContextValue, type AuthUser, type SignUpResult } from './AuthProvider'

/** Turn Supabase's technical messages into plain language. Details stay in the console. */
export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match.'
  if (/already (been )?registered|already exists/i.test(message)) return 'An account with that email already exists. Try signing in instead.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link we sent.'
  if (/rate limit|too many|after \d+ seconds|security purposes/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  if (/password/i.test(message) && /(short|least|weak|characters|strength|pwned|compromised)/i.test(message)) {
    return `Please choose a stronger password (at least ${MIN_PASSWORD} characters, not a common one).`
  }
  if (/signups? (are )?(not allowed|disabled)/i.test(message)) return 'New accounts are turned off right now.'
  if (/sending|smtp|email address .*not authorized/i.test(message)) return 'We couldn’t send the email just now. Please try again later.'
  if (/same password|different from the old/i.test(message)) return 'Choose a password you haven’t used before.'
  return 'Something went wrong. Please try again.'
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const sb = supabase!
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    sb.auth.getSession().then(({ data }) => {
      if (!live) return
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [sb])

  // The signed-in person comes straight from the auth session: no database read is needed.
  const user = useMemo<AuthUser | null>(() => {
    const u = session?.user
    return u ? { id: u.id, email: u.email ?? '', display_name: displayNameFor(u.email ?? '') } : null
  }, [session])

  const signUp = useCallback(
    async (address: string, password: string): Promise<SignUpResult> => {
      const problem = checkCredentials(address, password, true)
      if (problem) throw new Error(problem)
      const { data, error } = await sb.auth.signUp({
        email: address.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (error) {
        console.error('[auth] sign up:', error.message)
        throw new Error(friendlyAuthError(error.message))
      }
      // With "Confirm email" on, an existing address comes back as a user with no identities (no error, to avoid leaking who has an account).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with that email already exists. Try signing in instead.')
      }
      return data.session ? 'signed-in' : 'confirm-email'
    },
    [sb],
  )

  const signIn = useCallback(
    async (address: string, password: string) => {
      const problem = checkCredentials(address, password, false)
      if (problem) throw new Error(problem)
      const { error } = await sb.auth.signInWithPassword({ email: address.trim().toLowerCase(), password })
      if (error) {
        console.error('[auth] sign in:', error.message)
        throw new Error(friendlyAuthError(error.message))
      }
    },
    [sb],
  )

  const resendConfirmation = useCallback(
    async (address: string) => {
      const { error } = await sb.auth.resend({ type: 'signup', email: address.trim().toLowerCase() })
      if (error) throw new Error(friendlyAuthError(error.message))
    },
    [sb],
  )

  const sendPasswordReset = useCallback(
    async (address: string) => {
      const { error } = await sb.auth.resetPasswordForEmail(address.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw new Error(friendlyAuthError(error.message))
    },
    [sb],
  )

  const updatePassword = useCallback(
    async (password: string) => {
      if (password.length < MIN_PASSWORD) throw new Error(`Choose a password with at least ${MIN_PASSWORD} characters.`)
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw new Error(friendlyAuthError(error.message))
    },
    [sb],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'account',
      status: !ready ? 'loading' : session ? 'signed-in' : 'signed-out',
      user,
      signUp,
      signIn,
      resendConfirmation,
      sendPasswordReset,
      updatePassword,
      signOut: () => {
        void sb.auth.signOut()
      },
    }),
    [ready, session, user, signUp, signIn, resendConfirmation, sendPasswordReset, updatePassword, sb],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
