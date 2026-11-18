"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface HoverCardHabitatProps {
  compareItemId?: string
}

export function HoverCardHabitat({
  compareItemId,
}: HoverCardHabitatProps = {}) {
  const [isFollowing, setIsFollowing] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)

  // Pointer-Events Guard: Prevent invisible floating card from blocking interaction
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!cardRef.current) return
    const opacity = frame.values.opacity ?? 1
    if (opacity <= 0.01) {
      cardRef.current.style.pointerEvents = "none"
    } else {
      cardRef.current.style.pointerEvents = "auto"
    }
  }, [])

  const { bindRef, isOpen, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "hovercard:open",
    exitTrackId: "hovercard:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const bindCard = bindRef(["opacity", "translateY", "scale"])
  const setCardRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      cardRef.current = el
      bindCard(el)
    },
    [bindCard]
  )

  // Escape key dismisses hover card
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, close])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        {/* Anchored hover + click bridge container */}
        <div
          className="relative inline-flex flex-col items-center"
          onMouseEnter={() => {
            if (!isOpen) open()
          }}
          onMouseLeave={() => {
            if (isOpen) close()
          }}
        >
          {/* Mention Trigger Button */}
          <button
            type="button"
            onClick={() => (isOpen ? close() : open())}
            aria-label="Preview profile card"
            className="inline-flex h-8.5 cursor-pointer items-center rounded-[9px] bg-secondary px-3.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <span>@satisium</span>
          </button>

          {/* Floating Bridge & Card Surface */}
          {isVisible && (
            <div className="absolute bottom-full left-1/2 z-40 -translate-x-1/2 pb-2">
              <div
                ref={setCardRef}
                role="dialog"
                aria-label="Satisium profile preview"
                className="w-[268px] origin-bottom rounded-[14px] bg-secondary p-3.5 will-change-transform"
              >
                {/* Top Row: Identity Monogram & Follow Toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-background font-heading text-sm font-semibold text-foreground">
                      S
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-heading text-xs font-semibold text-foreground">
                        Satisium
                      </span>
                      <span className="truncate font-sans text-[11px] text-muted-foreground">
                        @satisium
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFollowing((f) => !f)
                    }}
                    aria-label={
                      isFollowing ? "Unfollow Satisium" : "Follow Satisium"
                    }
                    className={`h-7 shrink-0 cursor-pointer rounded-[7px] px-2.5 font-sans text-xs font-medium transition-colors ${
                      isFollowing
                        ? "bg-background text-foreground hover:bg-muted"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>

                {/* 1-Line Editorial Bio */}
                <p className="mt-2.5 font-sans text-xs leading-relaxed text-muted-foreground">
                  Precision motion instruments and kinetic UI tools.
                </p>

                {/* Telemetry Metrics Row */}
                <div className="mt-3 flex items-center gap-4 font-sans text-[11px] text-muted-foreground tabular-nums">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">248</span>
                    <span>following</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">14.2k</span>
                    <span>followers</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
