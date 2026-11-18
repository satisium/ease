"use client"

import * as React from "react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface AccordionHabitatProps {
  compareItemId?: string
}

const FAQ_ITEMS = [
  {
    question: "Why use springs over Bézier?",
    answer:
      "Springs preserve velocity when interrupted mid-flight, making gestures feel continuous.",
  },
  {
    question: "When does Duration Integrity apply?",
    answer:
      "Swapping curves on real UI keeps your choreographed timings locked in place.",
  },
  {
    question: "Why animate only transform & opacity?",
    answer:
      "GPU compositor properties avoid layout reflow and stay locked at 120fps.",
  },
] as const

const ANSWER_H = 56

export function AccordionHabitat({
  compareItemId,
}: AccordionHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const targetIdxRef = React.useRef<number>(0)
  const prevIdxRef = React.useRef<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      if (!containerRef.current) return
      const rows = containerRef.current.querySelectorAll<HTMLDivElement>(
        "[data-accordion-row]"
      )
      const cardBgs =
        containerRef.current.querySelectorAll<HTMLDivElement>("[data-card-bg]")
      const icons =
        containerRef.current.querySelectorAll<HTMLSpanElement>("[data-icon]")
      const answers =
        containerRef.current.querySelectorAll<HTMLDivElement>("[data-answer]")

      if (rows.length < 3) return

      const p = Math.min(1, Math.max(0, frame.values.reveal ?? 0))
      const op = Math.min(1, Math.max(0, frame.values.contentOpacity ?? 0))
      const target = targetIdxRef.current
      const isScrub =
        store.getState().playbackState === "scrubbing" ||
        (
          store as unknown as {
            conductor?: { getSnapshot: () => { interactionMode?: string } }
          }
        ).conductor?.getSnapshot().interactionMode === "scrub"
      const prev = compareItemId || isScrub ? null : prevIdxRef.current

      const amounts = [0, 0, 0]
      const opacities = [0, 0, 0]

      for (let i = 0; i < 3; i++) {
        if (i === target) {
          amounts[i] = p
          opacities[i] = op
        } else if (prev !== null && i === prev) {
          amounts[i] = 1 - p
          opacities[i] = Math.max(0, 1 - p * 1.8)
        } else {
          amounts[i] = 0
          opacities[i] = 0
        }
      }

      for (let i = 0; i < 3; i++) {
        let shiftY = 0
        for (let j = 0; j < i; j++) {
          shiftY += amounts[j] * ANSWER_H
        }

        const row = rows[i]
        if (row) {
          row.style.transform = `translate3d(0px, ${shiftY.toFixed(2)}px, 0px)`
        }

        const cardBg = cardBgs[i]
        if (cardBg) {
          const bottomClip = (1 - amounts[i]) * ANSWER_H
          cardBg.style.clipPath = `inset(0px 0px ${bottomClip.toFixed(2)}px 0px round 11px)`
        }

        const icon = icons[i]
        if (icon) {
          icon.style.transform = `rotate(${(amounts[i] * 45).toFixed(1)}deg)`
        }

        const answer = answers[i]
        if (answer) {
          answer.style.opacity = opacities[i].toFixed(3)
          answer.style.transform = `translate3d(0px, ${((1 - amounts[i]) * -4).toFixed(2)}px, 0px)`
          answer.style.pointerEvents = opacities[i] > 0.1 ? "auto" : "none"
        }
      }
    },
    [compareItemId, store]
  )

  const { isOpen, open, close } = usePairedHabitat({
    enterTrackId: "accordion:open",
    exitTrackId: "accordion:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const handleToggleRow = React.useCallback(
    (idx: number) => {
      if (isOpen && activeIndex === idx) {
        prevIdxRef.current = null
        targetIdxRef.current = idx
        setActiveIndex(null)
        close()
      } else {
        prevIdxRef.current = isOpen && activeIndex !== null ? activeIndex : null
        targetIdxRef.current = idx
        setActiveIndex(idx)
        open()
      }
    },
    [isOpen, activeIndex, open, close]
  )

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div
          ref={containerRef}
          className="relative h-[188px] w-full max-w-[336px]"
        >
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={item.question}
              data-accordion-row={i}
              style={{ top: i * 46 }}
              className="absolute right-0 left-0 h-[96px] will-change-transform"
            >
              <div
                data-card-bg={i}
                style={{
                  clipPath: `inset(0px 0px ${ANSWER_H}px 0px round 11px)`,
                }}
                className="absolute inset-0 rounded-[11px] bg-secondary will-change-[clip-path]"
              />

              <button
                type="button"
                onClick={() => handleToggleRow(i)}
                aria-expanded={isOpen && activeIndex === i}
                aria-label={item.question}
                className="relative z-10 flex h-10 w-full cursor-pointer items-center justify-between gap-3 px-3.5 text-left"
              >
                <span className="font-heading text-xs font-medium text-foreground">
                  {item.question}
                </span>
                <span
                  data-icon={i}
                  className="flex size-4 shrink-0 items-center justify-center text-muted-foreground will-change-transform"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                </span>
              </button>

              <div
                data-answer={i}
                style={{
                  opacity: 0,
                  transform: "translate3d(0px, -4px, 0px)",
                  pointerEvents: "none",
                }}
                className="relative z-10 px-3.5 pt-0 pb-3 font-sans text-[11px] leading-relaxed text-muted-foreground will-change-transform"
              >
                {item.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
