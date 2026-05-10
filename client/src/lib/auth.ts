import { create } from 'zustand'

import type { AuthSession } from './types'

interface AuthState {
  session: AuthSession | null
  setSession: (s: AuthSession) => void
  clear: () => void
}

const STORAGE_KEY = 'profile'

function load(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

export const useAuth = create<AuthState>((set) => ({
  session: load(),
  setSession: (s) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    set({ session: s })
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ session: null })
  },
}))

export function getUserId(session: AuthSession | null): string | undefined {
  if (!session) return undefined
  // Server returns result._id; legacy code also referenced googleId.
  // @ts-expect-error - legacy field
  return session.result?._id ?? session.result?.googleId
}
