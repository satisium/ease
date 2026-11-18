"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface ProgressWizardHabitatProps {
  compareItemId?: string
}

const WIZARD_STEPS = [
  {
    id: "account",
    category: "Account",
    title: "Workspace Identity",
    description: "Set your team handle and region.",
  },
  {
    id: "physics",
    category: "Physics",
    title: "Motion Defaults",
    description: "Choose cubic-bezier or spring ODE.",
  },
  {
    id: "export",
    category: "Export",
    title: "Ship Tokens",
    description: "Copy Tailwind v4 or Motion code.",
  },
] as const

export function ProgressWizardHabitat({
  compareItemId,
}: ProgressWizardHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [stepIndex, setStepIndex] = React.useState<number>(0)
  const fromStepRef = React.useRef<number>(0)
  const toStepRef = React.useRef<number>(1)

  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const barRef = React.useRef<HTMLDivElement | null>(null)

  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      if (!trackRef.current) return

      const p = frame.progressByChannel.slide ?? 0
      const pBar = frame.progressByChannel.progress ?? p
      const isCompare = Boolean(compareItemId)

      const fromIdx = isCompare ? 0 : fromStepRef.current
      const toIdx = isCompare ? 1 : toStepRef.current
      const pos = fromIdx + (toIdx - fromIdx) * p

      trackRef.current.style.transform = `translate3d(${(-pos * 100).toFixed(3)}%, 0px, 0px)`

      if (barRef.current) {
        const startFill = (fromIdx + 1) / 3
        const endFill = (toIdx + 1) / 3
        const fill = Math.max(
          0.05,
          Math.min(1, startFill + (endFill - startFill) * pBar)
        )
        barRef.current.style.transform = `scaleX(${fill.toFixed(4)})`
      }
    },
    [compareItemId]
  )

  const { triggerLive } = useTransitionTrack("wizard:step", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleNext = React.useCallback(() => {
    const next = (stepIndex + 1) % 3
    fromStepRef.current = stepIndex
    toStepRef.current = next
    setStepIndex(next)

    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [stepIndex, compareItemId, store, triggerLive])

  const handleBack = React.useCallback(() => {
    if (stepIndex === 0) return
    const prev = stepIndex - 1
    fromStepRef.current = stepIndex
    toStepRef.current = prev
    setStepIndex(prev)

    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [stepIndex, compareItemId, store, triggerLive])

  const currentStep = WIZARD_STEPS[stepIndex]

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex w-full max-w-[300px] flex-col gap-4">
          {/* Header Progress Counter */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-semibold text-foreground">
                {currentStep.category}
              </span>
              <span className="font-sans text-[11px] font-medium text-muted-foreground tabular-nums">
                Step {stepIndex + 1} of 3
              </span>
            </div>

            {/* Segmented Progress Track */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                ref={barRef}
                style={{
                  transform: `scaleX(${((stepIndex + 1) / 3).toFixed(4)})`,
                }}
                className="h-full w-full origin-left rounded-full bg-foreground will-change-transform"
              />
            </div>
          </div>

          {/* Continuous 3-Card Viewport */}
          <div className="w-full overflow-hidden rounded-[12px]">
            <div
              ref={trackRef}
              style={{
                transform: `translate3d(${(-stepIndex * 100).toFixed(3)}%, 0px, 0px)`,
              }}
              className="flex w-full will-change-transform"
            >
              {WIZARD_STEPS.map((step) => (
                <div key={step.id} className="w-full shrink-0 px-0.5">
                  <div className="flex h-[88px] flex-col justify-between rounded-[12px] bg-secondary p-3.5">
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-foreground">
                        {step.title}
                      </h4>
                      <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                      <span className="font-sans text-[10px] text-muted-foreground">
                        Auto-configured
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex === 0}
              aria-label="Previous wizard step"
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3 font-heading text-xs font-medium text-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next wizard step"
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
            >
              {stepIndex === 2 ? "Finish" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
