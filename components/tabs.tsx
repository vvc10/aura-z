"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AudioVisualizer from "@/components/audio-visualizer"
import TranscriptionDisplay from "@/components/transcription-display"
import DeviceInfo from "@/components/device-info"

interface TabsComponentProps {
  isConnected: boolean
  isRecording: boolean
  isTranscribing: boolean
  deviceName: string
  packetCount: number
  audioData: Float32Array | null
  transcription: string
  errorMessage: string
}

export default function TabsComponent({
  isConnected,
  isRecording,
  isTranscribing,
  deviceName,
  packetCount,
  audioData,
  transcription,
  errorMessage,
}: TabsComponentProps) {
  const [activeTab, setActiveTab] = useState("dashboard")

  // Dummy data for demonstration
  const dummyTranscriptions = [
    {
      id: 1,
      text: "This is a sample transcription of a meeting discussing project updates and next steps.",
      timestamp: "2024-03-20 10:30:00",
    },
    {
      id: 2,
      text: "The team needs to focus on completing the user interface by next week.",
      timestamp: "2024-03-20 10:35:00",
    },
  ]

  const dummySummary = {
    title: "Project Status Meeting",
    date: "March 20, 2024",
    duration: "30 minutes",
    keyPoints: [
      "Project timeline is on track",
      "UI development needs attention",
      "Testing phase to begin next week",
    ],
  }

  const dummyActionItems = [
    {
      id: 1,
      task: "Complete UI implementation",
      assignee: "John Doe",
      dueDate: "2024-03-27",
      status: "In Progress",
    },
    {
      id: 2,
      task: "Review test cases",
      assignee: "Jane Smith",
      dueDate: "2024-03-25",
      status: "Pending",
    },
  ]

  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="transcriptions">Transcriptions</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="action-items">Action Items</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Device Connection</CardTitle>
              <CardDescription>Current device status and information</CardDescription>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <DeviceInfo deviceName={deviceName} packetCount={packetCount} isRecording={isRecording} />
              ) : (
                <p className="text-muted-foreground">No device connected</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio Recording</CardTitle>
              <CardDescription>Live audio visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <AudioVisualizer audioData={audioData} isRecording={isRecording} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Real-time Transcription</CardTitle>
            <CardDescription>Live transcription of recorded audio</CardDescription>
          </CardHeader>
          <CardContent>
            <TranscriptionDisplay transcription={transcription} isTranscribing={isTranscribing} />
            {errorMessage && <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">{errorMessage}</div>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transcriptions">
        <Card>
          <CardHeader>
            <CardTitle>Transcriptions</CardTitle>
            <CardDescription>Your transcriptions will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dummyTranscriptions.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{item.timestamp}</p>
                  <p className="mt-2">{item.text}</p>
                </div>
              ))}
              <p className="text-sm text-muted-foreground italic">
                This is a sample of how your transcriptions will look when the system is fully operational.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="summary">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Summary</CardTitle>
            <CardDescription>Your meeting summaries will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">{dummySummary.title}</h3>
                <p className="text-sm text-muted-foreground">{dummySummary.date} • {dummySummary.duration}</p>
                <ul className="mt-4 list-disc list-inside space-y-2">
                  {dummySummary.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground italic">
                This is a sample of how your meeting summaries will look when the system is fully operational.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="action-items">
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Your action items will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dummyActionItems.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{item.task}</h3>
                      <p className="text-sm text-muted-foreground">Assigned to: {item.assignee}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Due: {item.dueDate}</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        item.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground italic">
                This is a sample of how your action items will look when the system is fully operational.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 