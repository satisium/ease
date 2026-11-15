"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useEaseStore, useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"
import type { TrackFrameResult } from "@/core"

const CAROUSEL_SLIDES = [
  {
    id: "slide-1",
    index: "01",
    tag: "INERTIAL DYNAMICS",
    title: "Continuous Fluid Paging",
    caption:
      "Horizontal surface translation powered by natural spring momentum and settling velocity.",
    metric: "Natural Deceleration",
    value: "320ms",
  },
  {
    id: "slide-2",
    index: "02",
    tag: "MASS & FRICTION",
    title: "Symmetric Card Travel",
    caption:
      "Equal-tempo bidirectional transitions maintaining spatial continuity across viewports.",
    metric: "Resting Tension",
    value: "180 N/m",
  },
  {
    id: "slide-3",
    index: "03",
    tag: "KINETIC BOUNDS",
    title: "Boundary Resistance",
    caption:
      "Progressive edge resistance preventing jarring stops when navigating rapid card sequences.",
    metric: "Overshoot Buffer",
    value: "0.08 rad",
  },
]

export interface CarouselHabitatProps {
  compareItemId?: string
}

export function CarouselHabitat({ compareItemId }: CarouselHabitatProps = {}) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)

  const [currentIndex, setCurrentIndex] = React.useState<number>(0)
  const stripRef = React.useRef<HTMLDivElement>(null)
  const fromIndexRef = React.useRef<number>(0)
  const targetIndexRef = React.useRef<number>(0)
  const isInternalNavRef = React.useRef<boolean>(false)

  const onFrame = React.useCallback((result: TrackFrameResult) => {
    if (!stripRef.current) return
    const tx = result.values["translateX"] ?? 0
    // translateX goes from 0 to -100 (%)
    const progress = tx / -100
    const interp =
      fromIndexRef.current +
      (targetIndexRef.current - fromIndexRef.current) * progress

    stripRef.current.style.transform = `translate3d(${-interp * 100}%, 0, 0)`
  }, [])

  const { triggerLive } = useTransitionTrack("carousel:slide", {
    onFrame,
    compareItemId,
  })

  // Sync external/keyboard Spacebar or Toolbar triggers & Compare Mode
  React.useEffect(() => {
    const unsubscribe = store.subscribe((curr, prev) => {
      const isTarget = compareItemId
        ? (curr.compareQueue.find((i) => i.id === compareItemId)
            ?.overrideTrackId ?? curr.globalCompareTarget.trackId) ===
          "carousel:slide"
        : curr.focusedTrackId === "carousel:slide"

      if (
        isTarget &&
        curr.playbackState === "playing" &&
        prev.playbackState !== "playing"
      ) {
        if (isInternalNavRef.current) {
          isInternalNavRef.current = false
          return
        }
        const currentTarget = targetIndexRef.current
        const next = (currentTarget + 1) % CAROUSEL_SLIDES.length
        fromIndexRef.current = currentTarget
        targetIndexRef.current = next
        setCurrentIndex(next)
      }
    })
    return unsubscribe
  }, [store, compareItemId])

  const navigateTo = (target: number) => {
    if (target === currentIndex) return
    isInternalNavRef.current = true
    fromIndexRef.current = currentIndex
    targetIndexRef.current = target
    setCurrentIndex(target)

    if (compareItemId) {
      store.getState().playScoped()
    } else if (focusedTrackId === "carousel:slide") {
      triggerLive()
    } else {
      store.getState().focusTrack("carousel:slide")
      store.getState().triggerLive("carousel:slide")
    }
  }

  const handleNext = () => {
    const next = (currentIndex + 1) % CAROUSEL_SLIDES.length
    navigateTo(next)
  }

  const handlePrev = () => {
    const prev =
      (currentIndex - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length
    navigateTo(prev)
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="w-full max-w-[420px]">
        {/* Carousel Workstation Card (Borderless Satisium Card) */}
        <div className="rounded-[20px] bg-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-[8px] bg-secondary text-foreground">
                <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
              </div>
              <div>
                <h4 className="font-heading text-xs font-semibold text-foreground">
                  Media Carousel Stage
                </h4>
                <p className="font-sans text-[11px] text-muted-foreground">
                  Auditioning bidirectional sliding kinetics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-sans text-[10px] text-muted-foreground tabular-nums">
              <span className="rounded-[6px] bg-muted px-2 py-0.5 font-medium">
                {CAROUSEL_SLIDES[currentIndex].index} / 03
              </span>
            </div>
          </div>

          {/* Cards Track Container */}
          <div className="relative my-4 overflow-hidden">
            <div ref={stripRef} className="flex w-full will-change-transform">
              {CAROUSEL_SLIDES.map((slide, idx) => {
                const isActive = idx === currentIndex

                return (
                  <div key={slide.id} className="w-full shrink-0 px-1">
                    <div
                      className={cn(
                        "rounded-[14px] p-5 transition-colors",
                        isActive ? "bg-muted" : "bg-secondary"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[10px] font-medium tracking-wider text-muted-foreground">
                          {slide.tag}
                        </span>
                        <span className="font-sans text-[11px] font-semibold text-foreground tabular-nums">
                          {slide.index}
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-heading text-sm font-semibold tracking-tight text-foreground">
                        {slide.title}
                      </h3>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        {slide.caption}
                      </p>

                      <div className="mt-4 flex items-center justify-between rounded-[8px] bg-card px-3 py-2">
                        <span className="font-sans text-[11px] text-muted-foreground">
                          {slide.metric}
                        </span>
                        <span className="font-sans text-[11px] font-medium text-foreground tabular-nums">
                          {slide.value}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Controls & Pagination Dots */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {CAROUSEL_SLIDES.map((_, dotIdx) => {
                const isDotActive = dotIdx === currentIndex
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => navigateTo(dotIdx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      isDotActive
                        ? "w-6 bg-foreground"
                        : "w-1.5 bg-muted-foreground hover:bg-foreground"
                    )}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                  />
                )
              })}
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
