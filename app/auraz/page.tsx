"use client"

import { useState, useEffect, useRef } from "react"
import { BluetoothManager } from "@/lib/bluetooth"
import AudioVisualizer from "@/components/AudioVisualizer"
import RecordingsList from "@/components/RecordingsList"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Bluetooth, Mic, FileText, MessageSquare, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import TranscriptionDisplay from "@/components/TranscriptionDisplay"
import { ThemeToggle } from "@/components/theme-toggle"
import { ScrollArea } from "@/components/ui/scroll-area"
import axios from "axios"
import { auth, cn, db } from "@/lib/utils"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { Router } from "next/router"

interface AudioRecorderPageProps {
    userName: string;
    onSignOut: () => void
}

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

const AudioRecorderPage = ({ userName, onSignOut }: AudioRecorderPageProps) => {

    const [isConnected, setIsConnected] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState("Not Connected")
    const [isPlaying, setIsPlaying] = useState(false)
    const [recordings, setRecordings] = useState<{ url: string; filename: string; transcription: string }[]>([])
    const [audioData, setAudioData] = useState<Int16Array | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isTranscribing, setIsTranscribing] = useState<number | null>(null)
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [summary, setSummary] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [activeTab, setActiveTab] = useState("recordings")

    const bluetoothManagerRef = useRef<BluetoothManager | null>(null)

    useEffect(() => {
        const verifyOnboarding = async () => {
            const user = auth.currentUser
            if (!user) return

            const userRef = doc(db, "users", user.uid)
            const docSnap = await getDoc(userRef)

            if (!docSnap.exists() || !docSnap.data().onboardingCompleted) {
                window.location.href = "/"
            }
        }

        verifyOnboarding()
    }, [])


    useEffect(() => {
        bluetoothManagerRef.current = new BluetoothManager({
            onConnectionStatusChange: (connected, status) => {
                setIsConnected(connected)
                setConnectionStatus(status)
                if (connected) {
                    setError(null)
                } else {
                    setIsRecording(false)
                }
            },
            onPlaybackStatusChange: (playing) => {
                setIsPlaying(playing)
            },
            onAudioDataReceived: (data) => {
                if (isRecording) {
                    setAudioData(data)
                }
            },
            onRecordingSaved: async (url, filename) => {
                setRecordings((prev) => [
                    ...prev,
                    {
                        url,
                        filename,
                        transcription: "transcription...",
                    },
                ])

                try {
                    const response = await fetch(url)
                    const audioBlob = await response.blob()
                    const transcription = await bluetoothManagerRef.current?.transcribeRecording(audioBlob)

                    setRecordings((prev) => {
                        const updated = [...prev]
                        const index = updated.findIndex((rec) => rec.url === url)
                        if (index !== -1) {
                            updated[index].transcription = transcription || "No transcription available"
                        }
                        return updated
                    })
                } catch (err) {
                    console.error("Error during transcription:", err)
                    setRecordings((prev) => {
                        const updated = [...prev]
                        const index = updated.findIndex((rec) => rec.url === url)
                        if (index !== -1) {
                            updated[index].transcription = "Transcription failed"
                        }
                        return updated
                    })
                }
            },
            onError: (errorMessage) => {
                setError(errorMessage)
                console.error(errorMessage)
            },
        })

        return () => {
            if (bluetoothManagerRef.current) {
                bluetoothManagerRef.current.disconnect()
            }
        }
    }, [])

    const handleConnect = async () => {
        if (!bluetoothManagerRef.current) return

        try {
            if (isConnected) {
                await bluetoothManagerRef.current.disconnect()
            } else {
                setError(null)
                await bluetoothManagerRef.current.connect()
            }
        } catch (err) {
            setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    const handleTogglePlayback = () => {
        if (!bluetoothManagerRef.current) return
        bluetoothManagerRef.current.togglePlayback()
    }

    const handleStartRecording = () => {
        if (bluetoothManagerRef.current && isConnected) {
            bluetoothManagerRef.current.startContinuousRecording()
            setIsRecording(true)
            setAudioData(null)
        }
    }

    const handleStopRecording = () => {
        if (bluetoothManagerRef.current) {
            bluetoothManagerRef.current.stopContinuousRecording()
            setIsRecording(false)
        }
    }

    const handleTranscribeRecording = async (index: number) => {
        if (!bluetoothManagerRef.current) return

        try {
            setIsTranscribing(index)
            const recording = recordings[index]
            const response = await fetch(recording.url)
            const audioBlob = await response.blob()
            const transcription = await bluetoothManagerRef.current.transcribeRecording(audioBlob)

            const updatedRecordings = [...recordings]
            updatedRecordings[index] = {
                ...updatedRecordings[index],
                transcription,
            }

            setRecordings(updatedRecordings)
            return Promise.resolve()
        } catch (err) {
            setError(`Transcription error: ${err instanceof Error ? err.message : String(err)}`)
            return Promise.reject(err)
        } finally {
            setIsTranscribing(null)
        }
    }
    const formatSummary = (rawSummary: string) => {
        // Clean up common formatting artifacts
        let cleaned = rawSummary
            .replace(/^\\boxed\{/, "")
            .replace(/\}$/g, "")
            .replace(/```/g, "") // Remove markdown code blocks
            .replace(/^"|"$/g, "") // Remove wrapping quotes
            .trim();

        // Enhance formatting for better readability
        cleaned = cleaned
            // Improve section headers
            .replace(/(MEETING TITLE:|SUMMARY:|KEY POINTS:|ACTION ITEMS:)/g, '\n\n$1\n')
            // Ensure consistent bullet points
            .replace(/(^|\n)\s*-\s*/g, '\n- ')
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n');

        return cleaned;
    };

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const formattedTranscriptions = recordings.map((r) => ({
                text: r.transcription,
                speaker: r.filename,
            }));

            if (formattedTranscriptions.length === 0) {
                setSummary("No transcriptions available to summarize.");
                setIsSummarizing(false);
                return;
            }

            const prompt = `
    Please analyze this meeting transcript and provide a professional, well-structured summary.
    Format your response with clear section headers and bullet points.
    
    Follow this exact structure:
    
    MEETING TITLE:
    [Create a concise 5-7 word title that captures the essence]
    
    SUMMARY:
    [2-3 sentence overview of the meeting's purpose and outcomes]
    
    KEY POINTS:
    - [Main discussion point 1]
    - [Main discussion point 2]
    - [Key decisions made]
    - [Important insights or conclusions]
    
    ACTION ITEMS:
    - [Task] - [Owner] - [Deadline if specified]
    - [Task] - [Owner] - [Deadline if specified]
    
    FOLLOW-UP:
    [Any important follow-up items or next steps]
    
    Meeting Transcript:
    ${formattedTranscriptions.map((t) => `${t.speaker}: ${t.text}`).join("\n")}
            `.trim();

            const response = await axios.post(
                OPENROUTER_API_URL,
                {
                    model: "deepseek/deepseek-r1-zero:free",
                    messages: [
                        {
                            role: "system",
                            content: `You are a professional executive assistant specializing in meeting summaries.
                            Create clear, actionable summaries with perfect formatting.
                            Always use the exact structure provided in the prompt.
                            Remove any markdown or code formatting characters.`,
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.5, // Lower temperature for more consistent formatting
                    max_tokens: 1500, // Allow more tokens for detailed summaries
                },
                {
                    headers: {
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": window.location.href,
                        "X-Title": "Auraz Summary Generator",
                    },
                }
            );

            if (response.data?.choices?.[0]?.message?.content) {
                const formattedSummary = formatSummary(response.data.choices[0].message.content);
                setSummary(formattedSummary);
            } else {
                setSummary("No summary returned from API.");
            }
        } catch (error) {
            console.error("Error summarizing transcriptions:", error);
            setSummary("Error generating summary. Please try again later.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDownloadSummary = () => {
        if (!summary) return;

        // Create a more formatted version for download
        const downloadContent = summary
            .replace(/(MEETING TITLE:|SUMMARY:|KEY POINTS:|ACTION ITEMS:|FOLLOW-UP:)/g, '\n\n$1\n')
            .replace(/\n- /g, '\n• '); // Use bullet points for better readability in text files

        const element = document.createElement("a");
        const file = new Blob([downloadContent], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = `Meeting Summary - ${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const ChatInterface = () => {
        const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
        const [input, setInput] = useState("");
        const [isLoading, setIsLoading] = useState(false);
        const messagesEndRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, [messages]);

        const handleSendMessage = async () => {
            if (!input.trim() || isLoading) return;

            const userMessage = { role: "user", content: input };
            setMessages(prev => [...prev, userMessage]);
            setInput("");
            setIsLoading(true);

            // Add temporary loading message
            setMessages(prev => [...prev, { role: "assistant", content: "Thinking..." }]);

            try {
                console.log("Sending message to API..."); // Debug log

                // Build the context whether or not we have transcriptions/summary
                let context = "User Message:\n" + input;
                if (recordings.length > 0 || summary) {
                    const contextParts = [];

                    if (recordings.length > 0) {
                        const formattedTranscriptions = recordings.map(r => ({
                            text: r.transcription,
                            speaker: r.filename,
                        }));
                        contextParts.push(
                            "Transcriptions:\n" +
                            formattedTranscriptions.map(t => `${t.speaker}: ${t.text}`).join("\n")
                        );
                    }

                    if (summary) {
                        contextParts.push(`Summary:\n${summary}`);
                    }

                    context = `Context:\n\n${contextParts.join("\n\n")}\n\nUser Message:\n${input}`;
                }

                const payload = {
                    model: "deepseek/deepseek-r1-zero:free",
                    messages: [
                        {
                            role: "system",
                            content: `
You are Auraz, an interactive AI assistant built to simplify daily meetings and everyday tasks.
Respond directly to the user’s query with clear and concise answers.
Use meeting transcriptions and summaries when available. If not, rely on general knowledge or perform a side search as needed.
Stay friendly, focused, and helpful—always aiming to make meetings and day-to-day life easier for the user.
Handle queries efficiently without unnecessary detail, and guide users smoothly when they need help or support.                            `.replace(/\s+/g, ' ').trim(),
                        },
                        {
                            role: "user",
                            content: context,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                };

                console.log("API Payload:", payload); // Debug log

                const response = await axios.post(OPENROUTER_API_URL, payload, {
                    headers: {
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": window.location.href, // Required by OpenRouter
                        "X-Title": "Auraz", // Required by OpenRouter
                    },
                });

                console.log("API Response:", response.data); // Debug log

                if (response.data?.choices?.[0]?.message?.content) {
                    const rawContent = response.data.choices[0].message.content;
                    const formattedContent = rawContent
                        .replace(/^\\boxed\{/, "")
                        .replace(/\}$/g, "")
                        .replace(/^"|"$/g, "");

                    const aiMessage = { role: "assistant", content: formattedContent };
                    setMessages(prev => prev.slice(0, -1).concat(aiMessage));
                } else {
                    throw new Error("No content in API response");
                }
            } catch (error) {
                console.error("Error in chat API:", error);
                setMessages(prev => prev.slice(0, -1).concat({
                    role: "assistant",
                    content: "Sorry, I couldn't process your request. Please try again."
                }));
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="space-y-4">
                <ScrollArea className="border rounded-lg p-4 h-[400px] bg-card">
                    {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-16">
                            Your conversation with Aura will appear here. Ask anything about your recordings and transcriptions.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-lg p-3",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border bg-background"
                        placeholder="Ask Aura anything..."
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? "Sending..." : "Send"}
                    </Button>
                </div>
            </div>
        );
    };
    return (
        <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <div className="justify-between flex flex-row w-full items-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        auraz.
                    </h1>
                    <div className="flex items-center space-x-4 ml-4">
                        {userName && (
                            <p className="text-sm font-semibold text-muted-foreground">Hello, {userName}</p>
                        )}
                        <ThemeToggle />

                        <Button
                            onClick={onSignOut}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary"
                        >
                            Sign Out
                        </Button>
                    </div>

                </div>

            </div>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="shadow-sm border bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={cn("p-2 rounded-full", isConnected ? "bg-green-100 dark:bg-green-900" : "bg-muted")}>
                                <Bluetooth
                                    className={cn(
                                        "h-5 w-5",
                                        isConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                                    )}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Device Status</p>
                                <p
                                    className={cn(
                                        "text-xs",
                                        isConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                                    )}
                                >
                                    {connectionStatus}
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleConnect} variant={isConnected ? "destructive" : "default"} size="sm">
                            {isConnected ? "Disconnect" : "Connect"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={cn("p-2 rounded-full", isRecording ? "bg-red-100 dark:bg-red-900" : "bg-muted")}>
                                <Mic
                                    className={cn("h-5 w-5", isRecording ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Recording Status</p>
                                <p className={cn("text-xs", isRecording ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                                    {isRecording ? "Recording in progress" : "Not recording"}
                                </p>
                            </div>
                        </div>
                        {isConnected && (
                            <Button
                                onClick={isRecording ? handleStopRecording : handleStartRecording}
                                variant={isRecording ? "destructive" : "default"}
                                size="sm"
                            >
                                {isRecording ? "Stop" : "Record"}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-muted">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Recordings</p>
                                <p className="text-xs text-muted-foreground">
                                    {recordings.length} {recordings.length === 1 ? "recording" : "recordings"}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                setActiveTab("transcriptions")
                                handleSummarize()
                            }}
                            variant="outline"
                            size="sm"
                            disabled={recordings.length === 0 || isSummarizing}
                        >
                            Summarize
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="recordings" className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="transcriptions" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Transcriptions</span>
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Chat aura</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="recordings" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-sm border bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium">Audio Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isConnected ? (
                                    <AudioVisualizer audioData={audioData} />
                                ) : (
                                    <div className="flex items-center justify-center h-[200px] bg-muted/20 dark:bg-muted/10 rounded-lg">
                                        <p className="text-muted-foreground">Connect to device to view audio visualization</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium">Recordings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RecordingsList
                                    recordings={recordings}
                                    onTranscribe={handleTranscribeRecording}
                                    transcribingIndex={isTranscribing}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="transcriptions" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TranscriptionDisplay recordings={recordings} />

                        <Card className="shadow-sm border bg-card">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-medium">Summary</CardTitle>
                                    {summary && (
                                        <Button variant="outline" size="sm" onClick={handleDownloadSummary}>
                                            <Download className="h-4 w-4 mr-1" />
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center mb-4">
                                    <Button
                                        onClick={handleSummarize}
                                        disabled={isSummarizing || recordings.length === 0}
                                        className="w-full sm:w-auto"
                                    >
                                        {isSummarizing ? "Summarizing..." : "Generate Summary"}
                                    </Button>
                                </div>

                                {summary ? (
                                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/10 dark:bg-muted/5">
                                        <div className="whitespace-pre-wrap">{summary}</div>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center text-muted-foreground py-8 border rounded-md">
                                        {recordings.length === 0
                                            ? "No recordings available to summarize"
                                            : "Click 'Generate Summary' to create a summary of your recordings"}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="chat" className="space-y-6">
                    <ChatInterface />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default AudioRecorderPage
