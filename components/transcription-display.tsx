"use client"

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

interface TranscriptionDisplayProps {
  transcription: string
  isTranscribing: boolean
}

export default function TranscriptionDisplay({ transcription, isTranscribing }: TranscriptionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom when new transcription comes in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [transcription])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-md"
      >
        {transcription ? (
          <p className="whitespace-pre-wrap">{transcription}</p>
        ) : (
          <p className="text-gray-500 text-center">
            No transcription available yet. Start recording to begin transcribing.
          </p>
        )}
      </div>

      {isTranscribing && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md">
          <Loader2 className="h-4 w-4 animate-spin text-green-500" />
          <span className="text-sm">Transcribing...</span>
        </div>
      )}
    </div>
  )
}
