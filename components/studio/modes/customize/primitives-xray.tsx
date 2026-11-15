"use client"

/**
 * @file components/studio/modes/customize/primitives-xray.tsx
 * @description 4-property CSS primitive inspection matrix (Position, Scale, Opacity, Rotate).
 *
 * Invariants:
 * - Powered by useTransitionTrack("primitives:all") with 120fps imperative style application.
 * - Zero competing transition-* CSS classes on bound kinetic nodes.
 * - Satisium Design Language: 0 borders, 0 shadows, 0 opacity modifiers, squircle geometry.
 * - Balanced layout: Top Position track + Bottom 3-column stage (Scale, Opacity, Rotate).
 * - Multi-mode adaptability: Compact 40px squircle layout in Compare tiles; spacious 64px layout in Customize mode.
 */

import * as React from "react"
import { useTransitionTrack } from "@/hooks/use-transition-track"
import { cn } from "@/lib/utils"

export type PrimitiveFilter =
  "all" | "position" | "scale" | "opacity" | "rotate"

export interface PrimitivesXRayProps {
  className?: string
  filter?: PrimitiveFilter
  controlledFilter?: PrimitiveFilter
  onFilterChange?: (filter: PrimitiveFilter) => void
  showFilterBar?: boolean
  compareItemId?: string
}

