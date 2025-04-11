// Deepgram API integration

interface TranscriptionOptions {
  onTranscript: (transcript: string) => void
  onError: (error: string) => void
  onClose: () => void
}

interface DeepgramWebSocket extends WebSocket {
  keepAliveInterval?: NodeJS.Timeout
}

export async function transcribeAudio(options: TranscriptionOptions): Promise<WebSocket> {
  // Get Deepgram API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY

  if (!apiKey) {
    throw new Error("Deepgram API key is not set. Please set NEXT_PUBLIC_DEEPGRAM_API_KEY environment variable.")
  }

  // Create WebSocket connection to Deepgram
  const socket = new WebSocket("wss://api.deepgram.com/v1/listen", ["token", apiKey]) as DeepgramWebSocket

  // Configure the connection parameters
  socket.onopen = () => {
    console.log("Deepgram WebSocket connection established")

    // Send connection parameters
    socket.send(
      JSON.stringify({
        type: "Configure",
        features: {
          sample_rate: 16000,
          encoding: "linear16",
          channels: 1,
          interim_results: true,
          punctuate: true,
          language: "en",
          model: "nova-2",
          smart_format: true,
          diarize: false,
          utterances: true
        }
      })
    )

    // Send initial keepalive
    socket.send(JSON.stringify({ type: "KeepAlive" }))

    // Set up keepalive interval
    const keepAliveInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "KeepAlive" }))
        console.log("Sent keepalive message to Deepgram")
      } else {
        clearInterval(keepAliveInterval)
      }
    }, 3000) // Send every 3 seconds to prevent timeout

    // Store interval ID for cleanup
    socket.keepAliveInterval = keepAliveInterval
  }

  // Handle incoming transcription results
  socket.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data)
      console.log("Received Deepgram response:", data)

      // Check if we have transcription results
      if (data.type === "Results" && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
        const transcript = data.channel.alternatives[0].transcript

        // Only process if we have actual text
        if (transcript && transcript.trim() !== "") {
          console.log("New transcription:", transcript)
          options.onTranscript(transcript)
        } else {
          console.log("Received empty transcript from Deepgram")
        }
      } else if (data.type === "Error") {
        console.error("Deepgram error:", data)
        options.onError(data.message || "Unknown error occurred")
      } else {
        console.log("Received other message type from Deepgram:", data.type)
      }
    } catch (error) {
      console.error("Error parsing Deepgram response:", error)
      options.onError(`Error parsing response: ${error}`)
    }
  }

  // Handle errors
  socket.onerror = (error) => {
    console.error("Deepgram WebSocket error:", error)
    options.onError("WebSocket error occurred")
  }

  // Handle connection close
  socket.onclose = (event) => {
    console.log("Deepgram WebSocket connection closed:", event.code, event.reason)
    // Clear keepalive interval
    if (socket.keepAliveInterval) {
      clearInterval(socket.keepAliveInterval)
    }
    options.onClose()
  }

  return socket
}
