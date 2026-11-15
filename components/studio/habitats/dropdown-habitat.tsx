"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  Copy01Icon,
  GitForkIcon,
  Cancel01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface DropdownHabitatProps {
  compareItemId?: string
}

export function DropdownHabitat({ compareItemId }: DropdownHabitatProps = {}) {
  const overlayRef = React.useRef<HTMLDivElement>(null)

  // Pointer-Events Guard: Prevent invisible popover from blocking clicks on the trigger
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!overlayRef.current) return
    const opacity = frame.values.opacity ?? 1
    if (opacity <= 0.01) {
      overlayRef.current.style.pointerEvents = "none"
    } else {
      overlayRef.current.style.pointerEvents = "auto"
    }
  }, [])

  const { bindRef, isOpen, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "dropdown:open",
    exitTrackId: "dropdown:close",
    onFrame: handleFrame,
    compareItemId,
  })

  // Keyboard ergonomics: Escape dismisses dropdown
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
      <div className="relative flex flex-col items-center">
        {/* Trigger Button (Clean Satisium Squircle, Always Mounted) */}
        <button
          type="button"
          onClick={() => (isOpen ? close() : open())}
          aria-label="Toggle actions menu"
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <span>Actions</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Anchored Popover Menu Surface (Borderless Satisium Card) */}
        {isVisible && (
          <div
            ref={overlayRef}
            className="absolute top-full z-20 mt-2 w-56 origin-top"
          >
            <div
              ref={bindRef(["opacity", "translateY", "scale"])}
              className="w-full rounded-[14px] bg-card p-1.5 will-change-transform"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Duplicate Channel"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left font-sans text-xs text-foreground transition-colors hover:bg-secondary active:scale-98"
                >
                  <HugeiconsIcon
                    icon={Layers01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                  <span>Duplicate Channel</span>
                </button>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Fork as Variant"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left font-sans text-xs text-foreground transition-colors hover:bg-secondary active:scale-98"
                >
                  <HugeiconsIcon
                    icon={GitForkIcon}
                    className="size-3.5 text-muted-foreground"
                  />
                  <span>Fork as Variant</span>
                </button>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Copy CSS Timing"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left font-sans text-xs text-foreground transition-colors hover:bg-secondary active:scale-98"
                >
                  <HugeiconsIcon
                    icon={Copy01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                  <span>Copy CSS Timing</span>
                </button>

                <div className="my-1 h-px bg-muted" />

                <button
                  type="button"
                  onClick={close}
                  aria-label="Dismiss"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left font-sans text-xs text-destructive transition-colors hover:bg-muted active:scale-98"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
