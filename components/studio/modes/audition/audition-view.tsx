"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { BrandSlab } from "@/components/studio/common/brand-slab"
import { PresetCatalog } from "./left-flank/preset-catalog"
import { PreviewTheater } from "./center-stage/preview-theater"
import { TimelineConsole } from "./center-stage/timeline-console"
import { ArchetypeAdvisorSlab } from "./right-flank/archetype-advisor-slab"
import { CompareQueueSlab } from "./right-flank/compare-queue-slab"
import { ExportSlab } from "./right-flank/export-slab"
import { SponsorAdSlab } from "./right-flank/sponsor-ad-slab"
import { ModeSwitcherSlab } from "./right-flank/mode-switcher-slab"
import { CustomizeTheater } from "@/components/studio/modes/customize/customize-theater"
import { CustomizeTelemetrySlab } from "@/components/studio/modes/customize/customize-telemetry-slab"
import { CompareTheater } from "@/components/studio/modes/compare/compare-theater"
import { CompareTelemetrySlab } from "@/components/studio/modes/compare/compare-telemetry-slab"
import {
  SATISIUM_STAGE_SLIDE_TRANSITION,
  SATISIUM_FLANK_SLIDE_TRANSITION,
  SATISIUM_LEFT_COLLAPSE_TRANSITION,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

const blockSlideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? "-100%" : "100%",
    opacity: 1,
  }),
}

const MODE_ORDER: Record<string, number> = {
  preview: 1,
  customize: 2,
  compare: 3,
}

const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test"

export function AuditionView() {
  const mode = useEaseStore((s) => s.mode)
  const isCompare = mode === "compare"

  const [prevMode, setPrevMode] = React.useState(mode)
  const [direction, setDirection] = React.useState(1)

  const [isCenterSliding, setIsCenterSliding] = React.useState(false)
  const [isRightSliding, setIsRightSliding] = React.useState(false)

  const centerTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const rightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const handleCenterAnimationStart = React.useCallback(() => {
    setIsCenterSliding(true)
    if (centerTimeoutRef.current) clearTimeout(centerTimeoutRef.current)
    centerTimeoutRef.current = setTimeout(() => {
      setIsCenterSliding(false)
    }, 600)
  }, [])

  const handleCenterAnimationComplete = React.useCallback(() => {
    setIsCenterSliding(false)
    if (centerTimeoutRef.current) clearTimeout(centerTimeoutRef.current)
  }, [])

  const handleRightAnimationStart = React.useCallback(() => {
    setIsRightSliding(true)
    if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current)
    rightTimeoutRef.current = setTimeout(() => {
      setIsRightSliding(false)
    }, 500)
  }, [])

  const handleRightAnimationComplete = React.useCallback(() => {
    setIsRightSliding(false)
    if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current)
  }, [])

  React.useEffect(() => {
    return () => {
      if (centerTimeoutRef.current) clearTimeout(centerTimeoutRef.current)
      if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current)
    }
  }, [])

  if (mode !== prevMode) {
    setPrevMode(mode)
    const prevIndex = MODE_ORDER[prevMode] ?? 1
    const currIndex = MODE_ORDER[mode] ?? 1
    setDirection(currIndex >= prevIndex ? 1 : -1)
  }

  return (
    <div className="flex h-full w-full gap-2 overflow-hidden bg-muted font-sans select-none">
      {/* LEFT FLANK: 280px Hug-Fill-Hug (Slides out smoothly to 0px in Compare Mode) */}
      <motion.aside
        aria-hidden={isCompare}
        initial={false}
        animate={
          isCompare
            ? { width: 0, marginRight: -8, x: -288, opacity: 1 }
            : { width: 280, marginRight: 0, x: 0, opacity: 1 }
        }
        transition={SATISIUM_LEFT_COLLAPSE_TRANSITION}
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden will-change-transform",
          isCompare && "pointer-events-none"
        )}
      >
        <BrandSlab />
        <PresetCatalog />
      </motion.aside>

      {/* CENTER STAGE: Hero Canvas & Master Console */}
      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {isCenterSliding && (
            <>
              <div className="progressive-blur-left pointer-events-none absolute inset-y-0 left-0 z-40 w-5" />
              <div className="progressive-blur-right pointer-events-none absolute inset-y-0 right-0 z-40 w-5" />
            </>
          )}
          {isTest ? (
            mode === "customize" ? (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <CustomizeTheater />
              </div>
            ) : mode === "compare" ? (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <CompareTheater />
              </div>
            ) : (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <PreviewTheater />
              </div>
            )
          ) : (
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              {mode === "customize" ? (
                <motion.div
                  key="customize-theater"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_STAGE_SLIDE_TRANSITION}
                  onAnimationStart={handleCenterAnimationStart}
                  onAnimationComplete={handleCenterAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <CustomizeTheater />
                </motion.div>
              ) : mode === "compare" ? (
                <motion.div
                  key="compare-theater"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_STAGE_SLIDE_TRANSITION}
                  onAnimationStart={handleCenterAnimationStart}
                  onAnimationComplete={handleCenterAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <CompareTheater />
                </motion.div>
              ) : (
                <motion.div
                  key="preview-theater"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_STAGE_SLIDE_TRANSITION}
                  onAnimationStart={handleCenterAnimationStart}
                  onAnimationComplete={handleCenterAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <PreviewTheater />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        <TimelineConsole />
      </main>

      {/* RIGHT FLANK: 300px Fixed Width */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {isRightSliding && (
            <>
              <div className="progressive-blur-left pointer-events-none absolute inset-y-0 left-0 z-40 w-5" />
              <div className="progressive-blur-right pointer-events-none absolute inset-y-0 right-0 z-40 w-5" />
            </>
          )}
          {isTest ? (
            mode === "customize" ? (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <CustomizeTelemetrySlab />
              </div>
            ) : mode === "compare" ? (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <CompareTelemetrySlab />
              </div>
            ) : (
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                <ArchetypeAdvisorSlab />
              </div>
            )
          ) : (
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              {mode === "customize" ? (
                <motion.div
                  key="customize-telemetry"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_FLANK_SLIDE_TRANSITION}
                  onAnimationStart={handleRightAnimationStart}
                  onAnimationComplete={handleRightAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <CustomizeTelemetrySlab />
                </motion.div>
              ) : mode === "compare" ? (
                <motion.div
                  key="compare-telemetry"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_FLANK_SLIDE_TRANSITION}
                  onAnimationStart={handleRightAnimationStart}
                  onAnimationComplete={handleRightAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <CompareTelemetrySlab />
                </motion.div>
              ) : (
                <motion.div
                  key="preview-advisor"
                  custom={direction}
                  variants={blockSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SATISIUM_FLANK_SLIDE_TRANSITION}
                  onAnimationStart={handleRightAnimationStart}
                  onAnimationComplete={handleRightAnimationComplete}
                  className="flex h-full min-h-0 w-full flex-1 flex-col will-change-transform"
                >
                  <ArchetypeAdvisorSlab />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        <CompareQueueSlab />
        <ModeSwitcherSlab />
        <ExportSlab />
        <SponsorAdSlab />
      </aside>
    </div>
  )
}
