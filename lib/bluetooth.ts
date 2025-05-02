interface BluetoothManagerOptions {
  onConnectionStatusChange: (connected: boolean, status: string) => void
  onPlaybackStatusChange: (playing: boolean) => void
  onAudioDataReceived: (data: Int16Array) => void
  onRecordingSaved: (url: string, filename: string) => void
  onError: (error: string) => void
}

// Supported languages for transcription
export type TranscriptionLanguage = "en" | "hi" | "mr" | "auto"

export class BluetoothManager {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private service: BluetoothRemoteGATTService | null = null
  private audioCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
  private isConnected = false
  private connectionAttempts = 0
  private maxConnectionAttempts = 3

  // Xiao device specific UUIDs
  private SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"
  private CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"

  // Audio parameters
  private SAMPLE_RATE = 8000
  private SAMPLE_WIDTH = 2 // 16-bit audio
  private CHANNELS = 1 // Mono audio
  private CODEC = "pcm"

  // Audio streaming
  private audioContext: AudioContext
  private isPlaying = false

  // Continuous recording
  private audioBuffer: Int16Array = new Int16Array(0)
  private recordingInterval: number | null = null
  private RECORDING_DURATION = 10000 // 10 seconds, matching the Python script
  private lastSaveTime = 0

  // Callbacks
  private callbacks: BluetoothManagerOptions

