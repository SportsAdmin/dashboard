import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

export type Role = 'admin' | 'manager' | 'seller'

export type UserProfile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  setUser: (user) => {
    set({ user })
    if (user) {
      get().fetchProfile()
    } else {
      set({ profile: null, loading: false })
    }
  },

  fetchProfile: async () => {
    try {
      set({ loading: true, error: null })

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        set({ user: null, profile: null, loading: false })
        return
      }

      // Fetch profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle instead of single to handle 0 or 1 results

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw profileError
      }

      // If no profile found, user might not have been set up properly
      if (!profile) {
        console.warn('No profile found for user:', user.id)
        set({
          user,
          profile: null,
          loading: false,
          error: 'Profile not found. Please contact an administrator.'
        })
        return
      }

      set({
        user,
        profile,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
        loading: false
      })
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      set({ user: null, profile: null, loading: false, error: null })
    } catch (error) {
      console.error('Error signing out:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' })
    }
  }
}))
