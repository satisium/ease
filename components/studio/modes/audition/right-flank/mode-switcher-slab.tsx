"use client"

/**
 * @file components/studio/modes/audition/right-flank/mode-switcher-slab.tsx
 * @description Borderless 3-mode segmented switcher (Preview 1, Customize 2, Compare 3) for the Right Flank.
 *
 * Invariants:
 * - Direct squircle segmented pill strip (rounded-[14px] bg-background p-1 flex items-center select-none shrink-0).
 * - Zero border/border-border, zero shadow-*, zero opacity hacks, zero font-mono (font-sans tabular-nums only).
 * - Smooth spring pill motion via LayoutGroup + layoutId="studio-mode-pill".
 * - Compare tab disables cleanly with tooltip when fewer than 2 curves are staged.
 */

import * as React from "react"
import { LayoutGroup, motion } from "motion/react"
import { useEaseStore } from "@/hooks/use-ease-store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ModeSwitcherSlabProps {
  className?: string
}

export function ModeSwitcherSlab({ className }: ModeSwitcherSlabProps) {
  const mode = useEaseStore((s) => s.mode)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)
  const exitCustomize = useEaseStore((s) => s.exitCustomize)
  const enterCompare = useEaseStore((s) => s.enterCompare)
  const exitCompare = useEaseStore((s) => s.exitCompare)

  const canCompare = compareQueue.length >= 2

  const handleSelectMode = (
    targetMode: "preview" | "customize" | "compare"
  ) => {
    if (targetMode === mode) return

    if (targetMode === "preview") {
      if (mode === "customize") exitCustomize()
      if (mode === "compare") exitCompare()
    } else if (targetMode === "customize") {
      if (mode === "compare") exitCompare()
      enterCustomize()
    } else if (targetMode === "compare") {
      if (canCompare) {
        if (mode === "customize") exitCustomize()
        enterCompare()
      }
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="tablist"
        aria-label="Studio Modes"
        className={cn(
          "flex shrink-0 items-center rounded-[16px] bg-background p-1 select-none",
          className
        )}
      >
        <LayoutGroup id="studio-mode-switcher">
          {/* 1. Preview Mode */}
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            aria-label="Switch to Preview mode"
            onClick={() => handleSelectMode("preview")}
            className={cn(
              "relative flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-2 font-heading text-xs transition-colors",
              mode === "preview"
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "preview" && (
              <motion.div
                layoutId="studio-mode-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-[12px] bg-secondary"
              />
            )}
            <span className="relative z-10">Preview</span>
            <kbd className="relative z-10 rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              1
            </kbd>
          </button>

          {/* 2. Customize Mode */}
          <button
            type="button"
            role="tab"
            aria-selected={mode === "customize"}
            aria-label="Switch to Customize mode"
            onClick={() => handleSelectMode("customize")}
            className={cn(
              "relative flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-2 font-heading text-xs transition-colors",
              mode === "customize"
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "customize" && (
              <motion.div
                layoutId="studio-mode-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-[12px] bg-secondary"
              />
            )}
            <span className="relative z-10">Customize</span>
            <kbd className="relative z-10 rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              2
            </kbd>
          </button>

          {/* 3. Compare Mode */}
          {canCompare ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "compare"}
              aria-label="Switch to Compare mode"
              onClick={() => handleSelectMode("compare")}
              className={cn(
                "relative flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-2 font-heading text-xs transition-colors",
                mode === "compare"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "compare" && (
                <motion.div
                  layoutId="studio-mode-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-[12px] bg-secondary"
                />
              )}
              <span className="relative z-10">Compare</span>
              <kbd className="relative z-10 rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                3
              </kbd>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <button
                    type="button"
                    role="tab"
                    disabled
                    aria-selected={false}
                    aria-label="Switch to Compare mode (disabled)"
                    className="relative flex h-8 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[12px] px-2 font-heading text-xs text-muted-foreground select-none"
                  >
                    <span>Compare</span>
                    <kbd className="rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                      3
                    </kbd>
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <span>Stage 2+ curves in Compare Queue to duel</span>
              </TooltipContent>
            </Tooltip>
          )}
        </LayoutGroup>
      </div>
    </TooltipProvider>
  )
}
