"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Bluetooth, Loader2, StopCircle, LogOut } from "lucide-react"
import AudioVisualizer from "@/components/audio-visualizer"
import TranscriptionDisplay from "@/components/transcription-display"
import DeviceInfo from "@/components/device-info"
import { transcribeAudio } from "@/lib/deepgram"
import TabsComponent from "@/components/tabs"
import { useAuth } from "@/contexts/auth-context"
import Landing from "@/app/landing"

// Bluetooth service and characteristic UUIDs from the Arduino code
const AUDIO_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e" // Nordic UART Service
const AUDIO_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // Nordic UART TX Characteristic
const COMMAND_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // Nordic UART RX Characteristic

// Audio settings
const SAMPLE_RATE = 16000
const CHANNELS = 1
const BITS_PER_SAMPLE = 16

export default function AudioTranscriptionApp() {
  const { user, loading, error, logout } = useAuth()

  // Device connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceName, setDeviceName] = useState("")
  const [packetCount, setPacketCount] = useState(0)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [audioData, setAudioData] = useState<Float32Array | null>(null)

  // Refs for maintaining state between renders
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const deepgramSocketRef = useRef<WebSocket | null>(null)
  const audioChunksRef = useRef<Int16Array[]>([])
  const audioCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const commandCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  // Check Bluetooth availability
  useEffect(() => {
    const checkBluetooth = () => {
      if (!navigator.bluetooth) {
        setErrorMessage("Bluetooth is not supported in this browser")
        return false
      }
      return true
    }

    checkBluetooth()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bluetoothDeviceRef.current && bluetoothDeviceRef.current.gatt?.connected) {
        bluetoothDeviceRef.current.gatt.disconnect()
      }

      if (deepgramSocketRef.current) {
        deepgramSocketRef.current.close()
      }

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <Landing />
      </div>
    )
  }

  if (!user) {
    return <Landing />
  }

  // Connect to the Bluetooth device
  const connectToDevice = async () => {
    try {
      setIsConnecting(true)
      setErrorMessage("")

      // Check if Web Bluetooth API is available
      if (!navigator.bluetooth) {
        throw new Error(
          "Web Bluetooth API is not available in your browser. Please use Chrome, Edge, or another compatible browser.",
        )
      }

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error(
          "Web Bluetooth API requires a secure context (HTTPS or localhost). Please access this page via HTTPS.",
        )
      }

      // Request the Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [AUDIO_SERVICE_UUID] }],
      })

      // Store the device reference
      bluetoothDeviceRef.current = device

      // Connect to the GATT server
      const server = await device.gatt?.connect()
      if (!server) {
        throw new Error("Failed to connect to GATT server")
      }

      // Get the primary service
      const service = await server.getPrimaryService(AUDIO_SERVICE_UUID)
      if (!service) {
        throw new Error("Failed to get primary service")
      }

      // Get the characteristics
      const audioChar = await service.getCharacteristic(AUDIO_CHARACTERISTIC_UUID)
      const commandChar = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID)

      if (!audioChar || !commandChar) {
        throw new Error("Failed to get required characteristics")
      }

      // Store characteristic references
      audioCharRef.current = audioChar
      commandCharRef.current = commandChar

      setDeviceName(device.name || "Unknown Device")

      // Set up notifications for audio data
      await audioChar.startNotifications()
      audioChar.addEventListener("characteristicvaluechanged", handleAudioData)

      setIsConnected(true)

      // Set up disconnect listener
      device.addEventListener("gattserverdisconnected", handleDisconnect)

      console.log("Connected to device and set up characteristics")
    } catch (error) {
      console.error("Bluetooth connection error:", error)
      setErrorMessage(`Connection error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle disconnection
  const handleDisconnect = () => {
    setIsConnected(false)
    setIsRecording(false)
    audioCharRef.current = null
    commandCharRef.current = null
    setErrorMessage("Device disconnected")

    // Close Deepgram connection if open
    if (deepgramSocketRef.current && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
      deepgramSocketRef.current.close()
      deepgramSocketRef.current = null
    }
  }

  // Handle incoming audio data from the Bluetooth device
  const handleAudioData = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!value) {
      console.log("No audio data received from BLE device")
      return
    }

    // Increment packet counter
    setPacketCount((prev) => prev + 1)
    console.log(`Received audio packet #${packetCount + 1} from BLE device`)

    // Convert the received data to Int16Array (16-bit PCM audio)
    const buffer = value.buffer
    const audioSamples = new Int16Array(buffer)
    console.log(`Audio packet size: ${audioSamples.length} samples`)

    // Store the audio chunk for processing
    audioChunksRef.current.push(audioSamples)

    // Convert to Float32Array for visualization
    const floatSamples = new Float32Array(audioSamples.length)
    for (let i = 0; i < audioSamples.length; i++) {
      // Convert from Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      floatSamples[i] = audioSamples[i] / 32768.0
    }

    // Update visualizer
    setAudioData(floatSamples)

    // Send audio data to Deepgram for real-time transcription
    if (isRecording && deepgramSocketRef.current && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        // Send raw audio buffer directly to Deepgram
        deepgramSocketRef.current.send(buffer)
        console.log(`Sent audio chunk of size ${buffer.byteLength} bytes to Deepgram`)
      } catch (error) {
        console.error("Error sending audio to Deepgram:", error)
        // If there's an error sending, try to reconnect
        if (isRecording) {
          console.log("Attempting to reconnect to Deepgram...")
          initDeepgramConnection()
        }
      }
    } else {
      console.log("Not sending to Deepgram - Recording:", isRecording, "Socket state:", deepgramSocketRef.current?.readyState)
      // If we're supposed to be recording but the socket isn't open, try to reconnect
      if (isRecording && (!deepgramSocketRef.current || deepgramSocketRef.current.readyState !== WebSocket.OPEN)) {
        console.log("Attempting to reconnect to Deepgram...")
        initDeepgramConnection()
      }
    }
  }

  // Initialize Deepgram WebSocket connection
  const initDeepgramConnection = async () => {
    try {
      setIsTranscribing(true)

      // Close existing connection if any
      if (deepgramSocketRef.current) {
        deepgramSocketRef.current.close()
      }

      // Create a new WebSocket connection to Deepgram
      const socket = await transcribeAudio({
        onTranscript: (transcript) => {
          if (transcript && transcript.trim() !== "") {
            setTranscription((prev) => {
              // If the new transcript is a continuation, append it
              // Otherwise add it as a new line
              if (prev.endsWith(transcript.split(" ")[0])) {
                return prev + transcript.substring(transcript.indexOf(" "))
              } else if (prev) {
                return prev + " " + transcript
              }
              return transcript
            })
          }
        },
        onError: (error) => {
          console.error("Deepgram error:", error)
          setErrorMessage(`Transcription error: ${error}`)
          // Don't stop recording on error, just log it
        },
        onClose: () => {
          setIsTranscribing(false)
          // Don't stop recording when connection closes, we'll try to reconnect
          console.log("Deepgram connection closed")
          // Try to reconnect if we're still supposed to be recording
          if (isRecording) {
            console.log("Attempting to reconnect to Deepgram...")
            initDeepgramConnection()
          }
        },
      })

      // Wait for the WebSocket to be in OPEN state
      await new Promise<void>((resolve, reject) => {
        const checkConnection = () => {
          if (socket.readyState === WebSocket.OPEN) {
            resolve()
          } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
            reject(new Error("Failed to establish Deepgram connection"))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })

      deepgramSocketRef.current = socket
      console.log("Deepgram connection established")
    } catch (error) {
      console.error("Failed to initialize Deepgram:", error)
      setErrorMessage(`Failed to initialize transcription: ${error instanceof Error ? error.message : String(error)}`)
      setIsTranscribing(false)
      throw error // Re-throw to be caught by startRecording
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!isConnected || !commandCharRef.current) {
      setErrorMessage("Please connect to a device first")
      return
    }

    try {
      // Clear previous transcription and audio chunks
      setTranscription("")
      audioChunksRef.current = []
      setPacketCount(0)

      // Set recording state first
      setIsRecording(true)

      // Send START command to the device first
      const encoder = new TextEncoder()
      const startCommand = encoder.encode("START")
      await commandCharRef.current.writeValue(startCommand)
      console.log("Sent START command to device")

      // Then initialize Deepgram connection
      await initDeepgramConnection()

      setErrorMessage("")
    } catch (error) {
      console.error("Error starting recording:", error)
      setErrorMessage(`Error starting recording: ${error instanceof Error ? error.message : String(error)}`)
      setIsTranscribing(false)
      setIsRecording(false) // Only reset recording state on error
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (!isConnected || !commandCharRef.current) return

    try {
      // First close Deepgram connection
      if (deepgramSocketRef.current && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
        deepgramSocketRef.current.close()
        deepgramSocketRef.current = null
      }

      // Then send STOP command to the device
      const encoder = new TextEncoder()
      const stopCommand = encoder.encode("STOP")
      
      // Add a small delay to ensure previous GATT operations are complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await commandCharRef.current.writeValue(stopCommand)

      console.log("Sent STOP command to device")

      // Only set states to false after everything is done
      setIsRecording(false)
      setIsTranscribing(false)
    } catch (error) {
      console.error("Error stopping recording:", error)
      setErrorMessage(`Error stopping recording: ${error instanceof Error ? error.message : String(error)}`)
      // Even if there's an error, we should still try to reset states
      setIsRecording(false)
      setIsTranscribing(false)
    }
  }

  // Disconnect from the device
  const disconnect = async () => {
    try {
      // First stop recording if we're recording
      if (isRecording) {
        await stopRecording()
      }

      // Close Deepgram connection if open
      if (deepgramSocketRef.current) {
        deepgramSocketRef.current.close()
        deepgramSocketRef.current = null
      }

      // Disconnect from the GATT server
      if (bluetoothDeviceRef.current?.gatt?.connected) {
        await bluetoothDeviceRef.current.gatt.disconnect()
      }

      // Clean up all references
      bluetoothDeviceRef.current = null
      audioCharRef.current = null
      commandCharRef.current = null
      audioContextRef.current = null
      audioWorkletNodeRef.current = null
      audioChunksRef.current = []

      // Reset states
      setIsConnected(false)
      setIsRecording(false)
      setIsTranscribing(false)
      setDeviceName("")
      setPacketCount(0)
      setAudioData(null)
      setTranscription("")
      setErrorMessage("")

      console.log("Successfully disconnected from device")
    } catch (error) {
      console.error("Error disconnecting:", error)
      setErrorMessage(`Error disconnecting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AuraZ Panel</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user.displayName}</span>
          <Button variant="outline" onClick={logout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <TabsComponent
        isConnected={isConnected}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        deviceName={deviceName}
        packetCount={packetCount}
        audioData={audioData}
        transcription={transcription}
        errorMessage={errorMessage}
      />

      <div className="flex justify-center gap-4 mt-8">
        {!isConnected ? (
          <Button onClick={connectToDevice} disabled={isConnecting} className="flex items-center gap-2">
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Bluetooth className="h-4 w-4" />
                Connect Device
              </>
            )}
          </Button>
        ) : (
          <>
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={!isConnected || isRecording}
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                <StopCircle className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            <Button variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
