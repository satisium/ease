"use client"

import * as React from "react"
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { useEaseStore, useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface ToastHabitatProps {
  compareItemId?: string
}

export function ToastHabitat({ compareItemId }: ToastHabitatProps = {}) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const isSolo = useEaseStore((s) => s.isSolo)
  const playbackState = useEaseStore((s) => s.playbackState)
  const overlayRef = React.useRef<HTMLDivElement>(null)

  // Pointer-Events Guard: Prevent invisible toast from blocking clicks on trigger underneath
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!overlayRef.current) return
    const opacity = frame.values.opacity ?? 1
    if (opacity <= 0.01) {
      overlayRef.current.style.pointerEvents = "none"
    } else {
      overlayRef.current.style.pointerEvents = "auto"
    }
  }, [])

  const {
    bindRef,
    shouldForceMount: baseForceMount,
    triggerLive,
  } = useTransitionTrack("toast:fire", {
    onFrame: handleFrame,
    compareItemId,
  })

  const isFocused = compareItemId ? true : focusedTrackId === "toast:fire"
  const isSoloOrSingle = isSolo || focusedChannelId !== "all"
  const shouldForceMount = compareItemId
    ? playbackState !== "idle"
    : baseForceMount || (isFocused && isSoloOrSingle)

  const [isToastOpen, setIsToastOpen] = React.useState(false)

  // Sync external/keyboard Spacebar or Toolbar triggers & Compare Mode
  React.useEffect(() => {
    const unsubscribe = store.subscribe((curr, prev) => {
      const isTarget = compareItemId
        ? (curr.compareQueue.find((i) => i.id === compareItemId)
            ?.overrideTrackId ?? curr.globalCompareTarget.trackId) ===
          "toast:fire"
        : curr.focusedTrackId === "toast:fire"

      if (
        isTarget &&
        curr.playbackState === "playing" &&
        prev.playbackState !== "playing"
      ) {
        setIsToastOpen(true)
      }
    })
    return unsubscribe
  }, [store, compareItemId])

  const handleFireToast = React.useCallback(() => {
    setIsToastOpen(true)
    if (compareItemId) {
      store.getState().playScoped()
    } else if (focusedTrackId === "toast:fire") {
      triggerLive()
    } else {
      store.getState().focusTrack("toast:fire")
      store.getState().triggerLive("toast:fire")
    }
  }, [compareItemId, focusedTrackId, triggerLive, store])

  const handleDismiss = React.useCallback(() => {
    setIsToastOpen(false)
    store.getState().pauseScoped()
  }, [store])

  const isVisible = isToastOpen || shouldForceMount

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      {/* 1. At-Rest Center Trigger View: Always mounted calmly underneath at relative z-10 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={handleFireToast}
          aria-label="Send notification toast"
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
          <span>Send Invite</span>
        </button>
      </div>

      {/* 2. Floating Status Toast Instrument (Borderless Satisium Card) */}
      {isVisible && (
        <div
          ref={overlayRef}
          className="absolute bottom-10 z-20 w-full max-w-[360px]"
        >
          <div
            ref={bindRef(["opacity", "translateY", "scale"])}
            className="flex w-full items-center justify-between gap-3 rounded-[14px] bg-card px-4 py-3 will-change-transform"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-secondary text-foreground">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4"
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-heading text-xs font-semibold text-foreground">
                  Invite sent
                </span>
                <span className="truncate font-sans text-[11px] text-muted-foreground">
                  Dispatched to team@satisium.com
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss notification toast"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
