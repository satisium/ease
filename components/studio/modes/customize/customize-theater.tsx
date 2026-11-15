"use client"

/**
 * @file components/studio/modes/customize/customize-theater.tsx
 * @description Master dual-pane workspace theater for Customize Mode (Curve Editor Canvas + Micro-Preview).
 *
 * Invariants:
 * - Direct footprint replacement for PreviewTheater inside Center Stage.
 * - 58/42 vertical proportional split between SVG Curve Canvas and Tactile Micro-Preview.
 * - Strict Satisium Design Language: 0 borders, 0 shadows, rounded-[20px] background squircle.
 */

import * as React from "react"
import { CurveEditorCanvas } from "./curve-editor-canvas"
import { CustomizeMicroPreview } from "./customize-micro-preview"
import { cn } from "@/lib/utils"

export interface CustomizeTheaterProps {
  className?: string
}

export function CustomizeTheater({ className }: CustomizeTheaterProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-2 gap-2 rounded-[20px] bg-background p-2 select-none",
        className
      )}
    >
      {/* Left Column (50%): Full-Height SVG Curve & Spring Editor Canvas */}
      <div className="flex min-h-0 flex-1 flex-col">
        <CurveEditorCanvas />
      </div>

      {/* Right Column (50%): Full-Height Live Micro-Preview */}
      <div className="flex min-h-0 flex-1 flex-col">
        <CustomizeMicroPreview />
      </div>
    </div>
  )
}
