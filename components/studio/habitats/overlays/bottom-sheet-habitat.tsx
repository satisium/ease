"use client"

import * as React from "react"
import {
  Copy01Icon,
  Download01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface BottomSheetHabitatProps {
  compareItemId?: string
}

const SHEET_ACTIONS = [
  {
    id: "copy-link",
    label: "Copy link",
    meta: "Public",
    action: "Copy",
    icon: Link01Icon,
  },
  {
    id: "duplicate",
    label: "Duplicate",
    meta: "Branch",
    action: "Clone",
    icon: Copy01Icon,
  },
  {
    id: "export",
    label: "Export",
    meta: "Code",
    action: "Save",
    icon: Download01Icon,
  },
] as const

export function BottomSheetHabitat({
  compareItemId,
}: BottomSheetHabitatProps = {}) {
  const internalRef = React.useRef<HTMLDivElement>(null)
  const sheetRef = React.useRef<HTMLDivElement>(null)

  // Dynamic Concentric clipPath & pointer-events guard
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const clipPct = Math.max(0, frame.values.containerClip ?? 0)
    if (internalRef.current) {
      internalRef.current.style.clipPath = `inset(0px 0px ${clipPct.toFixed(2)}% 0px round 11px)`
    }
    if (sheetRef.current) {
      sheetRef.current.style.pointerEvents = clipPct <= 0.5 ? "none" : "auto"
    }
  }, [])

  const { bindRef, isOpen, open, close } = usePairedHabitat({
    enterTrackId: "sheet:open",
    exitTrackId: "sheet:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const toggle = React.useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, close, open])

  // Keyboard ergonomics: Escape dismisses bottom sheet
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, close])

  return (
    <div className="relative h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      {/* 1. Bottom Sheet Layer (z-10, sits inside p-1.5, height 40% leaving a 2% gap below 42% clipped edge) */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sheet actions"
        className="absolute right-1.5 bottom-1.5 left-1.5 z-10 flex h-[40%] flex-col justify-center px-4 pb-2"
      >
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-0.5">
          {SHEET_ACTIONS.map((row) => (
            <button
              key={row.label}
              type="button"
              tabIndex={isOpen ? 0 : -1}
              aria-label={row.label}
              onClick={close}
              className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left transition-colors hover:bg-background"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-background text-foreground">
                  <HugeiconsIcon icon={row.icon} className="size-3.5" />
                </span>
                <span className="font-sans text-xs font-medium text-foreground">
                  {row.label}
                </span>
                <span className="hidden font-sans text-[11px] text-muted-foreground sm:inline">
                  {row.meta}
                </span>
              </div>
              <span className="font-sans text-[11px] font-medium text-muted-foreground">
                {row.action}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Internal Container (z-20, covers 100% of padded area at rest) */}
      <div
        ref={internalRef}
        onClick={isOpen ? close : undefined}
        className="relative z-20 flex h-full w-full items-center justify-center rounded-[11px] bg-background"
      >
        <div ref={bindRef("triggerShift")} className="will-change-transform">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            aria-label={isOpen ? "Close bottom sheet" : "Open bottom sheet"}
            className="inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[10px] bg-secondary px-4 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            {isOpen ? "Close Sheet" : "Open Sheet"}
          </button>
        </div>
      </div>
    </div>
  )
}
