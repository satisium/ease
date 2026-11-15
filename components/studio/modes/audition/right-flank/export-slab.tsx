"use client"

/**
 * @file components/studio/modes/audition/right-flank/export-slab.tsx
 * @description Standalone squircle export trigger slab for the Right Flank.
 *
 * Invariants:
 * - Standalone full-width squircle slab button (rounded-[16px] bg-background h-10).
 * - Zero border/border-border, zero shadow-*, zero font-mono (font-sans text-[10px] for kbd).
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { useEaseStore } from "@/hooks/use-ease-store"

export interface ExportSlabProps {
  className?: string
}

export function ExportSlab({ className }: ExportSlabProps) {
  const setExportOpen = useEaseStore((s) => s.setExportOpen)

  return (
    <button
      type="button"
      onClick={() => setExportOpen(true)}
      aria-label="Export kinetic curve code"
      className={cn(
        "flex h-10 w-full shrink-0 cursor-pointer items-center justify-between rounded-[16px] bg-background px-4 font-heading text-xs font-medium text-foreground transition-colors select-none hover:bg-secondary active:scale-[0.99]",
        className
      )}
    >
      <span>Export</span>
      <kbd className="rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
        ⌘E
      </kbd>
    </button>
  )
}
