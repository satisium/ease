"use client"

/**
 * @file components/studio/modes/customize/customize-telemetry-slab.tsx
 * @description Real-time physical metrics, git diff telemetry, and use-case tags for Customize Mode.
 *
 * Invariants:
 * - Direct card-in-card matching ArchetypeAdvisorSlab outer footprint.
 * - Dynamic analytical telemetry: t95, ts, peak velocity, overshoot, damping ratio, natural frequency.
 * - 100% Duration parity with TimelineConsole via effectiveChannel resolution on primitives:all.
 * - Live Git diff telemetry vs. baseline parent curve with human-readable summary bullets.
 * - Strict Satisium Design Language: 0 borders, 0 shadows, 0 opacity modifiers, stepped background surfaces.
 */

import * as React from "react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { computeCurveTelemetry, computeCurveDiff, type EaseCurve } from "@/core"
import { cn } from "@/lib/utils"

export interface CustomizeTelemetrySlabProps {
  className?: string
}

export function CustomizeTelemetrySlab({
  className,
}: CustomizeTelemetrySlabProps) {
  const draftCurve = useEaseStore((s) => s.draftCurve)
  const getActiveCurve = useEaseStore((s) => s.getActiveCurve)
  const getFocusedChannel = useEaseStore((s) => s.getFocusedChannel)
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const trackBindings = useEaseStore((s) => s.trackBindings)

  const workingCurve: EaseCurve = draftCurve?.workingCurve ?? getActiveCurve()
  const parentCurve: EaseCurve = draftCurve?.parentCurve ?? workingCurve

  // Resolve effectiveChannel with 100% parity across primitives:all and component tracks
  const effectiveChannel =
    focusedTrackId === "primitives:all"
      ? (trackBindings["primitives:all"]?.[0] ?? getFocusedChannel())
      : getFocusedChannel()

  const durationMs =
    effectiveChannel?.durationMs ?? workingCurve.suggestedDurationMs
  const springMode = effectiveChannel?.springMode ?? "fit"

  const telemetry = React.useMemo(() => {
    return computeCurveTelemetry(workingCurve, durationMs, springMode)
  }, [workingCurve, durationMs, springMode])

  const diff = React.useMemo(() => {
    return computeCurveDiff(workingCurve, parentCurve, durationMs, springMode)
  }, [workingCurve, parentCurve, durationMs, springMode])

  const useCases = React.useMemo(() => {
    const isDynamic =
      Boolean(draftCurve?.isDirty) || workingCurve.engine !== parentCurve.engine

    if (
      !isDynamic &&
      workingCurve.useCases &&
      workingCurve.useCases.length > 0
    ) {
      return workingCurve.useCases
    }

    switch (telemetry.classification) {
      case "Underdamped":
        return ["Toasts & Alerts", "Tactile Pops", "Floating Cards"]
      case "Critically Damped":
        return ["Drawers", "Dialogs", "Layout Shifts"]
      case "Overdamped":
        return ["Ambient Animations", "Background Fades", "Subtle Reveals"]
      case "Decelerating":
        return ["Entrances", "Modals", "Sheets"]
      case "Accelerating":
        return ["Exits", "Dismissals"]
      case "S-Curve":
        return ["Tabs", "Carousels", "Morphs"]
      case "Linear":
        return ["Progress Bars", "Spinners", "Fades"]
      default:
        return ["Spatial UI", "Layout Shifts", "Interactive Widgets"]
    }
  }, [
    draftCurve?.isDirty,
    workingCurve.engine,
    workingCurve.useCases,
    parentCurve.engine,
    telemetry.classification,
  ])

  return (
    <section
      aria-label="Curve Telemetry"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[20px] bg-background p-4 select-none",
        className
      )}
    >
      {/* 1. Header: Title + Classification Badge */}
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-heading text-xs font-semibold text-foreground">
          Curve Telemetry
        </span>
        <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
          {telemetry.classification}
        </span>
      </div>

      {/* 2. Physics Metrics: 2 Hero Stats + Crisp Horizontal Key-Value Rows */}
      <div className="flex flex-col gap-3">
        {/* 2 Hero Stats */}
        <div className="grid grid-cols-2 divide-x divide-muted rounded-[12px] bg-secondary p-3">
          <div className="flex flex-col pr-3">
            <span className="font-sans text-[10px] text-muted-foreground">
              t95 Arrival
            </span>
            <span className="font-sans text-base font-semibold text-foreground tabular-nums">
              {Math.round(telemetry.timeTo95Ms)}ms
            </span>
          </div>
          <div className="flex flex-col pl-3">
            <span className="font-sans text-[10px] text-muted-foreground">
              Settle (ts)
            </span>
            <span className="font-sans text-base font-semibold text-foreground tabular-nums">
              {Math.round(telemetry.settlingTimeMs)}ms
            </span>
          </div>
        </div>

        {/* Crisp Horizontal Key-Value Rows */}
        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-muted-foreground">
              Peak Velocity
            </span>
            <span className="font-sans text-xs font-medium text-foreground tabular-nums">
              {telemetry.peakVelocity.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-muted-foreground">
              Overshoot
            </span>
            <span className="font-sans text-xs font-medium text-foreground tabular-nums">
              {telemetry.overshootPercent.toFixed(1)}%
            </span>
          </div>

          {workingCurve.engine === "spring" && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-muted-foreground">
                  Damping (ζ)
                </span>
                <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                  {telemetry.dampingRatio !== null
                    ? telemetry.dampingRatio.toFixed(2)
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-muted-foreground">
                  Frequency (ωn)
                </span>
                <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                  {telemetry.naturalFrequency !== null
                    ? `${Math.round(telemetry.naturalFrequency)} rad/s`
                    : "—"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Conditional Git Diff Card (Visible ONLY when draft is dirty) */}
      {draftCurve?.isDirty && (
        <div className="flex flex-col gap-1.5 rounded-[12px] bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="truncate font-heading text-[11px] font-semibold text-foreground">
              Diff vs {parentCurve.name}
            </span>
            <span className="shrink-0 rounded-[6px] bg-secondary px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground tabular-nums">
              {diff.t95DeltaMs > 0
                ? `+${Math.round(diff.t95DeltaMs)}ms`
                : `${Math.round(diff.t95DeltaMs)}ms`}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {diff.summaryBullets.length > 0 ? (
              diff.summaryBullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="font-sans text-[11px] leading-relaxed text-muted-foreground"
                >
                  • {bullet}
                </div>
              ))
            ) : (
              <span className="font-sans text-[11px] text-muted-foreground">
                Matches parent baseline
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Best Use Cases */}
      <div className="mt-auto flex flex-col gap-1.5">
        <span className="font-heading text-xs font-semibold text-foreground">
          Best Use Cases
        </span>
        <div className="flex flex-wrap gap-1.5">
          {useCases.map((tag) => (
            <span
              key={tag}
              className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
