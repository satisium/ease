"use client"

import * as React from "react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface DialogHabitatProps {
  compareItemId?: string
}

export function DialogHabitat({ compareItemId }: DialogHabitatProps = {}) {
  const overlayRef = React.useRef<HTMLDivElement>(null)

  // Pointer-Events Guard: Prevent invisible scrim/card from blocking clicks on the trigger underneath
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!overlayRef.current) return
    const cardOpacity = frame.values.opacity ?? 1
    const backdropOpacity = frame.values.backdrop ?? 0
    if (cardOpacity <= 0.01 && backdropOpacity <= 0.01) {
      overlayRef.current.style.pointerEvents = "none"
    } else {
      overlayRef.current.style.pointerEvents = "auto"
    }
  }, [])

  const { bindRef, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "dialog:open",
    exitTrackId: "dialog:close",
    onFrame: handleFrame,
    compareItemId,
  })

  // Keyboard ergonomics: Escape dismisses modal
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
      {/* 1. At-Rest Closed Trigger View: Always mounted calmly underneath at relative z-10 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={open}
          aria-label="Open modal dialog"
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          Open Dialog
        </button>
      </div>

      {/* 2. Precision Scrim & Modal Card Overlay: Mounted above trigger when isVisible */}
      {isVisible && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-40 flex items-center justify-center p-6"
        >
          {/* Precision Scrim / Backdrop */}
          <div
            ref={bindRef("backdrop")}
            onClick={close}
            className="absolute inset-0 cursor-pointer bg-black backdrop-blur-xs"
          />

          {/* Satisium Borderless Squircle Modal Card Surface */}
          <div
            ref={bindRef(["opacity", "translateY", "scale"])}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Profile"
            className="relative z-50 w-full max-w-[380px] rounded-[18px] bg-card p-6 will-change-transform"
          >
            {/* Dismiss Close Icon */}
            <button
              type="button"
              onClick={close}
              aria-label="Close modal dialog"
              className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              <span className="sr-only">Close</span>
            </button>

            {/* Dialog Header */}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Edit Profile
              </h3>
              <p className="font-sans text-xs text-muted-foreground">
                Make changes to your profile parameters here.
              </p>
            </div>

            {/* Recessed Borderless Squircle Input Troughs */}
            <div className="flex flex-col gap-2.5 py-4">
              <div className="flex items-center gap-3">
                <span className="w-16 text-right font-sans text-xs text-muted-foreground">
                  Name
                </span>
                <input
                  defaultValue="Satishkumar"
                  className="h-8 flex-1 rounded-[8px] bg-secondary px-3 font-sans text-xs text-foreground transition-colors outline-none focus:bg-muted"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-right font-sans text-xs text-muted-foreground">
                  Username
                </span>
                <input
                  defaultValue="@iamsatish4564"
                  className="h-8 flex-1 rounded-[8px] bg-secondary px-3 font-sans text-xs text-foreground transition-colors outline-none focus:bg-muted"
                />
              </div>
            </div>

            {/* Pure Monochrome Satisium Actions — Zero Orange */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
