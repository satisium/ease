"use client"

import * as React from "react"
import { CursorPointer01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export function ButtonHabitat() {
  const { bindRef, triggerLive } = useTransitionTrack("button:press")
  const [clickCount, setClickCount] = React.useState(0)

  const handleClick = () => {
    setClickCount((c) => c + 1)
    triggerLive()
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="relative w-full max-w-[400px]">
        {/* Tactile Button Instrument Card (Borderless Satisium Card) */}
        <div className="rounded-[20px] bg-card p-6">
          {/* Header Strip */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-[8px] bg-secondary text-foreground">
                <HugeiconsIcon
                  icon={CursorPointer01Icon}
                  className="size-3.5"
                />
              </div>
              <div>
                <h4 className="font-heading text-xs font-semibold text-foreground">
                  Tactile Button
                </h4>
                <p className="font-sans text-[11px] text-muted-foreground">
                  Auditioning press compression and haptic rebound physics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 font-sans text-[10px] text-muted-foreground tabular-nums">
              <span className="rounded-[6px] bg-muted px-2 py-0.5 font-medium">
                {clickCount} Taps
              </span>
            </div>
          </div>

          {/* Interactive Button Workstation Center */}
          <div className="flex min-h-[160px] flex-col items-center justify-center py-6">
            <button
              type="button"
              ref={bindRef(["scale", "opacity"])}
              onClick={handleClick}
              aria-label="Commit kinetic action"
              className="group relative inline-flex cursor-pointer items-center gap-3 rounded-[14px] bg-secondary px-8 py-4 will-change-transform select-none hover:bg-muted active:scale-98"
            >
              <div className="flex size-6 items-center justify-center rounded-[8px] bg-background text-foreground">
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
              </div>

              <div className="flex flex-col text-left">
                <span className="font-heading text-xs font-semibold tracking-tight text-foreground">
                  Commit Kinetic Action
                </span>
                <span className="font-sans text-[10px] text-muted-foreground">
                  Press or Space to Audition
                </span>
              </div>

              <div className="ml-2 flex items-center">
                <kbd className="rounded-[4px] bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
                  Space
                </kbd>
              </div>
            </button>
          </div>

          {/* Real-time Channel Metrics Strip */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="rounded-[10px] bg-muted p-2.5">
              <span className="font-sans text-[10px] text-muted-foreground">
                Channel: Scale
              </span>
              <p className="mt-0.5 font-sans text-[11px] font-semibold text-foreground tabular-nums">
                1.000 ↔ 0.960
              </p>
            </div>

            <div className="rounded-[10px] bg-muted p-2.5">
              <span className="font-sans text-[10px] text-muted-foreground">
                Channel: Opacity
              </span>
              <p className="mt-0.5 font-sans text-[11px] font-semibold text-foreground tabular-nums">
                1.000 ↔ 0.920
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
