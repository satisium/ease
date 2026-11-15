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
import { cn } from "@/lib/utils"

const cassetteVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
}

const cassetteTransition = {
  duration: 0.36,
  ease: [0.16, 1, 0.3, 1] as const,
}

const MODE_ORDER: Record<string, number> = {
  preview: 1,
  customize: 2,
  compare: 3,
}

export function AuditionView() {
  const mode = useEaseStore((s) => s.mode)
  const isCompare = mode === "compare"

  const [prevMode, setPrevMode] = React.useState(mode)
  const [direction, setDirection] = React.useState(1)

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
        animate={{
          width: isCompare ? 0 : 280,
          marginRight: isCompare ? -8 : 0,
          opacity: isCompare ? 0 : 1,
          x: isCompare ? -280 : 0,
        }}
        transition={{
          duration: 0.36,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden",
          isCompare && "pointer-events-none"
        )}
      >
        <BrandSlab />
        <PresetCatalog />
      </motion.aside>

      {/* CENTER STAGE: Hero Canvas & Master Console */}
      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {mode === "customize" ? (
              <motion.div
                key="customize-theater"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CustomizeTheater />
              </motion.div>
            ) : mode === "compare" ? (
              <motion.div
                key="compare-theater"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CompareTheater />
              </motion.div>
            ) : (
              <motion.div
                key="preview-theater"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <PreviewTheater />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <TimelineConsole />
      </main>

      {/* RIGHT FLANK: 300px Fixed Width */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {mode === "customize" ? (
              <motion.div
                key="customize-telemetry"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CustomizeTelemetrySlab />
              </motion.div>
            ) : mode === "compare" ? (
              <motion.div
                key="compare-telemetry"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CompareTelemetrySlab />
              </motion.div>
            ) : (
              <motion.div
                key="preview-advisor"
                custom={direction}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <ArchetypeAdvisorSlab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <CompareQueueSlab />
        <ModeSwitcherSlab />
        <ExportSlab />
        <SponsorAdSlab />
      </aside>
    </div>
  )
}
