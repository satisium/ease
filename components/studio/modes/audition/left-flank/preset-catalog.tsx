"use client"

import * as React from "react"
import { motion } from "motion/react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { SATISIUM_FLANK_SLIDE_TRANSITION } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { CatalogLevel0 } from "./catalog-level-0"
import { CatalogLevel1 } from "./catalog-level-1"

/**
 * 2-Tier Git-inspired Kinetic Cassette Router for the Left Flank.
 *
 * Sliding cassette architecture:
 * - Level 0: Global catalog, custom curves apex, engine switcher, search & filters.
 * - Level 1: Deep curve inspector, 1:1 kinetic audition stage, telemetry, variants grid, and actions.
 */
export function PresetCatalog() {
  const navStack = useEaseStore((s) => s.navStack)

  const [isCassetteSliding, setIsCassetteSliding] = React.useState(false)
  const slideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    }
  }, [])

  const handleAnimationStart = React.useCallback(() => {
    setIsCassetteSliding(true)
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    slideTimerRef.current = setTimeout(() => {
      setIsCassetteSliding(false)
    }, 500)
  }, [])

  const handleAnimationComplete = React.useCallback(() => {
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    setIsCassetteSliding(false)
  }, [])

  return (
    <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-[20px] bg-background select-none">
      {/* LEVEL 0: ROOT CATALOG BLOCK */}
      <motion.section
        aria-label="Preset Catalog"
        initial={false}
        animate={{
          x: navStack.level === 0 ? "0%" : "-104%",
          scale: 1,
          opacity: 1,
        }}
        transition={SATISIUM_FLANK_SLIDE_TRANSITION}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
        className={cn(
          "absolute inset-0 flex flex-col rounded-[20px] bg-background p-2.5 will-change-transform select-none",
          navStack.level === 0 ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <CatalogLevel0 />
      </motion.section>

      {/* LEVEL 1: EASE STUDIO DETAIL BLOCK */}
      <motion.section
        aria-label="Ease Studio"
        initial={false}
        animate={{
          x: navStack.level === 1 ? "0%" : "104%",
          scale: 1,
          opacity: 1,
        }}
        transition={SATISIUM_FLANK_SLIDE_TRANSITION}
        className={cn(
          "absolute inset-0 flex flex-col rounded-[20px] bg-background p-2.5 will-change-transform select-none",
          navStack.level === 1 ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <CatalogLevel1 />
      </motion.section>

      {/* Active Edge Progressive Blur Vignettes during Cassette Slide */}
      {isCassetteSliding && (
        <>
          <div
            aria-hidden="true"
            className="progressive-blur-left pointer-events-none absolute inset-y-0 left-0 z-30 w-4 select-none"
          />
          <div
            aria-hidden="true"
            className="progressive-blur-right pointer-events-none absolute inset-y-0 right-0 z-30 w-4 select-none"
          />
        </>
      )}
    </div>
  )
}
