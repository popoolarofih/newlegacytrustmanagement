"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

type UserRole = "user" | "vendor" | "admin"

interface User {
  uid: string
  email: string | null
  name?: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, role: UserRole) => Promise<User | null>
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<User | null>
  signOut: () => Promise<void>
}

// Create context with undefined as default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Props type for AuthProvider
interface AuthProviderProps {
  children: ReactNode
}

// AuthProvider function component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuth()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name,
            role: userData.role || "user",
          })
        } else {
          // If no user document exists, create a basic one
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "user",
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  const signIn = async (email: string, password: string, role: UserRole): Promise<User | null> => {
    try {
      setLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Get user data from Firestore to verify role
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()

        // Verify that the user has the correct role
        if (userData.role !== role) {
          // If roles don't match, sign out and return null
          await firebaseSignOut(auth)
          throw new Error(`This account is not registered as a ${role}`)
        }

        // Return the user data
        return {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userData.name,
          role: userData.role,
        }
      }

      return null
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<User | null> => {
    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Store additional user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role,
        createdAt: new Date(),
      })

      // Return the user data
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name,
        role,
      }
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  // Use createElement instead of JSX
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
