"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/utils"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import OnboardingPage from "./landing/onboarding"
import AudioRecorderPage from "./auraz/page"
import { useRouter } from "next/navigation"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [userName, setUserName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        await auth.authStateReady()
        const user = auth.currentUser

        if (user) {
          const userRef = doc(db, "users", user.uid)
          const docSnap = await getDoc(userRef)

          if (docSnap.exists()) {
            if (docSnap.data().onboardingCompleted) {
              setShowOnboarding(false)
              setUserName(docSnap.data().name)
            }
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Check if user exists in Firestore
      const userRef = doc(db, "users", result.user.uid)
      const docSnap = await getDoc(userRef)

      if (docSnap.exists()) {
        setShowOnboarding(false)
        setUserName(docSnap.data().name)
      } else {
        // New user - show onboarding
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await signOut(auth)
      setShowOnboarding(true)
      setUserName("")
      router.push("/") // Refresh the page to reset state
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-gray-950 to-gray-800 text-white">
        <h1 className="text-5xl font-bold mb-6">Welcome to auraz.</h1>
        <p className="text-lg mb-8 text-center max-w-md">
          Your on the go assistant! feel you aura!
        </p>          <button
          onClick={handleGoogleSignIn}
          className="w-fit flex items-center justify-center gap-2 bg-balck border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-400"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google logo"
            className="h-5 w-5"
          />
          Continue with Google
        </button>
      </div>

    )
  }

  return <AudioRecorderPage userName={userName} onSignOut={handleSignOut} />
}