"use client"

import * as React from "react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useStageBridge } from "@/components/studio/bridge"
import {
  resolveEase,
  getEasedValue,
} from "@/components/studio/domain/studio-kinetics"
import { INITIAL_CUSTOM_CURVES } from "@/components/studio/domain/studio-curves"

export default function StagePage() {
  const { stageState, emitAction } = useStageBridge()

  // 1. Resolve Entrance & Exit curves for the Dialog
  const currentSlot =
    stageState.scenarioSlots["dialog"] ||
    stageState.scenarioSlots["modal"] ||
    {}
  const enterCurveId =
    currentSlot?.enter || currentSlot?.enterId || "modal-sheet"
  const exitCurveId = currentSlot?.exit || currentSlot?.exitId || "expo-in"

  const enterCurve = React.useMemo(() => {
    if (
      stageState.activeCurve &&
      (stageState.activeSlotId === "enter" ||
        stageState.activeCurve.id === enterCurveId)
    ) {
      return stageState.activeCurve
    }
    return resolveEase(enterCurveId, INITIAL_CUSTOM_CURVES)
  }, [enterCurveId, stageState.activeCurve, stageState.activeSlotId])

  const exitCurve = React.useMemo(() => {
    if (
      stageState.activeCurve &&
      (stageState.activeSlotId === "exit" ||
        stageState.activeCurve.id === exitCurveId)
    ) {
      return stageState.activeCurve
    }
    return resolveEase(exitCurveId, INITIAL_CUSTOM_CURVES)
  }, [exitCurveId, stageState.activeCurve, stageState.activeSlotId])

  const activeMotionCurve =
    stageState.scenarioPhase === "enter" ? enterCurve : exitCurve

  // 2. Solve mathematical eased progress (0 -> 1)
  const easedValue = React.useMemo(() => {
    return getEasedValue(
      stageState.scrubProgress,
      activeMotionCurve,
      stageState.isReducedMotion
    )
  }, [stageState.scrubProgress, activeMotionCurve, stageState.isReducedMotion])

  // 3. Physical Coordinated Transforms (Visually Vivid Amplitude)
  const isSimulating = stageState.isPlaying || stageState.isScrubbing

  let modalScale = 0.88
  let modalTranslateY = 44
  let modalOpacity = 0
  let backdropOpacity = 0

  if (
    isSimulating ||
    (stageState.scrubProgress > 0 && stageState.scrubProgress < 100)
  ) {
    if (stageState.scenarioPhase === "enter") {
      // Natural spring entrance: lifts up 44px -> 0px, scales 0.88 -> 1.0 (with genuine physical overshoot)
      modalScale = 0.88 + easedValue * 0.12
      modalTranslateY = Math.round((1 - easedValue) * 44)
      modalOpacity = Math.min(1, Math.max(0, easedValue))
      backdropOpacity = Math.min(1, Math.max(0, easedValue)) * 0.45
    } else {
      // Crisp exit: drops down 0px -> 36px, scales 1.0 -> 0.88, swift fade
      modalScale = 1.0 - easedValue * 0.12
      modalTranslateY = Math.round(easedValue * 36)
      modalOpacity = Math.max(0, 1 - easedValue)
      backdropOpacity = Math.max(0, (1 - easedValue) * 0.45)
    }
  } else {
    // Resting settled state (progress == 0 or progress == 100, not actively playing)
    const isOpen =
      stageState.scenarioPhase === "enter"
        ? stageState.scrubProgress >= 100 || stageState.scenarioOpen
        : stageState.scrubProgress <= 0 && stageState.scenarioOpen

    modalScale = isOpen ? 1 : 0.88
    modalTranslateY = isOpen ? 0 : 44
    modalOpacity = isOpen ? 1 : 0
    backdropOpacity = isOpen ? 0.45 : 0
  }

  const isModalVisible =
    modalOpacity > 0.01 || stageState.scenarioOpen || isSimulating

  // --- Satisium Pure Kinetic Dialog Experience ---
  // Core Laws: Zero Borders, Authentic Squircles (rounded-[8px] / rounded-[18px]), Monochrome Hierarchy
  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background font-sans text-foreground antialiased select-none">
      {/* Dead-Center Minimal Dialog Trigger (Pure Squircle, No Badge) */}
      <div className="flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => emitAction("open")}
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          Open Dialog
        </button>
      </div>

      {/* Precision Backdrop Scrim */}
      {isModalVisible && (
        <div
          onClick={() => emitAction("close")}
          style={{ opacity: backdropOpacity }}
          className="fixed inset-0 z-40 cursor-pointer bg-black backdrop-blur-xs transition-opacity duration-75"
        />
      )}

      {/* Satisium Borderless Squircle Dialog Surface */}
      {isModalVisible && (
        <Dialog
          open={isModalVisible}
          onOpenChange={(open) => emitAction(open ? "open" : "close")}
        >
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              style={{
                transform: `translateY(${modalTranslateY}px) scale(${modalScale})`,
                opacity: modalOpacity,
              }}
              role="dialog"
              aria-modal="true"
              className="pointer-events-auto relative w-full max-w-[380px] rounded-[18px] bg-card p-6 shadow-2xl will-change-transform"
            >
              {/* Dismiss Close Icon */}
              <button
                type="button"
                onClick={() => emitAction("close")}
                className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                <span className="sr-only">Close</span>
              </button>

              {/* Dialog Header */}
              <DialogHeader className="gap-1.5">
                <DialogTitle className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Edit Profile
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Make changes to your profile parameters here.
                </DialogDescription>
              </DialogHeader>

              {/* Recessed Borderless Squircle Input Troughs */}
              <div className="flex flex-col gap-2.5 py-4">
                <div className="flex items-center gap-3">
                  <span className="w-16 text-right font-sans text-xs text-muted-foreground">
                    Name
                  </span>
                  <input
                    defaultValue="Satishkumar"
                    className="h-8 flex-1 rounded-[8px] bg-secondary px-3 font-sans text-xs text-foreground transition-colors outline-none focus:bg-muted"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-right font-sans text-xs text-muted-foreground">
                    Username
                  </span>
                  <input
                    defaultValue="@iamsatish4564"
                    className="h-8 flex-1 rounded-[8px] bg-secondary px-3 font-sans text-xs text-foreground transition-colors outline-none focus:bg-muted"
                  />
                </div>
              </div>

              {/* Pure Monochrome Satisium Actions — Zero Orange */}
              <DialogFooter className="flex-row items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => emitAction("close")}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => emitAction("close")}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
                >
                  Save changes
                </button>
              </DialogFooter>
            </div>
          </div>
        </Dialog>
      )}
    </main>
  )
}
