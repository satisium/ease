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
import { cn } from "@/lib/utils"
import {
  useStageBridge,
  postToHost,
  useSnifferObserver,
} from "@/components/studio/bridge"
import { resolveEase } from "@/components/studio/domain/studio-kinetics"
import { evaluateChoreography } from "@/components/studio/domain/kinetic-evaluator"
import { applyChoreographyToDOM } from "@/components/studio/domain/dom-applicator"
import { getArchetypeManifest } from "@/components/studio/domain/archetype-registry"
import { INITIAL_CUSTOM_CURVES } from "@/components/studio/domain/studio-curves"
import {
  EaseDossier,
  KineticChannelDef,
} from "@/components/studio/domain/studio-types"

export default function StagePage() {
  const { stageState, emitAction } = useStageBridge()

  const scenarioKey = stageState.scenarioKey || "dialog"
  const phase = stageState.scenarioPhase || "enter"
  const [discoveredChannels, setDiscoveredChannels] = React.useState<
    KineticChannelDef[]
  >([])

  // 1. Reactive Sniffer Engine: Observes DOM mutations, portals, and dynamic state transitions
  const handleDiscovered = React.useCallback(
    (channels: KineticChannelDef[]) => {
      setDiscoveredChannels(channels)
      if (channels.length > 0) {
        postToHost("SNIFFER_DETECTED_CHANNELS", {
          scenarioKey,
          slotId: phase,
          channels,
        })
      }
    },
    [scenarioKey, phase]
  )

  useSnifferObserver(
    typeof document !== "undefined" ? document : null,
    scenarioKey,
    phase,
    handleDiscovered
  )

  // 2. Resolve Multi-Channel Kinetic Definitions (Prioritize live sniffed channels)
  const manifest = React.useMemo(
    () => getArchetypeManifest(scenarioKey),
    [scenarioKey]
  )
  const activeSlotDef = React.useMemo(() => {
    return manifest?.slots.find((s) => s.id === phase) ?? manifest?.slots[0]
  }, [manifest, phase])

  const channels = React.useMemo(() => {
    if (discoveredChannels.length > 0) {
      return discoveredChannels
    }
    return activeSlotDef?.channels || []
  }, [discoveredChannels, activeSlotDef])

  // 2. Resolve independent curves for each channel
  const channelCurves = React.useMemo(() => {
    const curves: Record<string, EaseDossier> = {}
    const scenarioKey = stageState.scenarioKey || "dialog"
    const slotId = stageState.scenarioPhase
    const assignedChannels =
      stageState.scenarioChannelSlots?.[scenarioKey]?.[slotId] || {}

    for (const ch of channels) {
      // If user is tuning this channel specifically in studio, prioritize live curve
      if (stageState.activeCurve && stageState.activeChannelId === ch.id) {
        curves[ch.id] = stageState.activeCurve
        continue
      }

      // Check channel-specific assignment in store
      const assignedId = assignedChannels[ch.id]
      if (assignedId) {
        curves[ch.id] = resolveEase(assignedId, INITIAL_CUSTOM_CURVES)
        continue
      }

      // If active curve is set on slot level (e.g. "all"), fallback
      if (stageState.activeCurve && stageState.activeChannelId === "all") {
        curves[ch.id] = stageState.activeCurve
      } else {
        curves[ch.id] = resolveEase(ch.defaultCurveId, INITIAL_CUSTOM_CURVES)
      }
    }
    return curves
  }, [
    channels,
    stageState.scenarioKey,
    stageState.scenarioPhase,
    stageState.scenarioChannelSlots,
    stageState.activeCurve,
    stageState.activeChannelId,
  ])

  // 3. Multi-Channel Evaluation (stagger, delay, individual physics)
  const evaluatedChoreography = React.useMemo(() => {
    return evaluateChoreography(
      channels,
      channelCurves,
      stageState.scrubProgress,
      400,
      stageState.isReducedMotion
    )
  }, [
    channels,
    channelCurves,
    stageState.scrubProgress,
    stageState.isReducedMotion,
  ])

  // 4. Determine simulation and resting lifecycle states
  const isSimulating = stageState.isPlaying || stageState.isScrubbing
  const isOpen =
    stageState.scenarioPhase === "enter"
      ? stageState.scrubProgress >= 100 || stageState.scenarioOpen
      : stageState.scrubProgress <= 0 && stageState.scenarioOpen

  const isModalVisible = isOpen || stageState.scenarioOpen || isSimulating

  // 5. Universal DOM Application: Decoupled styling engine
  React.useEffect(() => {
    if (!isModalVisible) return

    if (
      isSimulating ||
      (stageState.scrubProgress > 0 && stageState.scrubProgress < 100)
    ) {
      applyChoreographyToDOM(document, evaluatedChoreography.channels, channels)
    } else {
      // Settle frame at boundary (0% or 100%)
      const settledProgress = isOpen ? 100 : 0
      const settledEvaluated = evaluateChoreography(
        channels,
        channelCurves,
        settledProgress,
        400,
        stageState.isReducedMotion
      )
      applyChoreographyToDOM(document, settledEvaluated.channels, channels)
    }
  }, [
    isModalVisible,
    isSimulating,
    stageState.scrubProgress,
    isOpen,
    evaluatedChoreography,
    channels,
    channelCurves,
    stageState.isReducedMotion,
  ])

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

      {/* Precision Backdrop Scrim (Discovered by Sniffer, Driven by Universal DOM Applicator) */}
      <div
        data-ease-target="backdrop"
        onClick={() => emitAction("close")}
        className={cn(
          "fixed inset-0 z-40 cursor-pointer bg-black backdrop-blur-xs transition-opacity duration-75",
          !isModalVisible && "pointer-events-none opacity-0"
        )}
      />

      {/* Satisium Borderless Squircle Dialog Surface (Discovered by Sniffer, Driven by Universal DOM Applicator) */}
      <Dialog
        open={isModalVisible}
        onOpenChange={(open) => emitAction(open ? "open" : "close")}
      >
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            !isModalVisible && "pointer-events-none opacity-0"
          )}
        >
          <div
            data-ease-target="card"
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative w-full max-w-[380px] rounded-[18px] bg-card p-6 shadow-2xl will-change-transform",
              isModalVisible
                ? "pointer-events-auto"
                : "pointer-events-none opacity-0"
            )}
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
    </main>
  )
}
