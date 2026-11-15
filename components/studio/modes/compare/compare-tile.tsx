"use client"

import * as React from "react"
import {
  computeCurveTelemetry,
  trackRegistry,
  listComponents,
  type CompareItem,
} from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

export interface CompareTileProps {
  item: CompareItem
  isFastest?: boolean
}

export function CompareTile({ item, isFastest = false }: CompareTileProps) {
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const setCompareTileOverride = useEaseStore((s) => s.setCompareTileOverride)
  const applyCompareWinner = useEaseStore((s) => s.applyCompareWinner)

  const [isOverrideOpen, setIsOverrideOpen] = React.useState(false)
  const overrideMenuRef = React.useRef<HTMLDivElement>(null)

  // Dismiss override popover on click outside or Escape
  React.useEffect(() => {
    if (!isOverrideOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (
        overrideMenuRef.current &&
        !overrideMenuRef.current.contains(e.target as Node)
      ) {
        setIsOverrideOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOverrideOpen(false)
      }
    }
    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOverrideOpen])

  // Resolve effective track & channel for metrics & stage
  const effectiveTrackId = item.overrideTrackId ?? globalCompareTarget.trackId
  const track = trackRegistry.get(effectiveTrackId) ?? trackRegistry.list()[0]
  const channels = trackBindings[effectiveTrackId] ?? track.channels
  const targetChannelId =
    item.overrideChannelId ?? globalCompareTarget.channelId

  // Calculate live t95 telemetry
  const durationMs = React.useMemo(() => {
    if (targetChannelId === "all") {
      const d = Math.max(0, ...channels.map((ch) => ch.durationMs + ch.delayMs))
      return d > 0 ? d : 300
    }
    const ch = channels.find((c) => c.id === targetChannelId)
    return ch ? ch.durationMs + ch.delayMs : 300
  }, [channels, targetChannelId])

  const springMode =
    effectiveTrackId === "primitives:all"
      ? "natural"
      : (channels[0]?.springMode ?? "fit")
  const telemetry = React.useMemo(() => {
    return computeCurveTelemetry(item.curve, durationMs, springMode)
  }, [item.curve, durationMs, springMode])

  const t95 = Math.round(telemetry.timeTo95Ms)

  const isOverridden = Boolean(item.overrideTrackId || item.overrideChannelId)
  const overrideLabel = isOverridden
    ? (track.componentLabel ?? track.phaseLabel ?? track.id)
    : "Sync"

  const components = React.useMemo(
    () => listComponents({ includePrimitives: true }),
    []
  )

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-[16px] bg-muted p-2.5 select-none">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
        {/* Left: Curve name, t95 arrival pill, Fastest pill */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-heading text-xs font-semibold text-foreground">
            {item.curve.name}
          </span>
          <span className="rounded-[6px] bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {t95}ms
          </span>
          {isFastest && (
            <span className="rounded-[6px] bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
              Fastest
            </span>
          )}
        </div>

        {/* Right: Override popover + Use winner button */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Override Selector */}
          <div className="relative" ref={overrideMenuRef}>
            <button
              type="button"
              onClick={() => setIsOverrideOpen((v) => !v)}
              aria-label={`Override target for ${item.curve.name}`}
              aria-expanded={isOverrideOpen}
              className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-[6px] bg-background px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              <span>{overrideLabel}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-2.5 transition-transform",
                  isOverrideOpen && "rotate-180"
                )}
              />
            </button>

            {isOverrideOpen && (
              <div className="absolute top-full right-0 z-50 mt-1 flex w-44 flex-col gap-0.5 rounded-[12px] bg-card p-1">
                <button
                  type="button"
                  onClick={() => {
                    setCompareTileOverride(item.id, null)
                    setIsOverrideOpen(false)
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1 text-left font-sans text-xs transition-colors",
                    !isOverridden
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label="Sync with global target"
                >
                  <span>Sync (Global)</span>
                </button>

                <div className="my-0.5 h-px bg-muted" />

                <span className="px-2 py-0.5 font-sans text-[10px] text-muted-foreground uppercase">
                  Override Target
                </span>

                {components.map((comp) => {
                  const firstTrack = comp.tracks[0]
                  const isSelected = item.overrideTrackId === firstTrack?.id
                  return (
                    <button
                      key={comp.componentId}
                      type="button"
                      onClick={() => {
                        if (firstTrack) {
                          setCompareTileOverride(item.id, {
                            trackId: firstTrack.id,
                            channelId: "all",
                          })
                        }
                        setIsOverrideOpen(false)
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1 text-left font-sans text-xs transition-colors",
                        isSelected
                          ? "bg-secondary font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      aria-label={`Override to ${comp.componentLabel}`}
                    >
                      <span>{comp.componentLabel}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Use Winner Button */}
          <button
            type="button"
            onClick={() => applyCompareWinner(item.id)}
            aria-label="Use curve as active winner"
            className="inline-flex h-6 cursor-pointer items-center justify-center rounded-[6px] bg-secondary px-2 font-heading text-[10px] font-medium text-foreground transition-colors hover:bg-foreground hover:text-background active:scale-95"
          >
            Use
          </button>
        </div>
      </div>

      {/* Contained Stage Card */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[12px] bg-background contain-paint">
        <HabitatStage compareItemId={item.id} />
      </div>
    </div>
  )
}
