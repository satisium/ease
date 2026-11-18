"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface HeroRevealHabitatProps {
  compareItemId?: string
}

export function HeroRevealHabitat({
  compareItemId,
}: HeroRevealHabitatProps = {}) {
  const store = useEaseStoreApi()
  const hasPlayedRef = React.useRef<boolean>(false)

  const line1Ref = React.useRef<HTMLSpanElement | null>(null)
  const line2Ref = React.useRef<HTMLSpanElement | null>(null)
  const subRef = React.useRef<HTMLParagraphElement | null>(null)

  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      const snap = store.conductor?.getSnapshot?.()
      const isScrubbing = store.getState().playbackState === "scrubbing"
      if (
        (snap && snap.playbackState !== "idle") ||
        (snap && snap.elapsedMs > 0) ||
        isScrubbing ||
        Boolean(compareItemId)
      ) {
        hasPlayedRef.current = true
      }

      if (
        !hasPlayedRef.current &&
        !compareItemId &&
        snap?.playbackState === "idle" &&
        !isScrubbing
      ) {
        if (line1Ref.current) {
          line1Ref.current.style.transform = "translate3d(0px, 0.00%, 0px)"
        }
        if (line2Ref.current) {
          line2Ref.current.style.transform = "translate3d(0px, 0.00%, 0px)"
        }
        if (subRef.current) {
          subRef.current.style.opacity = "1.000"
          subRef.current.style.transform = "translate3d(0px, 0.00px, 0px)"
        }
        return
      }

      const y1 = frame.values.line1 ?? 105
      const y2 = frame.values.line2 ?? 105
      const opSub = Math.min(1, Math.max(0, frame.values.subtitle ?? 0))
      const subY = (1 - opSub) * 8

      if (line1Ref.current) {
        line1Ref.current.style.transform = `translate3d(0px, ${y1.toFixed(2)}%, 0px)`
      }
      if (line2Ref.current) {
        line2Ref.current.style.transform = `translate3d(0px, ${y2.toFixed(2)}%, 0px)`
      }
      if (subRef.current) {
        subRef.current.style.opacity = opSub.toFixed(3)
        subRef.current.style.transform = `translate3d(0px, ${subY.toFixed(2)}px, 0px)`
      }
    },
    [compareItemId, store]
  )

  const { triggerLive } = useTransitionTrack("hero:reveal", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleTrigger = React.useCallback(() => {
    hasPlayedRef.current = true
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [compareItemId, store, triggerLive])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex max-w-[360px] flex-col items-center text-center">
          {/* Line 1 Mask */}
          <div className="overflow-hidden leading-[1.12]">
            <span
              ref={line1Ref}
              style={{ transform: "translate3d(0px, 0.00%, 0px)" }}
              className="block font-heading text-xl font-semibold tracking-[-0.03em] text-foreground will-change-transform sm:text-2xl"
            >
              Precision motion
            </span>
          </div>

          {/* Line 2 Mask */}
          <div className="overflow-hidden leading-[1.15]">
            <span
              ref={line2Ref}
              style={{ transform: "translate3d(0px, 0.00%, 0px)" }}
              className="block font-editorial text-2xl font-normal tracking-[-0.015em] text-foreground italic will-change-transform sm:text-3xl"
            >
              crafted for interfaces
            </span>
          </div>

          {/* Subtitle */}
          <p
            ref={subRef}
            style={{ opacity: 1, transform: "translate3d(0px, 0.00px, 0px)" }}
            className="mt-2.5 font-sans text-xs text-muted-foreground will-change-[transform,opacity]"
          >
            Deterministic curves and analytical springs at 120fps.
          </p>

          {/* Trigger */}
          <button
            type="button"
            onClick={handleTrigger}
            aria-label="Replay hero reveal"
            className="mt-5 inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[9px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            Replay Reveal
          </button>
        </div>
      </div>
    </div>
  )
}
