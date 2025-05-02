"use client";

import { useAuth } from "../../components/AuthContext";
import { Button } from "../../components/ui/button";

export default function LandingPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-blue-500 to-green-500 text-white">
      <h1 className="text-5xl font-bold mb-6">Welcome to Audio Recorder App</h1>
      <p className="text-lg mb-8 text-center max-w-md">
        Record, transcribe, and summarize your audio recordings with ease. Sign in to get started!
      </p>
      <Button onClick={signInWithGoogle} className="px-6 py-3 text-lg font-medium bg-white text-blue-500 hover:bg-gray-200">
        Sign in with Google
      </Button>
    </div>
  );
}