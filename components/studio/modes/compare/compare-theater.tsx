"use client"

import * as React from "react"
import { evaluateDuel, trackRegistry } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { CompareTile } from "./compare-tile"
import { CompareDock } from "./compare-dock"
import { cn } from "@/lib/utils"

export interface CompareTheaterProps {
  className?: string
}

export function CompareTheater({ className }: CompareTheaterProps) {
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const stageActiveCurveToCompare = useEaseStore(
    (s) => s.stageActiveCurveToCompare
  )
  const playScoped = useEaseStore((s) => s.playScoped)
  const interruptActive = useEaseStore((s) => s.interruptActive)
  const exitCompare = useEaseStore((s) => s.exitCompare)

  // Local keyboard shortcuts (Space, I, Esc)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (isInput) return

      if (e.key === "Escape") {
        e.preventDefault()
        exitCompare()
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault()
        playScoped()
      } else if ((e.key === "i" || e.key === "I") && !e.repeat) {
        e.preventDefault()
        interruptActive()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [playScoped, interruptActive, exitCompare])

  const visibleItems = React.useMemo(
    () => compareQueue.filter((i) => i.visible),
    [compareQueue]
  )

  const duelEvaluation = React.useMemo(() => {
    if (visibleItems.length === 0) return null

    const tilesForDuel = visibleItems.map((item) => {
      const trackId = item.overrideTrackId ?? globalCompareTarget.trackId
      const track = trackRegistry.get(trackId) ?? trackRegistry.list()[0]
      const channels = trackBindings[track.id] ?? track.channels
      const targetChannelId =
        item.overrideChannelId ?? globalCompareTarget.channelId

      let durationMs = 300
      if (targetChannelId === "all") {
        durationMs = Math.max(
          0,
          ...channels.map((ch) => ch.durationMs + ch.delayMs)
        )
      } else {
        const ch = channels.find((c) => c.id === targetChannelId)
        if (ch) durationMs = ch.durationMs + ch.delayMs
      }
      if (durationMs <= 0) durationMs = 300

      const springMode = channels[0]?.springMode ?? "fit"

      return {
        tileId: item.id,
        curve: item.curve,
        durationMs,
        springMode,
      }
    })

    return evaluateDuel(tilesForDuel)
  }, [visibleItems, globalCompareTarget, trackBindings])

  const fastestTileId = duelEvaluation?.fastestTileId

  const isMultiRow = visibleItems.length >= 4

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 rounded-[20px] bg-background p-2 select-none",
        className
      )}
    >
      {/* Dynamic Tile Grid */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {visibleItems.length === 0 ? (
          <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-heading text-sm font-medium text-foreground">
              No curves visible — stage or toggle curves in Compare Queue
            </p>
            <button
              type="button"
              onClick={stageActiveCurveToCompare}
              aria-label="Queue active curve to compare"
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-3 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
            >
              + Queue Current
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "grid h-full min-h-0 auto-cols-[minmax(320px,1fr)] grid-flow-col gap-2",
              isMultiRow ? "grid-rows-2" : "grid-rows-1"
            )}
          >
            {visibleItems.map((item) => (
              <CompareTile
                key={item.id}
                item={item}
                isFastest={
                  visibleItems.length >= 2 && item.id === fastestTileId
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Dock */}
      <CompareDock />
    </div>
  )
}
