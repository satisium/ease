"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"
import { cn } from "@/lib/utils"

export interface DrawerHabitatProps {
  compareItemId?: string
}

const MENU_ITEMS = ["Overview", "Components", "Tokens", "Changelog"] as const

export function DrawerHabitat({ compareItemId }: DrawerHabitatProps = {}) {
  const internalRef = React.useRef<HTMLDivElement>(null)
  const drawerRef = React.useRef<HTMLElement>(null)

  // Dynamic Concentric clipPath & pointer-events guard
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const clipPct = Math.max(0, frame.values.containerClip ?? 0)
    if (internalRef.current) {
      internalRef.current.style.clipPath = `inset(0px ${clipPct.toFixed(2)}% 0px 0px round 11px)`
    }
    if (drawerRef.current) {
      drawerRef.current.style.pointerEvents = clipPct <= 0.5 ? "none" : "auto"
    }
  }, [])

  const { bindRef, isOpen, open, close } = usePairedHabitat({
    enterTrackId: "drawer:open",
    exitTrackId: "drawer:close",
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

  // Keyboard ergonomics: Escape dismisses drawer
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
      {/* 1. Drawer Layer (z-10, sits cleanly inside p-1.5, width 32% leaving a 2% gap from 34% clipped edge) */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute top-1.5 right-1.5 bottom-1.5 z-10 flex w-[32%] flex-col justify-center px-4"
      >
        <div className="mx-auto flex w-full max-w-[220px] flex-col gap-1">
          <span className="px-2.5 pb-1.5 font-sans text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Menu
          </span>
          {MENU_ITEMS.map((item, idx) => (
            <button
              key={item}
              type="button"
              tabIndex={isOpen ? 0 : -1}
              aria-label={item}
              onClick={close}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-heading text-xs font-medium transition-colors",
                idx === 0
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <span>{item}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* 2. Internal Container (z-20, covers 100% of padded area at rest) */}
      <div
        ref={internalRef}
        onClick={isOpen ? close : undefined}
        className="relative z-20 flex h-full w-full items-center justify-center rounded-[11px] bg-background"
      >
        {/* Centered trigger with triggerShift binding */}
        <div ref={bindRef("triggerShift")} className="will-change-transform">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            aria-label={isOpen ? "Close drawer" : "Open drawer"}
            className="inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[10px] bg-secondary px-4 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            {isOpen ? "Close Drawer" : "Open Drawer"}
            <span className="sr-only">Filters (3)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
