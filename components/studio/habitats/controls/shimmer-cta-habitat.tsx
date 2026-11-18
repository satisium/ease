"use client"

import * as React from "react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface ShimmerCtaHabitatProps {
  compareItemId?: string
}

export function ShimmerCtaHabitat({
  compareItemId,
}: ShimmerCtaHabitatProps = {}) {
  const store = useEaseStoreApi()

  const btnRef = React.useRef<HTMLButtonElement>(null)
  const shimmerRef = React.useRef<HTMLSpanElement>(null)
  const arrowOutRef = React.useRef<HTMLSpanElement>(null)
  const arrowInRef = React.useRef<HTMLSpanElement>(null)

  // 120fps Imperative GPU driver: press compression, arrow swap, and specular sweep
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    // 1. Press compression impulse
    if (btnRef.current) {
      const pScale = Math.min(
        1,
        Math.max(0, frame.progressByChannel.scale ?? 0)
      )
      const pressPulse = Math.sin(pScale * Math.PI)
      btnRef.current.style.transform = `scale(${(1 - 0.035 * pressPulse).toFixed(4)})`
    }

    // 2. Arrow Swap Glide
    const pArrow = frame.progressByChannel.arrow ?? 0
    if (arrowOutRef.current) {
      const opacity = Math.max(0, 1 - pArrow * 1.8)
      arrowOutRef.current.style.opacity = opacity.toFixed(3)
      arrowOutRef.current.style.transform = `translate3d(${(pArrow * 14).toFixed(2)}px, 0px, 0px)`
    }
    if (arrowInRef.current) {
      const opacity = Math.min(1, Math.max(0, pArrow * 1.5 - 0.25))
      arrowInRef.current.style.opacity = opacity.toFixed(3)
      arrowInRef.current.style.transform = `translate3d(${((pArrow - 1) * 14).toFixed(2)}px, 0px, 0px)`
    }

    // 3. Specular Shimmer Sweep (Zero Tailwind opacity modifier, pure JS numeric opacity)
    if (shimmerRef.current) {
      const pShimmer = Math.min(
        1,
        Math.max(0, frame.progressByChannel.shimmer ?? 0)
      )
      const shimmerX = frame.values.shimmer ?? -120
      shimmerRef.current.style.transform = `translate3d(${shimmerX.toFixed(2)}%, 0px, 0px) skewX(-20deg)`
      shimmerRef.current.style.opacity = (
        0.22 * Math.sin(pShimmer * Math.PI)
      ).toFixed(3)
    }
  }, [])

  const { triggerLive } = useTransitionTrack("cta:press", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleClick = () => {
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        <button
          ref={btnRef}
          type="button"
          onClick={handleClick}
          aria-label="Get started CTA button"
          className="relative inline-flex h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-[12px] bg-foreground px-4 font-heading text-xs font-medium text-background will-change-transform select-none active:scale-98"
        >
          {/* Shimmer Overlay */}
          <span
            ref={shimmerRef}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-background opacity-0 will-change-transform"
            style={{
              transform: "translate3d(-120.00%, 0px, 0px) skewX(-20deg)",
            }}
          />

          {/* Action Label */}
          <span className="relative z-10">Get Started</span>

          {/* Double Arrow Swap Slot */}
          <div className="relative z-10 flex size-4 items-center justify-center overflow-hidden">
            <span
              ref={arrowOutRef}
              className="absolute inset-0 flex items-center justify-center will-change-transform"
            >
              <HugeiconsIcon icon={ArrowRight02Icon} className="size-3.5" />
            </span>
            <span
              ref={arrowInRef}
              className="absolute inset-0 flex items-center justify-center will-change-transform"
              style={{
                opacity: 0,
                transform: "translate3d(-14.00px, 0px, 0px)",
              }}
            >
              <HugeiconsIcon icon={ArrowRight02Icon} className="size-3.5" />
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
