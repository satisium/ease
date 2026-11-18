"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface ToastStackHabitatProps {
  compareItemId?: string
}

const TOAST_ITEMS = [
  { title: "Changes published", subtitle: "Production · main branch" },
  { title: "Event created", subtitle: "Mon, Jan 3 at 6:00 PM" },
  { title: "Invite link copied", subtitle: "Anyone with link can view" },
] as const

export function ToastStackHabitat({
  compareItemId,
}: ToastStackHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [headIndex, setHeadIndex] = React.useState<number>(0)
  const [isHovered, setIsHovered] = React.useState<boolean>(false)

  const stackContainerRef = React.useRef<HTMLDivElement | null>(null)
  const fanProgressRef = React.useRef<number>(0)
  const hoverRafRef = React.useRef<number | null>(null)

  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (hoverRafRef.current !== null) {
      cancelAnimationFrame(hoverRafRef.current)
      hoverRafRef.current = null
    }
    fanProgressRef.current = 0

    if (!stackContainerRef.current) return
    const cards =
      stackContainerRef.current.querySelectorAll<HTMLDivElement>(
        "[data-toast-slot]"
      )
    if (cards.length < 3) return

    const p = Math.min(1.15, Math.max(0, frame.progressByChannel.rise ?? 0))
    const op = Math.min(1, Math.max(0, frame.values.opacity ?? 0))
    const yIncoming = frame.values.rise ?? 24
    const sIncoming = frame.values.scale ?? 0.94

    // Slot 0 (Front incoming toast)
    const card0 = cards[0]
    if (card0) {
      card0.style.opacity = op.toFixed(3)
      card0.style.transform = `translate3d(0px, ${yIncoming.toFixed(2)}px, 0px) scale(${sIncoming.toFixed(4)})`
      card0.style.zIndex = "30"
    }

    // Slot 1 (Compressing upward from slot 0 -> slot 1)
    const card1 = cards[1]
    if (card1) {
      const y1 = -10 * p
      const s1 = 1 - 0.06 * p
      const o1 = 1 - 0.16 * p
      card1.style.opacity = o1.toFixed(3)
      card1.style.transform = `translate3d(0px, ${y1.toFixed(2)}px, 0px) scale(${s1.toFixed(4)})`
      card1.style.zIndex = "20"
    }

    // Slot 2 (Compressing upward from slot 1 -> slot 2)
    const card2 = cards[2]
    if (card2) {
      const y2 = -10 - 10 * p
      const s2 = 0.94 - 0.06 * p
      const o2 = 0.84 - 0.24 * p
      card2.style.opacity = o2.toFixed(3)
      card2.style.transform = `translate3d(0px, ${y2.toFixed(2)}px, 0px) scale(${s2.toFixed(4)})`
      card2.style.zIndex = "10"
    }
  }, [])

  const { triggerLive } = useTransitionTrack("toast:fire", {
    compareItemId,
    onFrame: handleFrame,
  })

  const handleFire = React.useCallback(() => {
    setHeadIndex((prev) => (prev + 1) % 3)
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [compareItemId, store, triggerLive])

  // Smooth 120fps Hover Fan-Out / Collapse
  React.useEffect(() => {
    if (!stackContainerRef.current) return
    const playbackState = store.getState().playbackState
    if (playbackState !== "idle") return

    const cards =
      stackContainerRef.current.querySelectorAll<HTMLDivElement>(
        "[data-toast-slot]"
      )
    if (cards.length < 3) return

    const cardH = cards[0]?.offsetHeight || 54
    const step = cardH + 6 // slim, consistent 6px gap between fanned cards
    const target = isHovered ? 1 : 0
    const initialProgress = fanProgressRef.current
    const startTime = performance.now()

    if (hoverRafRef.current !== null) {
      cancelAnimationFrame(hoverRafRef.current)
      hoverRafRef.current = null
    }

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, Math.max(0, elapsed / 280))
      // cubic ease-out
      const ease = 1 - Math.pow(1 - t, 3)
      const p = initialProgress + (target - initialProgress) * ease
      fanProgressRef.current = p

      for (let i = 0; i < 3; i++) {
        const card = cards[i]
        if (!card) continue
        const stackedY = -10 * i
        const fannedY = -step * i
        const y = stackedY + (fannedY - stackedY) * p

        const stackedScale = 1 - 0.06 * i
        const fannedScale = 1
        const scale = stackedScale + (fannedScale - stackedScale) * p

        const stackedOp = i === 0 ? 1 : i === 1 ? 0.84 : 0.6
        const fannedOp = 1
        const op = stackedOp + (fannedOp - stackedOp) * p

        card.style.transform = `translate3d(0px, ${y.toFixed(2)}px, 0px) scale(${scale.toFixed(4)})`
        card.style.opacity = op.toFixed(3)
      }

      if (t < 1) {
        hoverRafRef.current = requestAnimationFrame(tick)
      } else {
        hoverRafRef.current = null
      }
    }

    hoverRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current)
        hoverRafRef.current = null
      }
    }
  }, [isHovered, store])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex flex-col items-center gap-6">
          {/* 3-Card Stack Container - sits cleanly above button */}
          <div
            ref={stackContainerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative h-[88px] w-[288px]"
          >
            {/* Invisible Hover Bridge (Prevents Hover Drop Across 6px Gaps) */}
            <div
              aria-hidden="true"
              className={
                isHovered
                  ? "pointer-events-auto absolute right-0 bottom-0 left-0 z-0 h-[210px]"
                  : "pointer-events-none absolute inset-0 z-0"
              }
            />

            {[0, 1, 2].map((slot) => {
              const itemIndex = (headIndex - slot + 3) % 3
              const item = TOAST_ITEMS[itemIndex]
              return (
                <div
                  key={slot}
                  data-toast-slot={slot}
                  style={{
                    zIndex: slot === 0 ? 30 : slot === 1 ? 20 : 10,
                    transform:
                      slot === 0
                        ? "translate3d(0px, 0px, 0px) scale(1)"
                        : slot === 1
                          ? "translate3d(0px, -10px, 0px) scale(0.94)"
                          : "translate3d(0px, -20px, 0px) scale(0.88)",
                    opacity: slot === 0 ? 1 : slot === 1 ? 0.84 : 0.6,
                  }}
                  className="absolute bottom-0 left-0 flex w-full origin-bottom items-center justify-between rounded-[12px] bg-secondary px-3.5 py-2.5 will-change-transform"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-heading text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="font-sans text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Undo ${item.title}`}
                    className="rounded-[6px] bg-background px-2 py-1 font-heading text-[10px] font-medium text-foreground transition-opacity hover:opacity-90 active:scale-95"
                  >
                    Undo
                  </button>
                </div>
              )
            })}
          </div>

          {/* Trigger Button */}
          <button
            type="button"
            onClick={handleFire}
            aria-label="Send notification toast"
            className="inline-flex h-8.5 cursor-pointer items-center justify-center rounded-[10px] bg-foreground px-3.5 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
          >
            Send Toast
          </button>
        </div>
      </div>
    </div>
  )
}
