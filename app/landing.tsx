"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Mic, Brain, Shield } from "lucide-react"

export default function Landing() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-white mb-4">
              Welcome to <span className="text-blue-400">AuraZ</span>
            </h1>
            <p className="text-xl text-gray-300">
              Transform your audio into intelligent insights
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-16 border border-gray-700/50">
            <h2 className="text-2xl font-semibold text-white mb-4">Get Started</h2>
            <p className="text-gray-400 mb-6">
              Sign in to unlock powerful audio transcription and analysis
            </p>
            
            <Button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-6 text-lg bg-white hover:bg-gray-100 text-gray-900"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex justify-center mb-4">
                <Mic className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Real-time Transcription</h3>
              <p className="text-gray-400">
                Get instant, accurate transcriptions of your audio recordings
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex justify-center mb-4">
                <Brain className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart Analysis</h3>
              <p className="text-gray-400">
                Extract key insights and action items automatically
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Secure & Private</h3>
              <p className="text-gray-400">
                Enterprise-grade security for your sensitive data
              </p>
            </div>
          </div>

          <div className="mt-16 text-gray-400 text-sm">
            <p>Powered by advanced AI and secure cloud infrastructure</p>
          </div>
        </div>
      </div>
    </div>
  )
} 