"use client"

import * as React from "react"
import { useEaseStore } from "@/hooks/use-ease-store"
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

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden select-none">
      {/* LEVEL 0: ROOT CATALOG BLOCK */}
      <section
        aria-label="Preset Catalog"
        className={cn(
          "absolute inset-0 flex flex-col rounded-[20px] bg-background p-2.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none",
          navStack.level === 0
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none -translate-x-[calc(100%+8px)]"
        )}
      >
        <CatalogLevel0 />
      </section>

      {/* LEVEL 1: EASE STUDIO DETAIL BLOCK */}
      <section
        aria-label="Ease Studio"
        className={cn(
          "absolute inset-0 flex flex-col rounded-[20px] bg-background p-2.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none",
          navStack.level === 1
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none translate-x-[calc(100%+8px)]"
        )}
      >
        <CatalogLevel1 />
      </section>
    </div>
  )
}
