"use client"

import { Bluetooth } from "lucide-react"

interface DeviceInfoProps {
  deviceName: string
  packetCount: number
  isRecording: boolean
}

export default function DeviceInfo({ deviceName, packetCount, isRecording }: DeviceInfoProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div
        className={`w-12 h-12 rounded-full ${isRecording ? "bg-red-100 dark:bg-red-900" : "bg-blue-100 dark:bg-blue-900"} flex items-center justify-center`}
      >
        <Bluetooth
          className={`h-6 w-6 ${isRecording ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
        />
      </div>
      <div>
        <h3 className="font-medium">Connected to:</h3>
        <p className="text-lg font-bold">{deviceName}</p>
        <p className="text-sm text-green-600 dark:text-green-400">Status: Connected</p>
        <p className="text-xs text-gray-500">
          {isRecording ? "Recording" : "Idle"} • {packetCount} packets received
        </p>
      </div>
    </div>
  )
}
