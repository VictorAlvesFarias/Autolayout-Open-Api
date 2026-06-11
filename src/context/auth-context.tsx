import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { defaultAuthState, type AuthState } from '../types/auth'

interface AuthContextValue {
  auth: AuthState
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>
  updateAuth: <K extends keyof AuthState>(key: K, value: AuthState[K]) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem('autolayout-auth')
      return saved ? { ...defaultAuthState, ...JSON.parse(saved) } : defaultAuthState
    } catch {
      return defaultAuthState
    }
  })

  const updateAuth = <K extends keyof AuthState>(key: K, value: AuthState[K]) => {
    setAuth((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('autolayout-auth', JSON.stringify(next))
      return next
    })
  }

  const value = useMemo(() => ({ auth, setAuth, updateAuth }), [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
