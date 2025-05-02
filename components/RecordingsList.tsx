"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Download, Pause, FileText, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Recording {
  url: string
  filename: string
  transcription: string
}

interface RecordingsListProps {
  recordings: Recording[]
  onTranscribe: (index: number) => Promise<void>
  transcribingIndex: number | null
}

const RecordingsList: React.FC<RecordingsListProps> = ({ recordings, onTranscribe, transcribingIndex }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  const handlePlay = (index: number, url: string) => {
    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }

    if (playingIndex === index) {
      // If clicking the same recording, stop it
      setPlayingIndex(null)
      setAudioElement(null)
    } else {
      // Play the new recording
      const audio = new Audio(url)
      audio.onended = () => {
        setPlayingIndex(null)
        setAudioElement(null)
      }
      audio.play()
      setPlayingIndex(index)
      setAudioElement(audio)
    }
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/20 dark:bg-muted/10 rounded-md text-muted-foreground">
        No recordings available yet. Connect to the device to start automatic recording.
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
        {recordings.map((recording, index) => (
          <Card key={index} className="overflow-hidden border bg-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm truncate" title={recording.filename}>
                  {recording.filename}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePlay(index, recording.url)}
                    title={playingIndex === index ? "Pause" : "Play"}
                  >
                    {playingIndex === index ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDownload(recording.url, recording.filename)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onTranscribe(index)}
                    disabled={transcribingIndex === index}
                    title="Transcribe"
                  >
                    {transcribingIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                <div className="font-semibold mb-1">Transcription:</div>
                <div className="bg-muted/20 dark:bg-muted/10 p-2 rounded max-h-[80px] overflow-y-auto">
                  {recording.transcription || "No transcription available"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}

export default RecordingsList
