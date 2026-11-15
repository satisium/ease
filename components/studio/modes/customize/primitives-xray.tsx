"use client"

/**
 * @file components/studio/modes/customize/primitives-xray.tsx
 * @description 4-property CSS primitive inspection matrix (Position, Scale, Opacity, Rotate).
 *
 * Invariants:
 * - Powered by useTransitionTrack("primitives:all") with 120fps imperative style application.
 * - Zero competing transition-* CSS classes on bound kinetic nodes.
 * - Satisium Design Language: 0 borders, 0 shadows, 0 opacity modifiers, squircle geometry.
 * - Balanced layout: Top Position track + Bottom 3-column stage (Scale, Opacity, Rotate) with 48px squircles.
 */

import * as React from "react"
import { useTransitionTrack } from "@/hooks/use-transition-track"
import { cn } from "@/lib/utils"

export type PrimitiveFilter =
  "all" | "position" | "scale" | "opacity" | "rotate"

export interface PrimitivesXRayProps {
  className?: string
  filter?: PrimitiveFilter
  onFilterChange?: (filter: PrimitiveFilter) => void
  showFilterBar?: boolean
}

export function PrimitivesXRay({
  className,
  filter: propFilter,
  onFilterChange,
  showFilterBar = true,
}: PrimitivesXRayProps) {
  const [internalFilter, setInternalFilter] =
    React.useState<PrimitiveFilter>("all")
  const activeFilter = propFilter ?? internalFilter

  const handleSetFilter = (f: PrimitiveFilter) => {
    if (onFilterChange) {
      onFilterChange(f)
    } else {
      setInternalFilter(f)
    }
  }

  const { bindRef } = useTransitionTrack("primitives:all")

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col select-none",
        className
      )}
    >
      {/* Filter Bar (Optional if rendered in parent header) */}
      {showFilterBar && (
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
          <div className="flex min-h-0 flex-[1] flex-col justify-between overflow-hidden rounded-[12px] bg-background p-3.5">
            <span className="font-heading text-xs font-medium text-muted-foreground">
              Position
            </span>

            {/* Kinetic Runway */}
            <div className="relative my-auto flex w-full items-center px-2">
              <div className="flex h-20 w-full items-center justify-between rounded-[10px] bg-muted px-2">
                {/* Left/Right Ghost Anchor Pads */}
                <div className="size-16 shrink-0 rounded-[12px] bg-secondary" />
                <div className="size-16 shrink-0 rounded-[12px] bg-secondary" />

                {/* Runway Motion Wrapper */}
                <div className="absolute inset-x-4 flex items-center">
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
          </div>

          {/* Bottom 3-Column Stage: Scale, Opacity, Rotate */}
          <div className="grid min-h-0 flex-[2] grid-cols-3 gap-2">
            {/* Scale Card */}
            <div className="relative flex flex-col overflow-hidden rounded-[12px] bg-background p-3">
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Scale
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="absolute size-16 rounded-[12px] bg-muted" />
                <div
                  ref={bindRef("scale")}
                  data-testid="primitive-scale-node"
                  className="relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground will-change-transform"
                >
                  <div className="size-2 rounded-full bg-background" />
                </div>
              </div>
            </div>

            {/* Opacity Card */}
            <div className="relative flex flex-col overflow-hidden rounded-[12px] bg-background p-3">
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Opacity
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="absolute size-16 rounded-[12px] bg-muted" />
                <div
                  ref={bindRef("opacity")}
                  data-testid="primitive-opacity-node"
                  className="will-change-opacity relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground"
                >
                  <div className="size-2 rounded-full bg-background" />
                </div>
              </div>
            </div>

            {/* Rotate Card */}
            <div className="relative flex flex-col overflow-hidden rounded-[12px] bg-background p-3">
              <span className="font-heading text-xs font-medium text-muted-foreground">
                Rotate
              </span>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="absolute size-16 rounded-[12px] bg-muted" />
                <div
                  ref={bindRef("rotate")}
                  data-testid="primitive-rotate-node"
                  className="relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground will-change-transform"
                >
                  <div className="size-2 rounded-full bg-background" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeFilter === "position" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[12px] bg-background p-4">
          <span className="font-heading text-sm font-semibold text-foreground">
            Position
          </span>

          <div className="relative flex h-16 w-full items-center justify-between rounded-[10px] bg-muted px-2">
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
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-[12px] bg-background p-4">
          <span className="font-heading text-sm font-semibold text-foreground">
            Scale
          </span>
          <div className="relative flex size-32 items-center justify-center rounded-[16px] bg-muted">
            <div className="absolute size-16 rounded-[12px] bg-secondary" />
            <div
              ref={bindRef("scale")}
              data-testid="primitive-scale-node"
              className="relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground will-change-transform"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      ) : activeFilter === "opacity" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-[12px] bg-background p-4">
          <span className="font-heading text-sm font-semibold text-foreground">
            Opacity
          </span>
          <div className="relative flex size-32 items-center justify-center rounded-[16px] bg-muted">
            <div className="absolute size-16 rounded-[12px] bg-secondary" />
            <div
              ref={bindRef("opacity")}
              data-testid="primitive-opacity-node"
              className="will-change-opacity relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-[12px] bg-background p-4">
          <span className="font-heading text-sm font-semibold text-foreground">
            Rotate
          </span>
          <div className="relative flex size-32 items-center justify-center rounded-[16px] bg-muted">
            <div className="absolute size-16 rounded-[12px] bg-secondary" />
            <div
              ref={bindRef("rotate")}
              data-testid="primitive-rotate-node"
              className="relative z-10 flex size-16 items-center justify-center rounded-[12px] bg-foreground will-change-transform"
            >
              <div className="size-2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
