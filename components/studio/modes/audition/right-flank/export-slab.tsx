"use client"

/**
 * @file components/studio/modes/audition/right-flank/export-slab.tsx
 * @description Unified System Utility Row for the Right Flank: Kinetic code export + Color theme switcher.
 *
 * Invariants:
 * - Standalone full-width squircle utility row (flex items-center gap-2).
 * - Export button: flex-1 rounded-[16px] bg-background h-10 min-w-0.
 * - Theme toggle: size-10 rounded-[16px] bg-background shrink-0.
 * - Zero border/border-border, zero shadow-*, zero font-mono (font-sans text-[10px] for kbd).
 */

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun02Icon, Moon02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useEaseStore } from "@/hooks/use-ease-store"
import { useMounted } from "@/hooks/use-mounted"
import { switchThemeWithTransition } from "@/lib/theme-transition"
import { SATISIUM_PRESS_CLASS } from "@/lib/motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ExportSlabProps {
  className?: string
}

export function ExportSlab({ className }: ExportSlabProps) {
  const setExportOpen = useEaseStore((s) => s.setExportOpen)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  const toggleTheme = (e: React.MouseEvent) => {
    const currentTheme = resolvedTheme ?? theme
    const newTheme = currentTheme === "dark" ? "light" : "dark"
    switchThemeWithTransition(setTheme, newTheme, e, "fade")
  }

  const isDark = mounted && (resolvedTheme ?? theme) === "dark"

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-2 select-none",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExportOpen(true)}
        aria-label="Export kinetic curve code"
        className={cn(
          "flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-between rounded-[16px] bg-background px-4 font-heading text-xs font-medium text-foreground transition-colors hover:bg-secondary active:scale-[0.99]",
          SATISIUM_PRESS_CLASS
        )}
      >
        <span>Export</span>
        <kbd className="rounded-[6px] bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
          ⌘E
        </kbd>
      </button>

      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Color Theme"
              className={cn(
                "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[16px] bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.97]",
                SATISIUM_PRESS_CLASS
              )}
            >
              <HugeiconsIcon
                icon={isDark ? Sun02Icon : Moon02Icon}
                className="size-4"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <span>Theme: {isDark ? "Dark" : "Light"} (Click to toggle)</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
