"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Mic, Brain, Shield } from "lucide-react"

export default function Landing() {
  const { login, loading, error } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-6">Welcome to AuraZ!</h1>
        <p className="text-xl text-gray-300 mb-8">
          Your intelligent audio transcription and analysis platform
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        <Button
          onClick={login}
          disabled={loading}
          className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in with Google"
          )}
        </Button>

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