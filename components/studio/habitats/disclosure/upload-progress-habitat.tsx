"use client"

import * as React from "react"
import { Upload01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface UploadProgressHabitatProps {
  compareItemId?: string
}

export function UploadProgressHabitat({
  compareItemId,
}: UploadProgressHabitatProps = {}) {
  const store = useEaseStoreApi()
  const fillRef = React.useRef<HTMLDivElement | null>(null)
  const shimmerRef = React.useRef<HTMLDivElement | null>(null)
  const pctRef = React.useRef<HTMLSpanElement | null>(null)

  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const val = Math.min(1, Math.max(0, frame.values.fill ?? 0))
    const shimmerX = frame.values.shimmer ?? -100
    const p = Math.min(1, Math.max(0, frame.progressByChannel.fill ?? val))

    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${val.toFixed(4)})`
    }
    if (pctRef.current) {
      pctRef.current.textContent = `${Math.round(val * 100)}%`
    }
    if (shimmerRef.current) {
      shimmerRef.current.style.transform = `translate3d(${shimmerX.toFixed(2)}%, 0px, 0px) skewX(-20deg)`
      shimmerRef.current.style.opacity = (
        p > 0.01 && p < 0.99 ? 0.3 * Math.sin(p * Math.PI) : 0
      ).toFixed(3)
    }
  }, [])

  const { triggerLive } = useTransitionTrack("progress:run", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleTrigger = React.useCallback(() => {
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [compareItemId, store, triggerLive])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex w-full max-w-[296px] flex-col items-center gap-3.5">
          {/* File Card */}
          <div className="w-full rounded-[12px] bg-secondary p-3.5">
            {/* Top row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-background text-foreground">
                  <HugeiconsIcon
                    icon={Upload01Icon}
                    className="size-4 shrink-0"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-heading text-xs font-semibold text-foreground">
                    ease-tokens-v1.json
                  </p>
                  <p className="font-sans text-[11px] text-muted-foreground">
                    2.4 MB
                  </p>
                </div>
              </div>
              <span
                ref={pctRef}
                className="shrink-0 font-heading text-xs font-semibold text-foreground tabular-nums"
              >
                0%
              </span>
            </div>

            {/* Progress Track */}
            <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                ref={fillRef}
                style={{ transform: "scaleX(0)" }}
                className="h-full w-full origin-left rounded-full bg-foreground will-change-transform"
              />
              <div
                ref={shimmerRef}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-background opacity-0 will-change-transform"
              />
            </div>
          </div>

          {/* Trigger Button */}
          <button
            type="button"
            onClick={handleTrigger}
            aria-label="Start upload progress"
            className="inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[9px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
          >
            Start Upload
          </button>
        </div>
      </div>
    </div>
  )
}