export function PrimitivesXRay({
  className,
  filter: propFilter,
  controlledFilter,
  onFilterChange,
  showFilterBar = true,
  compareItemId,
}: PrimitivesXRayProps) {
  const [internalFilter, setInternalFilter] =
    React.useState<PrimitiveFilter>("all")
  const isCompare = Boolean(compareItemId)
  const activeFilter = controlledFilter ?? propFilter ?? internalFilter
  const shouldShowFilterBar = showFilterBar && !isCompare

  const handleSetFilter = (f: PrimitiveFilter) => {
    if (onFilterChange) {
      onFilterChange(f)
    } else {
      setInternalFilter(f)
    }
  }

  const { bindRef } = useTransitionTrack("primitives:all", { compareItemId })

  const cardBg = isCompare ? "bg-muted" : "bg-background"
  const runwayTrackBg = isCompare ? "bg-background" : "bg-muted"
  const ghostBoxBg = isCompare ? "bg-secondary" : "bg-muted"

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col select-none",
        isCompare ? "p-2" : "",
        className
      )}
    >
      {/* Filter Bar (Hidden in Compare Mode, controlled via CompareDock/CompareTile) */}
      {shouldShowFilterBar && (
        <div className="z-10 mb-2 flex items-center justify-between">
          <div className="flex items-center rounded-[10px] bg-background p-0.5">
            {(["all", "position", "scale", "opacity", "rotate"] as const).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-label={`Filter ${filter} primitive`}
                  onClick={() => handleSetFilter(filter)}
                  className={cn(
                    "h-6 cursor-pointer rounded-[8px] px-2 font-sans text-[11px] font-medium capitalize transition-colors",
                    activeFilter === filter
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 4-Panel Grid: Top Position Track + Bottom 3-Column Stage */}
      {activeFilter === "all" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {/* Top Card: Position Track */}
          <div
            className={cn(
              "flex min-h-0 flex-[1] flex-col justify-between overflow-hidden rounded-[12px]",
              cardBg,
              isCompare ? "p-2.5" : "p-3.5"
            )}
          >
            <span className="font-heading text-xs font-medium text-muted-foreground">
              Position
            </span>

            {/* Kinetic Runway */}
            <div className="my-auto flex w-full items-center">
              <div
                className={cn(
                  "relative flex w-full items-center justify-between rounded-[10px] px-2",
                  runwayTrackBg,
                  isCompare ? "h-18" : "h-20"
                )}
              >
                {/* Left/Right Ghost Anchor Pads */}
                <div
                  className={cn(
                    "shrink-0 rounded-[12px] bg-secondary",
                    isCompare ? "size-14" : "size-16"
                  )}
                />
                <div
                  className={cn(
                    "shrink-0 rounded-[12px] bg-secondary",
                    isCompare ? "size-14" : "size-16"
                  )}
                />

                {/* Runway Motion Wrapper */}
                <div className="absolute inset-x-2 flex items-center">
                  <div className="relative flex w-full items-center">
                    <div
                      ref={bindRef("position")}
                      data-testid="primitive-position-wrapper"
                      className={cn(
                        "will-change-transform",
                        isCompare
                          ? "w-[calc(100%-56px)]"
                          : "w-[calc(100%-64px)]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-[12px] bg-foreground",
                          isCompare ? "size-14" : "size-16"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-full bg-background",
                            isCompare ? "size-1.5" : "size-2"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3-Column Stage: Scale, Opacity, Rotate */}
          <div className="grid min-h-0 flex-[2] grid-cols-3 gap-2">
            {/* Scale Card */}
            <div
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-[12px]",
                cardBg,
                isCompare ? "p-2.5" : "p-3"
              )}
            >
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Scale
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div
                  className={cn(
                    "absolute rounded-[12px]",
                    ghostBoxBg,
                    isCompare ? "size-14" : "size-16"
                  )}
                />
                <div
                  ref={bindRef("scale")}
                  data-testid="primitive-scale-node"
                  className={cn(
                    "relative z-10 flex items-center justify-center rounded-[12px] bg-foreground will-change-transform",
                    isCompare ? "size-14" : "size-16"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-full bg-background",
                      isCompare ? "size-1.5" : "size-2"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Opacity Card */}
            <div
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-[12px]",
                cardBg,
                isCompare ? "p-2.5" : "p-3"
              )}
            >
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Opacity
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div
                  className={cn(
                    "absolute rounded-[12px]",
                    ghostBoxBg,
                    isCompare ? "size-14" : "size-16"
                  )}
                />
                <div
                  ref={bindRef("opacity")}
                  data-testid="primitive-opacity-node"
                  className={cn(
                    "will-change-opacity relative z-10 flex items-center justify-center rounded-[12px] bg-foreground",
                    isCompare ? "size-14" : "size-16"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-full bg-background",
                      isCompare ? "size-1.5" : "size-2"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Rotate Card */}
            <div
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-[12px]",
                cardBg,
                isCompare ? "p-2.5" : "p-3"
              )}
            >
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Rotate
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div
                  className={cn(
                    "absolute rounded-[12px]",
                    ghostBoxBg,
                    isCompare ? "size-14" : "size-16"
                  )}
                />
                <div
                  ref={bindRef("rotate")}
                  data-testid="primitive-rotate-node"
                  className={cn(
                    "relative z-10 flex items-center justify-center rounded-[12px] bg-foreground will-change-transform",
                    isCompare ? "size-14" : "size-16"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-full bg-background",
                      isCompare ? "size-1.5" : "size-2"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeFilter === "position" ? (
        <div
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[12px] p-4",
            cardBg
          )}
        >
          <span className="font-heading text-xs font-medium text-muted-foreground">
            Position
          </span>

          <div
            className={cn(
              "relative flex h-20 w-full items-center justify-between rounded-[10px] px-2",
              runwayTrackBg
            )}
          >
            <div className="size-16 shrink-0 rounded-[12px] bg-secondary" />
            <div className="size-16 shrink-0 rounded-[12px] bg-secondary" />
            <div className="absolute inset-x-2 flex items-center">
              <div className="relative flex w-full items-center">
                <div
                  ref={bindRef("position")}
                  data-testid="primitive-position-wrapper"
                  className="w-[calc(100%-64px)] will-change-transform"
                >
                  <div className="flex size-16 items-center justify-center rounded-[12px] bg-foreground">
                    <div className="size-2 rounded-full bg-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeFilter === "scale" ? (
        <div
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[12px] p-4",
            cardBg
          )}
        >
          <span className="font-heading text-xs font-medium text-muted-foreground">
            Scale
          </span>
          <div className="relative flex flex-1 items-center justify-center">
            <div
              className={cn("absolute size-20 rounded-[16px]", ghostBoxBg)}
            />
            <div
              ref={bindRef("scale")}
              data-testid="primitive-scale-node"
              className="relative z-10 flex size-20 items-center justify-center rounded-[16px] bg-foreground will-change-transform"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      ) : activeFilter === "opacity" ? (
        <div
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[12px] p-4",
            cardBg
          )}
        >
          <span className="font-heading text-xs font-medium text-muted-foreground">
            Opacity
          </span>
          <div className="relative flex flex-1 items-center justify-center">
            <div
              className={cn("absolute size-20 rounded-[16px]", ghostBoxBg)}
            />
            <div
              ref={bindRef("opacity")}
              data-testid="primitive-opacity-node"
              className="will-change-opacity relative z-10 flex size-20 items-center justify-center rounded-[16px] bg-foreground"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[12px] p-4",
            cardBg
          )}
        >
          <span className="font-heading text-xs font-medium text-muted-foreground">
            Rotate
          </span>
          <div className="relative flex flex-1 items-center justify-center">
            <div
              className={cn("absolute size-20 rounded-[16px]", ghostBoxBg)}
            />
            <div
              ref={bindRef("rotate")}
              data-testid="primitive-rotate-node"
              className="relative z-10 flex size-20 items-center justify-center rounded-[16px] bg-foreground will-change-transform"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
