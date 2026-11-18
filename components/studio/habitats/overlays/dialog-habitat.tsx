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

  // Stateful Profile Identity
  const [savedName, setSavedName] = React.useState("Satishkumar")
  const [savedHandle, setSavedHandle] = React.useState("@iamsatish4564")
  const [draftName, setDraftName] = React.useState("Satishkumar")
  const [draftHandle, setDraftHandle] = React.useState("@iamsatish4564")

  // Pointer-Events Guard: Prevent invisible scrim/card from blocking clicks on the trigger underneath
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (overlayRef.current) {
      const cardOpacity = frame.values.opacity ?? 1
      const backdropOpacity = frame.values.backdrop ?? 0
      if (cardOpacity <= 0.01 && backdropOpacity <= 0.01) {
        overlayRef.current.style.pointerEvents = "none"
      } else {
        overlayRef.current.style.pointerEvents = "auto"
      }
    }
  }, [])

  const { bindRef, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "dialog:open",
    exitTrackId: "dialog:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const handleOpen = React.useCallback(() => {
    setDraftName(savedName)
    setDraftHandle(savedHandle)
    open()
  }, [open, savedName, savedHandle])

  const handleSave = React.useCallback(() => {
    setSavedName(draftName)
    setSavedHandle(draftHandle)
    close()
  }, [close, draftName, draftHandle])

  const handleCancel = React.useCallback(() => {
    close()
  }, [close])

  // Keyboard ergonomics: Escape dismisses modal without saving
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        e.preventDefault()
        handleCancel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, handleCancel])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        {/* 1. Calm Resting Trigger: Only the single centered trigger button */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleOpen}
            aria-label="Open modal dialog"
            className="inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[10px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
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
            {/* Precision Scrim / Backdrop (Zero backdrop-blur-*) */}
            <div
              ref={bindRef("backdrop")}
              onClick={handleCancel}
              className="absolute inset-0 cursor-pointer bg-black"
            />

            {/* Satisium Borderless Squircle Modal Card Surface (Pure 120fps GPU transform + opacity) */}
            <div
              ref={bindRef(["opacity", "translateY", "scale"])}
              role="dialog"
              aria-modal="true"
              aria-label="Edit Profile"
              className="relative z-50 w-full max-w-[348px] rounded-[18px] bg-muted p-5 will-change-transform"
            >
              {/* Dismiss Close Icon */}
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Close modal dialog"
                className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                <span className="sr-only">Close</span>
              </button>

              {/* Dialog Header */}
              <div className="flex flex-col gap-1 pr-6">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Edit Profile
                </h3>
                <p className="font-sans text-xs text-muted-foreground">
                  Changes apply across your Satisium workspace.
                </p>
              </div>

              {/* Stacked Clean Fields */}
              <div className="flex flex-col gap-3 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[11px] font-medium text-muted-foreground">
                    Display name
                  </label>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Display name"
                    className="h-9 w-full rounded-[9px] bg-background px-3 font-sans text-xs text-foreground outline-none focus:bg-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[11px] font-medium text-muted-foreground">
                    Handle
                  </label>
                  <input
                    value={draftHandle}
                    onChange={(e) => setDraftHandle(e.target.value)}
                    aria-label="Handle"
                    className="h-9 w-full rounded-[9px] bg-background px-3 font-sans text-xs text-foreground outline-none focus:bg-secondary"
                  />
                </div>
              </div>

              {/* Calm Monochrome Satisium Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  aria-label="Cancel editing profile"
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-background active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  aria-label="Save profile changes"
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
