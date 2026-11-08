"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useStudioStore } from "@/store/useStudioStore"
import {
  resolveEase,
  getEasedValue,
} from "@/components/studio/domain/studio-kinetics"

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

export function CarouselScenario() {
  const activeCurveId = useStudioStore((s) => s.activeCurveId)
  const customCurves = useStudioStore((s) => s.customCurves)
  const scenarioSlots = useStudioStore((s) => s.scenarioSlots)
  const scrubProgress = useStudioStore((s) => s.scrubProgress)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const isScrubbing = useStudioStore((s) => s.isScrubbing)
  const isReducedMotion = useStudioStore((s) => s.isReducedMotion)
  const triggerAudition = useStudioStore((s) => s.triggerAudition)

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [targetIndex, setTargetIndex] = React.useState(1)

  // 1. Resolve assigned curve for the "slide" slot
  const currentSlot = scenarioSlots["carousel"]
  const slideCurveId = currentSlot?.slide || activeCurveId
  const slideCurve = React.useMemo(() => {
    return resolveEase(slideCurveId, customCurves)
  }, [slideCurveId, customCurves])

  // 2. Solve mathematical eased progress (0 -> 1)
  const easedProgress = React.useMemo(() => {
    return getEasedValue(scrubProgress, slideCurve, isReducedMotion)
  }, [scrubProgress, slideCurve, isReducedMotion])

  // 3. Interpolated translation offset & settled index
  const isTransitioning = isPlaying || isScrubbing
  const effectiveIndex =
    !isTransitioning && scrubProgress >= 99.5 ? targetIndex : currentIndex
  const travelPercent = isTransitioning
    ? (currentIndex + (targetIndex - currentIndex) * easedProgress) * -100
    : effectiveIndex * -100

  const handleNext = React.useCallback(() => {
    const next = (effectiveIndex + 1) % CAROUSEL_SLIDES.length
    setCurrentIndex(effectiveIndex)
    setTargetIndex(next)
    triggerAudition()
  }, [effectiveIndex, triggerAudition])

  const handlePrev = React.useCallback(() => {
    const prev =
      (effectiveIndex - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length
    setCurrentIndex(effectiveIndex)
    setTargetIndex(prev)
    triggerAudition()
  }, [effectiveIndex, triggerAudition])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="relative w-full max-w-[460px]">
        {/* Paged Card Viewport Window */}
        <div className="relative overflow-hidden rounded-[20px] border border-border bg-card p-6 shadow-xl">
          {/* Card Header Strip */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground">
                <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
              </div>
              <div>
                <h4 className="font-heading text-xs font-semibold text-foreground">
                  Media Carousel Stage
                </h4>
                <p className="font-sans text-[11px] text-muted-foreground">
                  Auditioning symmetric card travel kinetics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="rounded bg-muted px-2 py-0.5 font-medium">
                {
                  CAROUSEL_SLIDES[
                    isTransitioning ? targetIndex : effectiveIndex
                  ].index
                }{" "}
                / 03
              </span>
            </div>
          </div>

          {/* Cards Track Container */}
          <div className="relative my-6 overflow-hidden">
            <div
              style={{
                transform: `translateX(${travelPercent}%)`,
                transition: isTransitioning
                  ? "none"
                  : "transform 0.15s ease-out",
              }}
              className="flex w-full will-change-transform"
            >
              {CAROUSEL_SLIDES.map((slide, idx) => {
                const isActive =
                  idx === (isTransitioning ? targetIndex : effectiveIndex)

                return (
                  <div key={slide.id} className="w-full shrink-0 px-1">
                    <div
                      className={cn(
                        "rounded-[14px] border border-border bg-muted p-5 transition-colors",
                        isActive ? "bg-muted" : "bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground">
                          {slide.tag}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {slide.index}
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-heading text-sm font-semibold tracking-tight text-foreground">
                        {slide.title}
                      </h3>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        {slide.caption}
                      </p>

                      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                        <span className="font-sans text-[11px] text-muted-foreground">
                          {slide.metric}
                        </span>
                        <span className="font-mono text-[11px] font-medium text-foreground">
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
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-1.5">
              {CAROUSEL_SLIDES.map((_, dotIdx) => {
                const isDotActive =
                  dotIdx === (isTransitioning ? targetIndex : effectiveIndex)
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => {
                      setTargetIndex(dotIdx)
                      triggerAudition()
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      isDotActive
                        ? "w-6 bg-foreground"
                        : "w-1.5 bg-border hover:bg-muted-foreground"
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
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Curve Attribution Badge */}
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-foreground" />
            <span>Slide Slot:</span>
            <span className="font-medium text-foreground">
              {slideCurve.name}
            </span>
          </span>
          <span className="font-mono text-[10px]">
            {Math.round(slideCurve.duration)}ms · {slideCurve.engine}
          </span>
        </div>
      </div>
    </div>
  )
}
