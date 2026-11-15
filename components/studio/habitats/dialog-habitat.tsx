"use client"

import * as React from "react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export function DialogHabitat() {
  const { bindRef, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "dialog:open",
    exitTrackId: "dialog:close",
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
      {/* 1. At-Rest Closed Trigger View (Dead-Center Minimal Squircle, No Badge, No Kbd) */}
      {!isVisible && (
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={open}
            aria-label="Open modal dialog"
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            Open Dialog
          </button>
        </div>
      )}

      {/* 2. Precision Scrim / Backdrop (No CSS transition-opacity, handled by 120fps evaluator) */}
      {isVisible && (
        <div
          ref={bindRef("backdrop")}
          onClick={close}
          className="absolute inset-0 z-40 cursor-pointer bg-black backdrop-blur-xs"
        />
      )}

      {/* 3. Satisium Borderless Squircle Modal Card Surface */}
      {isVisible && (
        <div
          ref={bindRef(["translateY", "scale"])}
          role="dialog"
          aria-modal="true"
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
      )}
    </div>
  )
}
