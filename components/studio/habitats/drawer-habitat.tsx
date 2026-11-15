"use client"

import * as React from "react"
import { FilterIcon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export function DrawerHabitat() {
  const { bindRef, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "drawer:open",
    exitTrackId: "drawer:close",
  })

  // Keyboard ergonomics: Escape dismisses drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, close])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      {/* 1. At-Rest Closed Trigger View (Clean Squircle) */}
      {!isVisible && (
        <button
          type="button"
          onClick={open}
          aria-label="Open filter drawer"
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <HugeiconsIcon icon={FilterIcon} className="size-3.5" />
          <span>Filters (3)</span>
        </button>
      )}

      {/* 2. Precision Scrim / Backdrop */}
      {isVisible && (
        <div
          ref={bindRef("backdrop")}
          onClick={close}
          className="absolute inset-0 z-40 cursor-pointer bg-black backdrop-blur-xs"
        />
      )}

      {/* 3. Right Slide Sheet Drawer Surface (Borderless Satisium Card) */}
      {isVisible && (
        <aside
          ref={bindRef("translateX")}
          className="absolute inset-y-0 right-0 z-50 flex w-[280px] flex-col bg-card p-5 will-change-transform"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3.5">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={FilterIcon}
                className="size-4 text-foreground"
              />
              <h4 className="font-heading text-xs font-semibold text-foreground">
                Filter Workspace
              </h4>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close filter drawer"
              className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>

          {/* Filter Categories */}
          <div className="mt-2 flex flex-1 flex-col gap-3">
            <span className="font-sans text-[11px] font-medium text-muted-foreground">
              Motion Categories
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Modal Dialogs",
                "Drawers",
                "Micro-Snaps",
                "S-Curves",
                "Deceleration",
              ].map((cat) => (
                <span
                  key={cat}
                  className="rounded-[6px] bg-secondary px-2.5 py-1 font-sans text-xs text-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={close}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
            >
              Apply Filters
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
