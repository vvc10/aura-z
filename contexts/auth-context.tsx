"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, signInWithPopup, signOut } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run auth state listener on client side
    if (typeof window !== "undefined" && auth) {
      try {
        const unsubscribe = auth.onAuthStateChanged(
          (user) => {
            setUser(user)
            setLoading(false)
            setError(null)
          },
          (error) => {
            console.error("Auth state change error:", error)
            setError(error.message)
            setLoading(false)
          }
        )

        return () => unsubscribe()
      } catch (error) {
        console.error("Auth initialization error:", error)
        setError("Failed to initialize authentication")
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = async () => {
    if (!auth || !googleProvider) {
      setError("Authentication not initialized")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Error signing in:", error)
      setError(error instanceof Error ? error.message : "Failed to sign in")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!auth) {
      setError("Authentication not initialized")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      setError(error instanceof Error ? error.message : "Failed to sign out")
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 