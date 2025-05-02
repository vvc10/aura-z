"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { useTheme } from "next-themes"

interface AudioVisualizerProps {
  audioData: Int16Array | null
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const animationRef = useRef<number>()
  const bufferRef = useRef<Int16Array>(new Int16Array(0))

  useEffect(() => {
    if (audioData) {
      // Accumulate incoming audio data
      const newBuffer = new Int16Array(bufferRef.current.length + audioData.length)
      newBuffer.set(bufferRef.current)
      newBuffer.set(audioData, bufferRef.current.length)
      bufferRef.current = newBuffer
    }
  }, [audioData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      // Clear canvas
      const isDarkMode = theme === "dark"
      ctx.fillStyle = isDarkMode ? "#1e293b" : "#f8f9fa"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Get current buffer and reset for next frame
      const currentBuffer = bufferRef.current
      bufferRef.current = new Int16Array(0)

      if (currentBuffer.length === 0) {
        animationRef.current = requestAnimationFrame(draw)
        return
      }

      // Draw waveform
      ctx.strokeStyle = isDarkMode ? "#60a5fa" : "#3498db"
      ctx.lineWidth = 2
      ctx.beginPath()

      const centerY = canvas.height / 2
      const step = Math.ceil(currentBuffer.length / canvas.width) // Adjust for canvas width
      const scale = canvas.height / 65536 // Normalize to canvas height

      for (let x = 0; x < canvas.width; x++) {
        const startIdx = Math.floor(x * step)
        const endIdx = Math.min(Math.floor((x + 1) * step), currentBuffer.length)
        
        if (startIdx >= endIdx) continue

        // Calculate average amplitude for this x position
        let sum = 0
        for (let i = startIdx; i < endIdx; i++) {
          sum += Math.abs(currentBuffer[i])
        }
        const avgAmplitude = sum / (endIdx - startIdx)
        
        // Convert to y position (0 is top, canvas.height is bottom)
        const y = centerY - (avgAmplitude * scale * 0.5) // Scale down for better visibility
        
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()
      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [theme])

  return (
    <div className="w-full h-[200px] bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200} 
        className="w-full h-full"
      />
    </div>
  )
}

export default AudioVisualizer