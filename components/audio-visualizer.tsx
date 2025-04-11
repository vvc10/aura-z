"use client"

import { useRef, useEffect } from "react"

interface AudioVisualizerProps {
  audioData: Float32Array | null
  isRecording: boolean
}

export default function AudioVisualizer({ audioData, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataPointsRef = useRef<Float32Array[]>([])

  // Keep a history of audio data for a smoother visualization
  useEffect(() => {
    if (audioData) {
      // Add new data to history
      dataPointsRef.current.push(audioData)

      // Limit history length
      if (dataPointsRef.current.length > 10) {
        dataPointsRef.current.shift()
      }
    }
  }, [audioData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Animation function
    const animate = () => {
      if (!canvas || !ctx) return

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const width = canvas.width
      const height = canvas.height

      // Draw background
      ctx.fillStyle = isRecording ? "rgba(239, 68, 68, 0.05)" : "rgba(59, 130, 246, 0.05)"
      ctx.fillRect(0, 0, width, height)

      // Draw center line
      ctx.strokeStyle = isRecording ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      // Draw waveform from history
      if (dataPointsRef.current.length > 0) {
        // Draw each history item with decreasing opacity
        dataPointsRef.current.forEach((historyData, historyIndex) => {
          const opacity = 0.3 + 0.7 * (historyIndex / dataPointsRef.current.length)

          ctx.strokeStyle = isRecording ? `rgba(239, 68, 68, ${opacity})` : `rgba(59, 130, 246, ${opacity})`

          ctx.lineWidth = 2
          ctx.beginPath()

          const sliceWidth = width / historyData.length

          for (let i = 0; i < historyData.length; i++) {
            const x = i * sliceWidth
            const y = (historyData[i] * height) / 2 + height / 2

            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }

          ctx.stroke()
        })
      }

      // Add a recording indicator
      if (isRecording) {
        const now = Date.now()
        const pulsate = 0.7 + 0.3 * Math.sin(now / 200)

        ctx.fillStyle = `rgba(239, 68, 68, ${pulsate})`
        ctx.beginPath()
        ctx.arc(20, 20, 8, 0, 2 * Math.PI)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isRecording])

  return (
    <div className="w-full h-40 bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!audioData && !isRecording && dataPointsRef.current.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No audio data available
        </div>
      )}
    </div>
  )
}
