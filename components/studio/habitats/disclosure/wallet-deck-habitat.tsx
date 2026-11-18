"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface WalletDeckHabitatProps {
  compareItemId?: string
}

const CARDS = [
  {
    id: "core",
    name: "Satisium Core",
    label: "01 / 03",
    tag: "Design System",
    code: "SAT-01",
    bgClass: "bg-foreground text-background",
  },
  {
    id: "lab",
    name: "Kinetic Lab",
    label: "02 / 03",
    tag: "Motion Curves",
    code: "SAT-02",
    bgClass: "bg-secondary text-foreground",
  },
  {
    id: "physics",
    name: "Spring Physics",
    label: "03 / 03",
    tag: "Harmonic ODE",
    code: "SAT-03",
    bgClass: "bg-muted text-foreground",
  },
] as const

export function WalletDeckHabitat({
  compareItemId,
}: WalletDeckHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [activeIndex, setActiveIndex] = React.useState<number>(0)
  const deckContainerRef = React.useRef<HTMLDivElement | null>(null)

  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!deckContainerRef.current) return
    const cardEls =
      deckContainerRef.current.querySelectorAll<HTMLDivElement>(
        "[data-card-slot]"
      )
    if (cardEls.length < 3) return

    const p = Math.min(1.12, Math.max(0, frame.progressByChannel.slide ?? 0))
    const dScale = frame.values.depth ?? 0.94

    const phase = Math.min(1, Math.max(0, p))
    const arc = Math.sin(phase * Math.PI)
    const amp = Math.abs(frame.values.slide ?? 0) > 0.01 ? -148 * arc : 0

    // Outgoing Front Card (Slot 0)
    const card0 = cardEls[0]
    if (card0) {
      const y0 = phase * 20
      const s0 = 1 - 0.12 * phase
      const rot0 = -4 * arc
      card0.style.transform = `translate3d(${amp.toFixed(2)}px, ${y0.toFixed(2)}px, 0px) scale(${s0.toFixed(4)}) rotate(${rot0.toFixed(2)}deg)`
      card0.style.zIndex = phase > 0.48 ? "5" : "30"
    }

    // Promoting Card (Slot 1)
    const card1 = cardEls[1]
    if (card1) {
      const y1 = 10 * (1 - phase)
      card1.style.transform = `translate3d(0px, ${y1.toFixed(2)}px, 0px) scale(${dScale.toFixed(4)})`
      card1.style.zIndex = phase > 0.48 ? "30" : "20"
    }

    // Back Card (Slot 2)
    const card2 = cardEls[2]
    if (card2) {
      const y2 = 20 - 10 * phase
      const s2 = 0.88 + 0.06 * phase
      card2.style.transform = `translate3d(0px, ${y2.toFixed(2)}px, 0px) scale(${s2.toFixed(4)})`
      card2.style.zIndex = "10"
    }
  }, [])

  const { triggerLive } = useTransitionTrack("carousel:slide", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleNext = React.useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % 3)
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [compareItemId, store, triggerLive])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex flex-col items-center gap-5">
          {/* Deck Container */}
          <div ref={deckContainerRef} className="relative h-[168px] w-[252px]">
            {[0, 1, 2].map((slot) => {
              const card = CARDS[(activeIndex + slot) % 3]
              return (
                <div
                  key={card.id}
                  data-card-slot={slot}
                  onClick={handleNext}
                  style={{
                    zIndex: slot === 0 ? 30 : slot === 1 ? 20 : 10,
                    transform:
                      slot === 0
                        ? "translate3d(0px, 0px, 0px) scale(1)"
                        : slot === 1
                          ? "translate3d(0px, 10px, 0px) scale(0.94)"
                          : "translate3d(0px, 20px, 0px) scale(0.88)",
                  }}
                  className={`absolute top-0 left-0 flex h-[146px] w-[252px] cursor-pointer flex-col justify-between rounded-[14px] p-4 will-change-transform ${card.bgClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-semibold tracking-wider uppercase opacity-80">
                      {card.tag}
                    </span>
                    <span className="font-heading text-xs font-semibold tabular-nums">
                      {card.label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <h4 className="font-heading text-sm font-semibold">
                        {card.name}
                      </h4>
                      <p className="font-sans text-[11px] opacity-75">
                        {card.code}
                      </p>
                    </div>
                    <span className="font-heading text-[10px] font-semibold tracking-wider uppercase opacity-60">
                      Pass
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Controls Below Deck */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeIndex
                      ? "w-4 bg-foreground"
                      : "w-1.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next card slide"
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[9px] bg-secondary px-3 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            >
              Next Card
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
