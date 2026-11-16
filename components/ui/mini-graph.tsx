"use client"

import { useMemo } from "react"
import {
  BezierParams,
  SpringParams,
  computeSpringSettleTimeMs,
  solveSpringAtTime,
} from "@/core"

export interface MiniGraphProps {
  mode: "bezier" | "spring"
  bezier?: BezierParams
  spring?: SpringParams
  className?: string
  dot?: { x: number; y: number }
  showDiagonal?: boolean
}

// Fixed small coordinate system for icons
const ICON_SIZE = { width: 100, height: 100, padding: 10 } as const

const mathToSvg = (point: { x: number; y: number }) => {
  const availableWidth = ICON_SIZE.width - ICON_SIZE.padding * 2
  const availableHeight = ICON_SIZE.height - ICON_SIZE.padding * 2

  return {
    x: point.x * availableWidth + ICON_SIZE.padding,
    y: (1 - point.y) * availableHeight + ICON_SIZE.padding,
  }
}

export const MiniGraph = ({
  mode,
  bezier,
  spring,
  className,
  dot,
  showDiagonal,
}: MiniGraphProps) => {
  const pathData = useMemo(() => {
    // 1. BEZIER LOGIC
    if (mode === "bezier" && bezier) {
      const start = mathToSvg({ x: 0, y: 0 })
      const end = mathToSvg({ x: 1, y: 1 })
      const p1 = mathToSvg(bezier.p1)
      const p2 = mathToSvg(bezier.p2)
      return `M ${start.x} ${start.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${end.x} ${end.y}`
    }

    // 2. SPRING LOGIC
    if (mode === "spring" && spring) {
      const settleMs = Math.max(20, computeSpringSettleTimeMs(spring, 0.005))
      const steps = 60
      const points: Array<{ x: number; y: number }> = []

      for (let i = 0; i <= steps; i++) {
        const mathX = i / steps
        const elapsedMs = mathX * settleMs
        const { value } = solveSpringAtTime(spring, elapsedMs)
        points.push(mathToSvg({ x: mathX, y: value }))
      }

      return points
        .map((pt, index) => `${index === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
        .join(" ")
    }

    return ""
  }, [mode, bezier, spring])

  return (
    <svg
      viewBox={`0 0 ${ICON_SIZE.width} ${ICON_SIZE.height}`}
      className={className}
      preserveAspectRatio="none"
      suppressHydrationWarning
    >
      {showDiagonal && (
        <line
          x1={mathToSvg({ x: 0, y: 0 }).x}
          y1={mathToSvg({ x: 0, y: 0 }).y}
          x2={mathToSvg({ x: 1, y: 1 }).x}
          y2={mathToSvg({ x: 1, y: 1 }).y}
          strokeDasharray="2 3"
          strokeWidth="1"
          className="stroke-muted"
        />
      )}
      <path
        d={pathData}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        suppressHydrationWarning
      />
      {dot && (
        <circle
          cx={mathToSvg({ x: Math.max(0, Math.min(1, dot.x)), y: dot.y }).x}
          cy={mathToSvg({ x: Math.max(0, Math.min(1, dot.x)), y: dot.y }).y}
          r={3.5}
          className="fill-foreground"
        />
      )}
    </svg>
  )
}
