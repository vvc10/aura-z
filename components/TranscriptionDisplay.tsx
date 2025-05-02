"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TranscriptionDisplayProps {
  recordings: { filename: string; transcription: string }[]
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ recordings }) => {
  const transcriptionRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom when new text is added
  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight
    }
  }, [recordings])

  if (recordings.length === 0) {
    return (
      <Card className="shadow-sm border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Transcriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No recordings available. Connect to your device and record audio to see transcriptions.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Transcriptions</CardTitle>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {recordings.length} {recordings.length === 1 ? "recording" : "recordings"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]" ref={transcriptionRef}>
          <ul className="space-y-3 pr-4">
            {recordings.map((recording, index) => (
              <li key={index} className="pb-3 border-b border-border last:border-b-0 last:pb-0">
                <div className="flex items-start">
                  <span className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1 rounded mr-2 mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium break-words">
                      {recording.filename.replace(/\.[^/.]+$/, "")} {/* Remove file extension */}
                    </p>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                      {recording.transcription || (
                        <span className="text-muted-foreground/70 italic">No transcription available</span>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default TranscriptionDisplay
