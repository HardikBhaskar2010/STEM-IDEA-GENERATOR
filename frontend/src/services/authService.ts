import { supabase } from '@/lib/supabase'
import type { AuthError, User } from '@supabase/supabase-js'
import { guestService, type GuestUser } from './guestService'
import type { AuthProvider } from '@/contexts/AuthContext'

/* =======================
   Types
======================= */

export interface SignUpData {
  email: string
  password: string
  username?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | GuestUser | null
  error: AuthError | null
  isGuest?: boolean
}

/* =======================
   Auth Service
======================= */

class AuthService {
  /* ---------- Guest event handling ---------- */

  private guestLoginCallbacks: Array<(user: GuestUser) => void> = []

  onGuestLogin(callback: (user: GuestUser) => void) {
    this.guestLoginCallbacks.push(callback)
    return () => {
      this.guestLoginCallbacks = this.guestLoginCallbacks.filter(
        cb => cb !== callback
      )
    }
  }

  private emitGuestLogin(user: GuestUser) {
    this.guestLoginCallbacks.forEach(cb => cb(user))
  }

  /* ---------- Email / Password ---------- */

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (error) return { user: null, error }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            username: data.username ?? data.email.split('@')[0],
            email: data.email,
          })

        if (profileError) {
          return { user: authData.user, error: profileError as AuthError }
        }
      }

      return { user: authData.user, error: null }
    } catch (err) {
      return { user: null, error: err as AuthError }
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const { data: authData, error } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

      if (error) return { user: null, error }

      return { user: authData.user, error: null, isGuest: false }
    } catch (err) {
      return { user: null, error: err as AuthError }
    }
  }

  /* ---------- Google OAuth (FIXED) ---------- */

  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : undefined

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })

      return { error }
    } catch (err) {
      return { error: err as AuthError }
    }
  }

  /* ---------- Guest Mode ---------- */

  async continueAsGuest(): Promise<AuthResponse> {
    try {
      const guestUser = guestService.getOrCreateGuest()
      this.emitGuestLogin(guestUser)

      return {
        user: guestUser,
        error: null,
        isGuest: true,
      }
    } catch (err) {
      return {
        user: null,
        error: { message: 'Failed to create guest session' } as AuthError,
      }
    }
  }

  /* ---------- Sign Out ---------- */

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      if (guestService.isGuest()) {
        guestService.clearGuestData()
        return { error: null }
      }

      const { error } = await supabase.auth.signOut()
      localStorage.removeItem('user_projects')
      return { error }
    } catch (err) {
      return { error: err as AuthError }
    }
  }

  /* ---------- User Helpers ---------- */

  async getCurrentUser(): Promise<User | GuestUser | null> {
    try {
      if (guestService.isGuest()) {
        return guestService.getGuest()
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      return user ?? null
    } catch {
      return null
    }
  }

  isGuestUser(user: User | GuestUser | null): user is GuestUser {
    return !!user && 'isGuest' in user && user.isGuest === true
  }

  /* ---------- Password Reset ---------- */

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      return { error }
    } catch (err) {
      return { error: err as AuthError }
    }
  }

  /* ---------- Guest → Real Account ---------- */

  async upgradeGuestToAccount(data: SignUpData): Promise<AuthResponse> {
    try {
      const guestData = guestService.getDataForMigration()
      const result = await this.signUp(data)

      if (result.user && !result.error) {
        console.log('Migrating guest data:', guestData)
        guestService.clearGuestData()
      }

      return result
    } catch (err) {
      return { user: null, error: err as AuthError }
    }
  }

  /* ---------- Auth State Listener ---------- */

  onAuthStateChange(
    callback: (user: User | GuestUser | null, provider?: AuthProvider) => void
  ) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const provider =
          session.user.app_metadata?.provider === 'google'
            ? 'google'
            : 'email'

        callback(session.user, provider as AuthProvider)

        if (guestService.isGuest()) {
          guestService.clearGuestData()
        }
      } else {
        callback(null)
      }
    })

    return subscription
  }
}

/* =======================
   Export
======================= */

export const authService = new AuthService()
