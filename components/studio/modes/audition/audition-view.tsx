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

const cassetteVariants = {
  enter: (isCustomize: boolean) => ({
    x: isCustomize ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (isCustomize: boolean) => ({
    x: isCustomize ? "-100%" : "100%",
  }),
}

const cassetteTransition = {
  duration: 0.36,
  ease: [0.16, 1, 0.3, 1] as const,
}

export function AuditionView() {
  const mode = useEaseStore((s) => s.mode)

  return (
    <div className="flex h-full w-full gap-2 overflow-hidden bg-muted font-sans select-none">
      {/* LEFT FLANK: 280px Hug-Fill-Hug (PresetCatalog remains permanently open) */}
      <aside className="flex h-full min-h-0 w-[280px] shrink-0 flex-col gap-2">
        <BrandSlab />
        <PresetCatalog />
      </aside>

      {/* CENTER STAGE: Hero Canvas & Master Console */}
      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={mode === "customize"}
          >
            {mode === "customize" ? (
              <motion.div
                key="customize-theater"
                custom={true}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CustomizeTheater />
              </motion.div>
            ) : (
              <motion.div
                key="preview-theater"
                custom={false}
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
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={mode === "customize"}
          >
            {mode === "customize" ? (
              <motion.div
                key="customize-telemetry"
                custom={true}
                variants={cassetteVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cassetteTransition}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <CustomizeTelemetrySlab />
              </motion.div>
            ) : (
              <motion.div
                key="preview-advisor"
                custom={false}
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
