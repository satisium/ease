"use client"

import * as React from "react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { evaluateDuel, trackRegistry, type DuelTileTelemetry } from "@/core"
import { cn } from "@/lib/utils"

export interface CompareTelemetrySlabProps {
  className?: string
}

export function CompareTelemetrySlab({ className }: CompareTelemetrySlabProps) {
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const applyCompareWinner = useEaseStore((s) => s.applyCompareWinner)

  const visibleItems = React.useMemo(
    () => compareQueue.filter((i) => i.visible),
    [compareQueue]
  )

  const evaluation = React.useMemo(() => {
    if (visibleItems.length < 2) return null

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

  const sortedTiles = React.useMemo<DuelTileTelemetry[]>(() => {
    if (!evaluation) return []
    return [...evaluation.tiles].sort((a, b) => a.rank - b.rank)
  }, [evaluation])

  return (
    <section
      aria-label="Duel Telemetry"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[20px] bg-background p-4 select-none",
        className
      )}
    >
      {/* 1. Header: Title + Spread Delta Badge */}
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-heading text-xs font-semibold text-foreground">
          Duel Telemetry
        </span>
        {evaluation && (
          <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground tabular-nums">
            Δ {evaluation.settleDeltaMs}ms spread
          </span>
        )}
      </div>

      {/* 2. Ranked Contender Cards OR Empty State */}
      {!evaluation || sortedTiles.length < 2 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Toggle 2+ staged curves below to compare arrival telemetry.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedTiles.map((tile) => {
            const isWinner = tile.rank === 1

            return (
              <div
                key={tile.tileId}
                className={cn(
                  "flex flex-col gap-2 rounded-[12px] p-3 transition-colors",
                  isWinner ? "bg-secondary" : "bg-muted"
                )}
              >
                {/* Top Row: Rank + Curve Name + Winner/Use Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="font-sans text-xs font-bold text-muted-foreground tabular-nums">
                      #{tile.rank}
                    </span>
                    <span className="truncate font-heading text-xs font-semibold text-foreground">
                      {tile.curve.name}
                    </span>
                  </div>

                  {isWinner ? (
                    <span className="rounded-[6px] bg-foreground px-1.5 py-0.5 font-sans text-[10px] font-medium text-background">
                      Fastest
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyCompareWinner(tile.tileId)}
                      aria-label={`Use ${tile.curve.name} as active winner`}
                      className="cursor-pointer rounded-[6px] bg-background px-2 py-0.5 font-sans text-[10px] font-medium text-foreground transition-colors hover:bg-foreground hover:text-background active:scale-95"
                    >
                      Use
                    </button>
                  )}
                </div>

                {/* 4-Stat Horizontal Row */}
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  <div className="flex flex-col">
                    <span className="font-sans text-[9px] text-muted-foreground uppercase">
                      t95
                    </span>
                    <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                      {Math.round(tile.telemetry.timeTo95Ms)}ms
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-sans text-[9px] text-muted-foreground uppercase">
                      Settle
                    </span>
                    <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                      {Math.round(tile.telemetry.settlingTimeMs)}ms
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-sans text-[9px] text-muted-foreground uppercase">
                      Peak
                    </span>
                    <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                      {tile.telemetry.peakVelocity.toFixed(1)}x
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-sans text-[9px] text-muted-foreground uppercase">
                      Over
                    </span>
                    <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                      {tile.telemetry.overshootPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