  constructor(options: BluetoothManagerOptions) {
    this.callbacks = options

    // Initialize AudioContext
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.SAMPLE_RATE,
    })
  }

  async connect() {
    try {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        const errorMsg = "Maximum connection attempts reached"
        console.error(errorMsg)
        this.callbacks.onConnectionStatusChange(false, errorMsg)
        this.callbacks.onError(errorMsg)
        return
      }

      this.connectionAttempts++
      console.log(`Connection attempt ${this.connectionAttempts}`)

      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser. Try Chrome or Edge.")
      }

      // Request the device with the specific service UUID
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }],
        optionalServices: [this.SERVICE_UUID],
      })

      // Add connection state change listener
      this.device.addEventListener("gattserverdisconnected", this.handleDisconnection.bind(this))

      // Connect to the device
      console.log("Connecting to GATT server...")
      this.server = await this.device.gatt?.connect()

      if (!this.server) {
        throw new Error("Failed to connect to GATT server")
      }

      // Get the service
      console.log("Getting primary service...")
      this.service = await this.server.getPrimaryService(this.SERVICE_UUID)

      // Get the characteristic
      console.log("Getting audio characteristic...")
      this.audioCharacteristic = await this.service.getCharacteristic(this.CHARACTERISTIC_UUID)

      // Set up notifications
      console.log("Setting up notifications...")
      await this.audioCharacteristic.startNotifications()
      this.audioCharacteristic.addEventListener("characteristicvaluechanged", this.handleAudioData.bind(this))

      this.isConnected = true
      this.connectionAttempts = 0
      this.callbacks.onConnectionStatusChange(true, "Connected")

      // Removed automatic start of continuous recording
    } catch (error) {
      console.error("Connection error:", error)
      this.handleConnectionError(error)
    }
  }

  handleDisconnection() {
    console.log("Device disconnected")
    this.isConnected = false
    this.server = null
    this.service = null
    this.audioCharacteristic = null
    this.callbacks.onConnectionStatusChange(false, "Disconnected")

    // Stop continuous recording
    this.stopContinuousRecording()

    // Attempt to reconnect if we were previously connected
    if (this.device) {
      console.log("Attempting to reconnect...")
      setTimeout(() => this.connect(), 1000)
    }
  }

  handleConnectionError(error: any) {
    console.error("Connection error details:", error)
    let errorMessage = "Connection failed"

    if (error.name === "NetworkError") {
      errorMessage = "Device disconnected. Please try again."
    } else if (error.name === "SecurityError") {
      errorMessage = "Bluetooth access denied. Please enable Bluetooth and try again."
    } else if (error.name === "NotFoundError") {
      errorMessage = "Device not found. Make sure it is powered on and in pairing mode."
    } else if (error.message) {
      errorMessage = error.message
    }

    this.callbacks.onConnectionStatusChange(false, errorMessage)
    this.callbacks.onError(errorMessage)

    // If it's a network error, try to reconnect
    if (error.name === "NetworkError" && this.connectionAttempts < this.maxConnectionAttempts) {
      console.log("Retrying connection...")
      setTimeout(() => this.connect(), 1000)
    }
  }

  async disconnect() {
    try {
      // Stop continuous recording
      this.stopContinuousRecording()

      if (this.device && this.device.gatt?.connected) {
        console.log("Disconnecting...")
        await this.device.gatt.disconnect()
      }

      this.isConnected = false
      this.server = null
      this.service = null
      this.audioCharacteristic = null
      this.callbacks.onConnectionStatusChange(false, "Disconnected")
    } catch (error) {
      console.error("Disconnection error:", error)
      this.callbacks.onError(`Disconnection error: ${error}`)
    }
  }

  handleAudioData(event: Event) {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const data = characteristic.value

    if (!data) return

    const audioData = new Uint8Array(data.buffer)

    // Skip the first 3 bytes (header) like the test client
    const audioBytes = audioData.slice(3)

    // Process the audio data
    const processedData = this.filterAudioData(audioBytes)

    // Add to audio buffer for continuous recording
    this.appendToAudioBuffer(processedData)

    // Send callback with audio data for visualization
    this.callbacks.onAudioDataReceived(processedData)
  }

  appendToAudioBuffer(newData: Int16Array) {
    // Create a new buffer with combined data
    const newBuffer = new Int16Array(this.audioBuffer.length + newData.length)
    newBuffer.set(this.audioBuffer)
    newBuffer.set(newData, this.audioBuffer.length)
    this.audioBuffer = newBuffer

    // Check if it's time to save a recording
    const currentTime = Date.now()
    if (currentTime - this.lastSaveTime >= this.RECORDING_DURATION) {
      this.saveCurrentRecording()
      this.lastSaveTime = currentTime
    }
  }

  startContinuousRecording() {
    console.log("Starting continuous recording")
    this.audioBuffer = new Int16Array(0)
    this.lastSaveTime = Date.now()

    // Set up an interval to save recordings periodically
    // This is a backup in case we don't receive enough data to trigger saves
    this.recordingInterval = window.setInterval(() => {
      if (this.audioBuffer.length > 0) {
        this.saveCurrentRecording()
      }
    }, this.RECORDING_DURATION)
  }

  stopContinuousRecording() {
    console.log("Stopping continuous recording")

    // Save any remaining audio
    if (this.audioBuffer.length > 0) {
      this.saveCurrentRecording()
    }

    // Clear the interval
    if (this.recordingInterval !== null) {
      clearInterval(this.recordingInterval)
      this.recordingInterval = null
    }
  }

  saveCurrentRecording() {
    if (this.audioBuffer.length === 0) return

    console.log(`Saving recording with ${this.audioBuffer.length} samples`)

    const wavData = this.createWavFile(this.audioBuffer)
    const blob = new Blob([wavData], { type: "audio/wav" })
    const url = URL.createObjectURL(blob)
    const filename = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.wav`

    // Notify about the new recording
    this.callbacks.onRecordingSaved(url, filename)

    // Clear the buffer for the next recording
    this.audioBuffer = new Int16Array(0)
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying
    this.callbacks.onPlaybackStatusChange(this.isPlaying)
  }

  filterAudioData(audioData: Uint8Array): Int16Array {
    if (this.CODEC === "mulaw") {
      // Convert µ-law to linear PCM
      const pcmData = new Int16Array(audioData.length)
      for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = this.ulaw2linear(audioData[i])
      }
      return pcmData
    } else if (this.CODEC === "pcm") {
      // Ensure even length for 16-bit samples
      const evenLength = audioData.length - (audioData.length % 2)
      const pcmData = new Int16Array(audioData.buffer.slice(0, evenLength))
      return pcmData
    }
    return new Int16Array(0)
  }

  ulaw2linear(ulawByte: number): number {
    const EXPONENT_LUT = [0, 132, 396, 924, 1980, 4092, 8316, 16764]
    ulawByte = ~ulawByte & 0xff
    const sign = ulawByte & 0x80
    const exponent = (ulawByte >> 4) & 0x07
    const mantissa = ulawByte & 0x0f
    let sample = EXPONENT_LUT[exponent] + (mantissa << (exponent + 3))
    if (sign !== 0) {
      sample = -sample
    }
    return sample
  }

  createWavFile(audioData: Int16Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + audioData.length * 2)
    const view = new DataView(buffer)

    // Write WAV header
    this.writeString(view, 0, "RIFF")
    view.setUint32(4, 36 + audioData.length * 2, true)
    this.writeString(view, 8, "WAVE")
    this.writeString(view, 12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, this.CHANNELS, true)
    view.setUint32(24, this.SAMPLE_RATE, true)
    view.setUint32(28, this.SAMPLE_RATE * this.CHANNELS * this.SAMPLE_WIDTH, true)
    view.setUint16(32, this.CHANNELS * this.SAMPLE_WIDTH, true)
    view.setUint16(34, this.SAMPLE_WIDTH * 8, true)
    this.writeString(view, 36, "data")
    view.setUint32(40, audioData.length * 2, true)

    // Write audio data
    const offset = 44
    for (let i = 0; i < audioData.length; i++) {
      view.setInt16(offset + i * 2, audioData[i], true)
    }

    return buffer
  }

  writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // Enhanced method to transcribe a recording with multi-language support
  async transcribeRecording(audioBlob: Blob, language: TranscriptionLanguage = "auto"): Promise<string> {
    try {
      console.log(`Transcribing recording in language: ${language}...`)

      // Build query parameters for enhanced accuracy
      const queryParams = new URLSearchParams({
        model: "nova-3", // Using nova-3 model for better accuracy [^3]
        punctuate: "true",
        diarize: "false", // Set to false for better accuracy on single-speaker audio
        smart_format: "true", // Improves formatting of the transcript
        utterances: "true", // Segment audio into utterances for better accuracy
        filler_words: "false", // Remove filler words for cleaner transcripts
      })

      // Set language parameter based on input
      if (language !== "auto") {
        queryParams.append("language", language)
      }

      // Call Deepgram API with enhanced parameters
      const response = await fetch(`https://api.deepgram.com/v1/listen?${queryParams.toString()}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.NEXT_PUBLIC_API_KEY}`,
          "Content-Type": "audio/wav",
        },
        body: audioBlob,
      })

      console.log("Deepgram API Response:", response)
      const data = await response.json()
      console.log("Deepgram API Response Data:", data)

      if (!data || !data.results) {
        console.log("Deepgram API returned an empty or invalid response:", data)
        return "No transcription available"
      }

      // Extract the transcript from the response
      if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        return data.results.channels[0].alternatives[0].transcript
      } else {
        return "No transcription available"
      }
    } catch (error) {
      console.error("Transcription error:", error)
      throw error
    }
  }
}
