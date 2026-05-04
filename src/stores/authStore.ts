import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile, Toast } from '../types'
import type { Language } from '../lib/translations'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  language: Language
  loading: boolean
  initialized: boolean
  toasts: Toast[]
  initialize: () => void
  fetchProfile: (userId: string) => Promise<void>
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  language: 'ar',
  loading: true,
  initialized: false,
  toasts: [],

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, loading: false, initialized: true })
      if (session?.user) {
        get().fetchProfile(session.user.id)
      }
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session })
      if (session?.user) {
        get().fetchProfile(session.user.id)
      } else {
        set({ profile: null })
      }
    })
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) {
      set({ profile: data })
      if (data.preferred_language) {
        set({ language: data.preferred_language as Language })
      }
    }
  },

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  toggleLanguage: () => {
    const newLang = get().language === 'ar' ? 'en' : 'ar'
    set({ language: newLang })
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
    const { profile } = get()
    if (profile) {
      supabase.from('profiles').update({ preferred_language: newLang }).eq('id', profile.id).then()
    }
  },

  setLanguage: (lang) => {
    set({ language: lang })
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  },

  addToast: (message, type) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))