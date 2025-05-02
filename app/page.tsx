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

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full mx-auto text-center">
          <h1 className="text-6xl font-bold text-white mb-6">Welcome to AuraZ!</h1>
          <p className="text-xl text-gray-300 mb-8">
            Your intelligent audio transcription and analysis platform
          </p>



          <button
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


          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">Real-time Transcription</h3>
              <p className="text-gray-400">Get instant transcriptions of your audio recordings</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">Smart Analysis</h3>
              <p className="text-gray-400">Advanced AI-powered insights from your conversations</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">Secure & Private</h3>
              <p className="text-gray-400">Your data is encrypted and protected</p>
            </div>
          </div>
        </div>
      </div>


    )
  }

  return <AudioRecorderPage userName={userName} onSignOut={handleSignOut} />
}