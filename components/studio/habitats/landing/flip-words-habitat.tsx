"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface FlipWordsHabitatProps {
  compareItemId?: string
}

const WORDS = ["effortless", "tactile", "weightless", "exact"] as const

export function FlipWordsHabitat({
  compareItemId,
}: FlipWordsHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [wordIndex, setWordIndex] = React.useState<number>(0)
  const [prevIndex, setPrevIndex] = React.useState<number>(WORDS.length - 1)
  const hasPlayedRef = React.useRef<boolean>(false)

  const outRef = React.useRef<HTMLSpanElement | null>(null)
  const inRef = React.useRef<HTMLSpanElement | null>(null)

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
        if (inRef.current) {
          inRef.current.style.transform = "translate3d(0px, 0.00px, 0px)"
          inRef.current.style.opacity = "1.000"
          inRef.current.style.filter = "none"
        }
        if (outRef.current) {
          outRef.current.style.transform = "translate3d(0px, 0.00px, 0px)"
          outRef.current.style.opacity = "0.000"
          outRef.current.style.filter = "none"
        }
        return
      }

      const yOut = frame.values.wordOut ?? 0
      const pOut = Math.min(
        1,
        Math.max(0, frame.progressByChannel.wordOut ?? 0)
      )
      const yIn = frame.values.wordIn ?? 18
      const pIn = Math.min(1, Math.max(0, frame.progressByChannel.wordIn ?? 0))

      if (outRef.current) {
        outRef.current.style.opacity = Math.max(0, 1 - pOut * 1.25).toFixed(3)
        outRef.current.style.transform = `translate3d(0px, ${yOut.toFixed(2)}px, 0px)`
        outRef.current.style.filter =
          pOut <= 0.01 ? "none" : `blur(${(pOut * 3).toFixed(2)}px)`
      }

      if (inRef.current) {
        inRef.current.style.opacity = Math.min(1, pIn * 1.35).toFixed(3)
        inRef.current.style.transform = `translate3d(0px, ${yIn.toFixed(2)}px, 0px)`
        inRef.current.style.filter =
          pIn >= 0.99
            ? "none"
            : `blur(${((1 - Math.min(1, pIn)) * 3).toFixed(2)}px)`
      }
    },
    [compareItemId, store]
  )

  const { triggerLive } = useTransitionTrack("flipwords:cycle", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleNext = React.useCallback(() => {
    const next = (wordIndex + 1) % WORDS.length
    hasPlayedRef.current = true
    setPrevIndex(wordIndex)
    setWordIndex(next)

    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [wordIndex, compareItemId, store, triggerLive])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex flex-col items-center text-center">
          {/* Lead-in */}
          <span className="font-heading text-xs font-medium text-muted-foreground sm:text-sm">
            Design motion that feels
          </span>

          {/* Centered Slot */}
          <div className="relative mt-1 flex h-10 w-52 items-center justify-center overflow-hidden">
            <span
              ref={outRef}
              aria-hidden="true"
              style={{
                transform: "translate3d(0px, 0.00px, 0px)",
                opacity: 0,
                filter: "none",
              }}
              className="pointer-events-none absolute font-editorial text-2xl tracking-[-0.015em] text-foreground italic will-change-transform sm:text-3xl"
            >
              {WORDS[prevIndex]}
            </span>
            <span
              ref={inRef}
              style={{
                transform: "translate3d(0px, 0.00px, 0px)",
                opacity: 1,
                filter: "none",
              }}
              className="absolute font-editorial text-2xl tracking-[-0.015em] text-foreground italic will-change-transform sm:text-3xl"
            >
              {WORDS[wordIndex]}
            </span>
          </div>

          {/* Trigger */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Cycle flip word"
            className="mt-4 inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[9px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            Next Word
          </button>
        </div>
      </div>
    </div>
  )
}
