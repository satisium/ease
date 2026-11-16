"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Cancel01Icon,
  ArrowRight01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useEaseStore } from "@/hooks/use-ease-store"
import { SATISIUM_CARD_POP_VARIANTS, SATISIUM_PRESS_CLASS } from "@/lib/motion"
import { AnimatedNumber } from "@/components/ui/animated-number"

export function CompareQueueSlab({ className }: { className?: string }) {
  const mode = useEaseStore((s) => s.mode)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const activeCurve = useEaseStore((s) => s.getActiveCurve())
  const stageActiveCurveToCompare = useEaseStore(
    (s) => s.stageActiveCurveToCompare
  )
  const removeCompareItem = useEaseStore((s) => s.removeCompareItem)
  const toggleCompareItemVisibility = useEaseStore(
    (s) => s.toggleCompareItemVisibility
  )
  const enterCompare = useEaseStore((s) => s.enterCompare)
  const exitCompare = useEaseStore((s) => s.exitCompare)

  const visibleCount = compareQueue.filter((item) => item.visible).length

  const isCurrentCurveQueued = compareQueue.some(
    (item) => item.curve.id === activeCurve?.id
  )

  const listRef = React.useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = React.useState<{
    canScrollUp: boolean
    canScrollDown: boolean
  }>({
    canScrollUp: false,
    canScrollDown: false,
  })

  const updateScrollState = React.useCallback(() => {
    const el = listRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    const hasOverflow = maxScroll > 2

    setScrollState({
      canScrollUp: hasOverflow && scrollTop > 2,
      canScrollDown: hasOverflow && scrollTop < maxScroll - 2,
    })
  }, [])

  React.useEffect(() => {
    updateScrollState()
  }, [compareQueue, updateScrollState])

  React.useEffect(() => {
    const el = listRef.current
    if (!el) return

    updateScrollState()

    if (typeof ResizeObserver === "undefined") return

    const ro = new ResizeObserver(() => {
      updateScrollState()
    })
    ro.observe(el)

    return () => ro.disconnect()
  }, [updateScrollState])

  const maskStyle = React.useMemo<React.CSSProperties>(() => {
    const { canScrollUp, canScrollDown } = scrollState
    if (!canScrollUp && !canScrollDown) {
      return {}
    }

    const fadeSize = "14px"

    let mask = ""
    if (canScrollUp && canScrollDown) {
      mask = `linear-gradient(to bottom, transparent 0px, black ${fadeSize}, black calc(100% - ${fadeSize}), transparent 100%)`
    } else if (canScrollUp) {
      mask = `linear-gradient(to bottom, transparent 0px, black ${fadeSize}, black 100%)`
    } else if (canScrollDown) {
      mask = `linear-gradient(to bottom, black 0%, black calc(100% - ${fadeSize}), transparent 100%)`
    }

    return {
      WebkitMaskImage: mask,
      maskImage: mask,
    }
  }, [scrollState])

  const handleClearAll = React.useCallback(() => {
    for (const item of compareQueue) {
      removeCompareItem(item.id)
    }
  }, [compareQueue, removeCompareItem])

  return (
    <section
      aria-label="Compare Queue"
      className={cn(
        "flex h-[200px] shrink-0 flex-col rounded-[20px] bg-background p-4 transition-colors select-none",
        className
      )}
    >
      {/* Header: Title + Staged Counter + Active Counter (Compare Mode) + Clear all */}
      <div className="flex shrink-0 items-center justify-between pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-xs font-semibold text-foreground">
            Compare Queue
          </span>
          <span className="rounded-[5px] bg-secondary px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
            <AnimatedNumber value={compareQueue.length} suffix=" Staged" />
          </span>
          {mode === "compare" && (
            <span className="rounded-[5px] bg-foreground px-1.5 py-0.5 font-sans text-[10px] font-medium text-background">
              <AnimatedNumber value={visibleCount} suffix=" Active" />
            </span>
          )}
        </div>

        {compareQueue.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            aria-label="Clear all queued curves"
            className="cursor-pointer font-sans text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Curves List: Dynamic scroll fade via CSS mask-image */}
      <div
        ref={listRef}
        onScroll={updateScrollState}
        style={maskStyle}
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5"
      >
        {compareQueue.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="font-sans text-xs text-muted-foreground">
              Queue is empty
            </span>
            <span className="mt-1 font-sans text-[11px] text-muted-foreground">
              Press{" "}
              <kbd className="rounded bg-secondary px-1 py-0.5 font-sans text-[10px] text-foreground">
                C
              </kbd>{" "}
              to stage current curve
            </span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {compareQueue.map((item) => {
              const isCurrent = item.curve.id === activeCurve?.id

              return (
                <motion.div
                  layout
                  variants={SATISIUM_CARD_POP_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  key={item.id}
                  className={cn(
                    "flex h-6 shrink-0 items-center justify-between px-1",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="truncate font-sans text-xs">
                    {item.curve.name}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleCompareItemVisibility(item.id)}
                      aria-label={
                        item.visible
                          ? `Hide ${item.curve.name} in duel`
                          : `Show ${item.curve.name} in duel`
                      }
                      className={cn(
                        "flex size-4 cursor-pointer items-center justify-center transition-colors hover:text-foreground",
                        SATISIUM_PRESS_CLASS,
                        item.visible
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <HugeiconsIcon
                        icon={item.visible ? ViewIcon : ViewOffSlashIcon}
                        className="size-3"
                      />
                    </button>

                    {/* Remove Item */}
                    <button
                      type="button"
                      onClick={() => removeCompareItem(item.id)}
                      aria-label={`Remove ${item.curve.name} from queue`}
                      className={cn(
                        "flex size-4 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
                        SATISIUM_PRESS_CLASS
                      )}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Action Row: Queue Current + Duel/Exit Duel Button */}
      <div className="mt-auto flex shrink-0 items-center gap-2 pt-2">
        <button
          type="button"
          onClick={stageActiveCurveToCompare}
          aria-label={
            isCurrentCurveQueued
              ? "Current curve already queued"
              : "Queue current curve for comparison"
          }
          className={cn(
            "inline-flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted",
            SATISIUM_PRESS_CLASS
          )}
        >
          <span>
            {isCurrentCurveQueued ? "Queued (C)" : "+ Queue Current (C)"}
          </span>
        </button>

        {mode === "compare" ? (
          <button
            type="button"
            onClick={exitCompare}
            aria-label="Exit compare duel mode"
            className={cn(
              "inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted",
              SATISIUM_PRESS_CLASS
            )}
          >
            <span>Exit Duel</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={compareQueue.length < 2}
            onClick={enterCompare}
            aria-label="Enter compare duel mode"
            className={cn(
              "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-3.5 font-heading text-xs font-medium transition-colors",
              SATISIUM_PRESS_CLASS,
              compareQueue.length >= 2
                ? "bg-foreground text-background hover:opacity-90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            <span>Duel</span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
          </button>
        )}
      </div>
    </section>
  )
}
