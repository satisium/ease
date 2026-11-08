"use client"

import * as React from "react"
import { CursorPointer01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useStudioStore } from "@/store/useStudioStore"
import {
  resolveEase,
  getEasedValue,
} from "@/components/studio/domain/studio-kinetics"

export function ButtonScenario() {
  const activeCurveId = useStudioStore((s) => s.activeCurveId)
  const customCurves = useStudioStore((s) => s.customCurves)
  const scenarioSlots = useStudioStore((s) => s.scenarioSlots)
  const scrubProgress = useStudioStore((s) => s.scrubProgress)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const isScrubbing = useStudioStore((s) => s.isScrubbing)
  const isReducedMotion = useStudioStore((s) => s.isReducedMotion)
  const triggerAudition = useStudioStore((s) => s.triggerAudition)

  const [isPointerDown, setIsPointerDown] = React.useState(false)
  const [clickCount, setClickCount] = React.useState(0)

  // 1. Resolve assigned curve for the "press" slot
  const currentSlot = scenarioSlots["button"]
  const pressCurveId = currentSlot?.press || activeCurveId
  const pressCurve = React.useMemo(() => {
    return resolveEase(pressCurveId, customCurves)
  }, [pressCurveId, customCurves])

  // 2. Solve mathematical eased progress (0 -> 1)
  const easedProgress = React.useMemo(() => {
    return getEasedValue(scrubProgress, pressCurve, isReducedMotion)
  }, [scrubProgress, pressCurve, isReducedMotion])

  // 3. Physical compression calculations
  const isSimulating = isPlaying || isScrubbing
  const compressionFactor = isSimulating
    ? Math.min(1.2, Math.max(0, easedProgress))
    : isPointerDown
      ? 1
      : 0

  const scale = 1.0 - compressionFactor * 0.06
  const shadowBlur = Math.round((1 - compressionFactor) * 12)
  const isCompressed = compressionFactor > 0.4

  const handlePointerDown = () => {
    setIsPointerDown(true)
    triggerAudition()
  }

  const handlePointerUp = () => {
    setIsPointerDown(false)
    setClickCount((c) => c + 1)
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="relative w-full max-w-[420px]">
        {/* Interactive Tactile Instrument Container */}
        <div className="rounded-[20px] border border-border bg-card p-6 shadow-xl">
          {/* Header Strip */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground">
                <HugeiconsIcon
                  icon={CursorPointer01Icon}
                  className="size-3.5"
                />
              </div>
              <div>
                <h4 className="font-heading text-xs font-semibold text-foreground">
                  Tactile Button Instrument
                </h4>
                <p className="font-sans text-[11px] text-muted-foreground">
                  Auditioning press compression and haptic rebound physics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <span className="rounded bg-muted px-2 py-0.5 font-medium">
                {clickCount} Taps
              </span>
            </div>
          </div>

          {/* Interactive Button Workstation Center */}
          <div className="flex min-h-[160px] flex-col items-center justify-center py-6">
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setIsPointerDown(false)}
              style={{
                transform: `scale(${scale})`,
                boxShadow: `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0, 0, 0, 0.08)`,
              }}
              className="group relative inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary px-8 py-4 transition-colors will-change-transform select-none hover:bg-muted"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-background text-foreground shadow-xs">
                <HugeiconsIcon
                  icon={isCompressed ? SparklesIcon : CursorPointer01Icon}
                  className={cn(
                    "size-3.5 transition-transform",
                    isCompressed && "scale-110 text-foreground"
                  )}
                />
              </div>

              <div className="flex flex-col text-left">
                <span className="font-heading text-xs font-semibold tracking-tight text-foreground">
                  Commit Kinetic Action
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {isCompressed
                    ? "Compressing Surface..."
                    : "Press or Space to Audition"}
                </span>
              </div>

              <div className="ml-2 flex items-center">
                <span
                  className={cn(
                    "flex size-2 rounded-full transition-colors",
                    isCompressed ? "bg-foreground" : "bg-muted-foreground"
                  )}
                />
              </div>
            </button>
          </div>

          {/* Real-time Kinetic Diagnostics Grid */}
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
            <div className="rounded-lg border border-border bg-muted p-2.5">
              <span className="font-sans text-[10px] text-muted-foreground">
                Scale Factor
              </span>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-foreground">
                {scale.toFixed(3)}x
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted p-2.5">
              <span className="font-sans text-[10px] text-muted-foreground">
                Compression
              </span>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-foreground">
                {(compressionFactor * 100).toFixed(0)}%
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted p-2.5">
              <span className="font-sans text-[10px] text-muted-foreground">
                Contact State
              </span>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-foreground">
                {isCompressed ? "PRESSED" : isSimulating ? "REBOUND" : "IDLE"}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Curve Attribution Badge */}
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-foreground" />
            <span>Press Slot:</span>
            <span className="font-medium text-foreground">
              {pressCurve.name}
            </span>
          </span>
          <span className="font-mono text-[10px]">
            {Math.round(pressCurve.duration)}ms · {pressCurve.engine}
          </span>
        </div>
      </div>
    </div>
  )
}
