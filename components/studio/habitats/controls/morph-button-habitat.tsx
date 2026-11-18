"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStore, useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface MorphButtonHabitatProps {
  compareItemId?: string
}

export function MorphButtonHabitat({
  compareItemId,
}: MorphButtonHabitatProps = {}) {
  const store = useEaseStoreApi()
  const playbackState = useEaseStore((s) => s.playbackState)

  const btnRef = React.useRef<HTMLButtonElement>(null)
  const idleRef = React.useRef<HTMLSpanElement>(null)
  const loadingRef = React.useRef<HTMLSpanElement>(null)
  const doneRef = React.useRef<HTMLSpanElement>(null)
  const spinnerRef = React.useRef<SVGSVGElement>(null)
  const checkPathRef = React.useRef<SVGPathElement>(null)

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = React.useRef<number | null>(null)

  const cancelAutoSettle = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Pure 120fps GPU visual driver
  const applyMorphVisuals = React.useCallback((pScale: number, pm: number) => {
    if (!btnRef.current) return

    // 1. Scale pulse: sin wave over press compression
    const pressPulse = Math.sin(pScale * Math.PI)
    const scaleVal = 1 - 0.04 * pressPulse

    // 2. Status Morph Progress (138px Deploy Changes -> 118px Deploying -> 116px Deployed)
    const clampedM = Math.min(1, Math.max(0, pm))
    let w = 138
    if (clampedM <= 0.4) {
      w = 138 - (clampedM / 0.4) * 20
    } else {
      w = 118 - ((clampedM - 0.4) / 0.6) * 2
    }

    btnRef.current.style.width = `${w.toFixed(1)}px`
    btnRef.current.style.transform = `scale(${scaleVal.toFixed(4)})`

    // Stage 1 (Deploy Changes, idleRef): active 0..0.28
    if (idleRef.current) {
      const t = Math.min(1, clampedM / 0.26)
      const opacity = 1 - t
      const translateY = -10 * t
      const blur = t * 4
      idleRef.current.style.opacity = Math.max(0, opacity).toFixed(3)
      idleRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`
      idleRef.current.style.filter =
        blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"
      idleRef.current.style.pointerEvents = opacity > 0.1 ? "auto" : "none"
    }

    // Stage 2 (Deploying, loadingRef): bell curve 0.20..0.68
    if (loadingRef.current) {
      let vis = 0
      let y = 0
      if (clampedM < 0.2) {
        vis = 0
        y = 10
      } else if (clampedM <= 0.38) {
        vis = (clampedM - 0.2) / 0.18
        y = 10 * (1 - vis)
      } else if (clampedM <= 0.52) {
        vis = 1
        y = 0
      } else if (clampedM <= 0.68) {
        const exitT = (clampedM - 0.52) / 0.16
        vis = 1 - exitT
        y = -10 * exitT
      } else {
        vis = 0
        y = -10
      }

      const blur = (1 - vis) * 4
      loadingRef.current.style.opacity = Math.max(0, Math.min(1, vis)).toFixed(
        3
      )
      loadingRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
      loadingRef.current.style.filter =
        blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"
      loadingRef.current.style.pointerEvents = vis > 0.1 ? "auto" : "none"

      if (spinnerRef.current) {
        spinnerRef.current.style.transform = `rotate(${(clampedM * 720).toFixed(1)}deg)`
      }
    }

    // Stage 3 (Deployed ✓, doneRef): enters 0.62..1.0
    if (doneRef.current) {
      const u = Math.min(1, Math.max(0, (pm - 0.62) / 0.38))
      const opacity = Math.min(1, u)
      const translateY = (1 - u) * 10
      const blur = Math.max(0, (1 - u) * 4)

      doneRef.current.style.opacity = opacity.toFixed(3)
      doneRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`
      doneRef.current.style.filter =
        blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"
      doneRef.current.style.pointerEvents = opacity > 0.1 ? "auto" : "none"

      if (checkPathRef.current) {
        const checkProgress = Math.min(1, Math.max(0, (clampedM - 0.68) / 0.3))
        checkPathRef.current.style.strokeDashoffset = (
          24 *
          (1 - checkProgress)
        ).toFixed(2)
      }
    }
  }, [])

  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      cancelAutoSettle()
      const pScale = Math.min(
        1,
        Math.max(0, frame.progressByChannel.scale ?? 0)
      )
      const pm = Math.min(1.15, Math.max(0, frame.progressByChannel.morph ?? 0))
      applyMorphVisuals(pScale, pm)
    },
    [cancelAutoSettle, applyMorphVisuals]
  )

  const { triggerLive } = useTransitionTrack("button:press", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleClick = () => {
    cancelAutoSettle()
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }

  // Live Auto-Settle Back to "Deploy Changes" (Non-Intrusive to Scrub/Compare)
  React.useEffect(() => {
    cancelAutoSettle()
    if (compareItemId) return

    const snapshot = store.conductor.getSnapshot()
    if (
      playbackState === "idle" &&
      snapshot.interactionMode === "live" &&
      snapshot.progress >= 0.99
    ) {
      timerRef.current = setTimeout(() => {
        const startTime = performance.now()
        const duration = 220

        const tick = (now: number) => {
          const elapsed = now - startTime
          const t = Math.min(1, elapsed / duration)
          const eased = 1 - (1 - t) * (1 - t) // Ease-out
          const currentPm = 1 - eased
          applyMorphVisuals(0, currentPm)

          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick)
          } else {
            rafRef.current = null
          }
        }

        rafRef.current = requestAnimationFrame(tick)
      }, 1100)
    }

    return () => {
      cancelAutoSettle()
    }
  }, [playbackState, compareItemId, cancelAutoSettle, applyMorphVisuals, store])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        <button
          ref={btnRef}
          type="button"
          onClick={handleClick}
          aria-label="Deploy changes status button"
          className="relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-[12px] bg-foreground font-heading text-xs font-medium text-background will-change-transform select-none active:scale-98"
          style={{ width: "138px" }}
        >
          {/* Stage 1: Deploy Changes */}
          <span
            ref={idleRef}
            className="absolute inset-0 flex items-center justify-center font-heading text-xs font-semibold tracking-tight text-background will-change-transform"
          >
            Deploy Changes
          </span>

          {/* Stage 2: Deploying */}
          <span
            ref={loadingRef}
            className="absolute inset-0 flex items-center justify-center gap-2 font-heading text-xs font-semibold tracking-tight text-background will-change-transform"
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <svg
              ref={spinnerRef}
              className="size-3.5 fill-none stroke-current stroke-2 will-change-transform"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.25"
              />
              <path
                d="M12 3a9 9 0 0 1 9 9"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            <span>Deploying</span>
          </span>

          {/* Stage 3: Deployed */}
          <span
            ref={doneRef}
            className="absolute inset-0 flex items-center justify-center gap-1.5 font-heading text-xs font-semibold tracking-tight text-background will-change-transform"
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <svg
              className="size-3.5 fill-none stroke-current stroke-2"
              viewBox="0 0 24 24"
            >
              <path
                ref={checkPathRef}
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                strokeDashoffset="24"
              />
            </svg>
            <span>Deployed</span>
          </span>
        </button>
      </div>
    </div>
  )
}
