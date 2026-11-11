"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ChevronDoubleCloseIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PreviewBackground } from "@/components/previewer/preview-background"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"
import { useStudioStore, useActiveDossier } from "@/store/useStudioStore"
import { useHostBridge } from "@/components/studio/bridge"
import { AuditionToolbar } from "./audition-toolbar"

/** Smallest usable preview stage, in px. Also the hit area of the drag handle. */
const MIN_STAGE_W = 320

export function PreviewTheater() {
  const previewWidth = useStudioStore((s) => s.previewWidth)
  const setPreviewWidth = useStudioStore((s) => s.setPreviewWidth)
  const setViewportMode = useStudioStore((s) => s.setViewportMode)
  const animKey = useStudioStore((s) => s.animKey)
  const activeScenarioKey = useStudioStore((s) => s.activeScenarioKey)
  const activeSlotId = useStudioStore((s) => s.activeSlotId)
  const scenarioSlots = useStudioStore((s) => s.scenarioSlots)
  const scrubProgress = useStudioStore((s) => s.scrubProgress)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const isScrubbing = useStudioStore((s) => s.isScrubbing)
  const isReducedMotion = useStudioStore((s) => s.isReducedMotion)
  const scenarioOpen = useStudioStore((s) => s.scenarioOpen)
  const scenarioPhase = useStudioStore((s) => s.scenarioPhase)
  const togglePlayback = useStudioStore((s) => s.togglePlayback)
  const triggerAudition = useStudioStore((s) => s.triggerAudition)
  const openScenario = useStudioStore((s) => s.openScenario)
  const closeScenario = useStudioStore((s) => s.closeScenario)
  const toggleTimeline = useStudioStore((s) => s.toggleTimeline)

  const activeDossier = useActiveDossier()
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // 1. Setup the Universal Studio Bridge with the isolated /stage iframe
  const { isStageReady, sendScrubUpdate, sendSetScenario, sendSetSlotCurve } =
    useHostBridge({
      iframeRef,
      getInitPayload: () => ({
        theme:
          typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark")
            ? "dark"
            : "light",
        scenarioKey: activeScenarioKey,
        activeSlotId,
        activeCurve: activeDossier,
        scenarioSlots,
        scrubProgress,
        isPlaying,
        isScrubbing,
        isReducedMotion,
        scenarioOpen,
        scenarioPhase,
        animKey,
      }),
      onKeyboardEvent: (e) => {
        // Hotkey forwarding from inside the iframe to the parent studio
        if (e.key === " ") {
          togglePlayback()
        } else if (e.key === "r" || e.key === "R") {
          triggerAudition()
        } else if (e.key === "Escape") {
          if (scenarioOpen) closeScenario()
        } else if (e.key === "t" || e.key === "T") {
          toggleTimeline()
        }
      },
      onStageAction: (act) => {
        if (act.action === "close") {
          closeScenario()
        } else if (act.action === "open") {
          openScenario()
        } else if (act.action === "audition") {
          triggerAudition()
        }
      },
    })

  // 2. High-speed 60fps kinetic telemetry broadcast
  React.useEffect(() => {
    if (!isStageReady) return
    sendScrubUpdate({
      progress: scrubProgress,
      animKey,
      phase: scenarioPhase,
      isPlaying,
      isScrubbing,
      scenarioOpen,
    })
  }, [
    isStageReady,
    scrubProgress,
    animKey,
    scenarioPhase,
    isPlaying,
    isScrubbing,
    scenarioOpen,
    sendScrubUpdate,
  ])

  // 3. Scenario selection changes
  React.useEffect(() => {
    if (!isStageReady) return
    sendSetScenario({
      scenarioKey: activeScenarioKey,
      activeSlotId,
      activeCurve: activeDossier,
    })
  }, [
    isStageReady,
    activeScenarioKey,
    activeSlotId,
    activeDossier,
    sendSetScenario,
  ])

  // 4. Kinetic slot curve reassignments
  React.useEffect(() => {
    if (!isStageReady) return
    sendSetSlotCurve({
      scenarioKey: activeScenarioKey,
      slotId: activeSlotId,
      curve: activeDossier,
    })
  }, [
    isStageReady,
    activeScenarioKey,
    activeSlotId,
    activeDossier,
    sendSetSlotCurve,
  ])

  // 5. Drag-to-resize viewport interaction
  const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    document.body.style.cursor = "col-resize"
  }, [])

  React.useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const raw = e.clientX - containerRect.left
      const nextWidth = Math.min(
        Math.max(raw, MIN_STAGE_W),
        containerRect.width
      )
      setPreviewWidth(nextWidth)
      setViewportMode("custom")
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ""
    }

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      if (isDragging) {
        document.body.style.cursor = ""
      }
    }
  }, [isDragging, setPreviewWidth, setViewportMode])

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Component Preview Theater"
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-background p-2 transition-colors select-none"
      >
        {/* Stage Container */}
        <div className="relative flex h-full w-full overflow-hidden rounded-[16px]">
          {/* Workbench Cutting-Mat Substrate */}
          <PreviewBackground />

          {/* Resizable Playground Canvas */}
          <div
            className="pointer-events-none absolute inset-0 flex"
            ref={containerRef}
          >
            <motion.div
              initial={false}
              animate={{ width: previewWidth }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: isDragging ? 0 : 0.4,
              }}
              className="pointer-events-auto relative flex h-full max-w-full flex-row overflow-hidden rounded-2xl bg-muted"
            >
              {/* Isolated Iframe Stage Sandbox */}
              <div className="relative flex h-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-muted">
                {!isStageReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-muted">
                    <div className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      Initializing Stage…
                    </span>
                  </div>
                )}

                <iframe
                  ref={iframeRef}
                  src={ROUTES.stage}
                  title="Component Motion Theater Stage"
                  className={cn(
                    "h-full w-full border-none bg-transparent transition-opacity duration-200",
                    isStageReady ? "opacity-100" : "opacity-0",
                    isDragging && "pointer-events-none select-none"
                  )}
                />
              </div>

              {/* Absolutely positioned right-edge col-resize handle */}
              <div
                onPointerDown={handlePointerDown}
                className="group absolute top-0 right-0 z-50 flex h-full w-4 cursor-col-resize items-center justify-center select-none"
              >
                <div
                  className={cn(
                    "flex h-[40%] w-1.5 items-center justify-center rounded-full transition-colors",
                    isDragging
                      ? "bg-foreground"
                      : "bg-border group-hover:bg-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={ChevronDoubleCloseIcon}
                    className="size-3.5 text-background opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Floating Audition Toolbar */}
          <AuditionToolbar />
        </div>
      </section>
    </TooltipProvider>
  )
}
