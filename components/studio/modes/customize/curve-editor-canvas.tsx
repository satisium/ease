"use client"

/**
 * @file components/studio/modes/customize/curve-editor-canvas.tsx
 * @description Tactile SVG Curve & Analytical Spring Canvas + Integrated Controls for Satisium Ease Customize Mode.
 *
 * Invariants:
 * - Dynamic Auto-Zoom ViewBox computing exact overshoot/undershoot bounds.
 * - 120fps imperative playhead dot driven via useClockRef with ZERO React re-renders.
 * - Nudge & pointer dragging updates non-destructive draftCurve in store.
 * - Houses compact Engine Switcher (Bezier | Spring), numerical inputs (P1/P2, Simple/Physics),
 *   quick actions (Mirror to Exit, Snap Critical), collapsible Import, and Git Working Tree actions.
 * - Strict Satisium Design Language: 0 borders, 0 shadows, 0 opacity modifiers, squircle geometry.
 * - Accessible keyboard sliders (role="slider") with arrow-key micro-nudging.
 * - React 19 strict compliance: zero ref.current reading/writing during render.
 */

import * as React from "react"
import { useEaseStore } from "@/hooks/use-ease-store"
import {
  computeBezierViewBounds,
  computeSpringExtremes,
  computeCurveTelemetry,
  fitSpringToDurationMs,
  springToBounceAndDuration,
  bounceAndDurationToSpring,
  findCurveInCustomTree,
  solveBezierAtTime,
  solveSpringAtTime,
  sampleBezierCurve,
  sampleSpringCurve,
  nudgeBezierHandle,
  type EaseCurve,
  type MotionEngine,
} from "@/core"
import { cn } from "@/lib/utils"

export interface CurveEditorCanvasProps {
  className?: string
}

const SVG_WIDTH = 380
const SVG_HEIGHT = 380
const PAD_X = 38
const PAD_Y = 38

/**
 * Tactile SVG Curve & Spring Editor Canvas with integrated controls.
 */
export function CurveEditorCanvas({ className }: CurveEditorCanvasProps) {
  const draftCurve = useEaseStore((s) => s.draftCurve)
  const getActiveCurve = useEaseStore((s) => s.getActiveCurve)
  const customCurves = useEaseStore((s) => s.customCurves)
  const updateDraft = useEaseStore((s) => s.updateDraft)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)
  const exitCustomize = useEaseStore((s) => s.exitCustomize)
  const revertActiveDraft = useEaseStore((s) => s.revertActiveDraft)
  const commitActiveDraft = useEaseStore((s) => s.commitActiveDraft)
  const forkActiveDraftToRoot = useEaseStore((s) => s.forkActiveDraftToRoot)
  const forkActiveDraftAsVariant = useEaseStore(
    (s) => s.forkActiveDraftAsVariant
  )
  const importCurveString = useEaseStore((s) => s.importCurveString)
  const focusedChannel = useEaseStore((s) => s.getFocusedChannel())
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const setFocusedDurationMs = useEaseStore((s) => s.setFocusedDurationMs)
  const setFocusedSpringMode = useEaseStore((s) => s.setFocusedSpringMode)
  const triggerLive = useEaseStore((s) => s.triggerLive)

  const isInitializedRef = React.useRef(false)

  // Ensure customize mode / draftCurve exists once on mount
  React.useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      if (!draftCurve) {
        enterCustomize()
      }
    }
  }, [draftCurve, enterCustomize])

  // Resolve active curve and parent baseline
  const curve: EaseCurve = draftCurve?.workingCurve ?? getActiveCurve()
  const parentCurve = draftCurve?.parentCurve

  // Spring time sync: resolve effective spring matching focusedChannel duration mode
  const springMode = focusedChannel?.springMode
  const channelDurationMs = focusedChannel?.durationMs

  const effectiveSpring = React.useMemo(() => {
    if (
      curve.engine === "spring" &&
      springMode === "fit" &&
      typeof channelDurationMs === "number"
    ) {
      return fitSpringToDurationMs(curve.spring, channelDurationMs)
    }
    return curve.spring
  }, [curve.engine, curve.spring, springMode, channelDurationMs])

  // Local UI toggles
  const [showVelocity, setShowVelocity] = React.useState(false)
  const [autoReplay, setAutoReplay] = React.useState(true)
  const [springInputMode, setSpringInputMode] = React.useState<
    "simple" | "physics"
  >("simple")
  const [showImport, setShowImport] = React.useState(false)
  const [importRaw, setImportRaw] = React.useState("")
  const [draggingHandle, setDraggingHandle] = React.useState<
    "p1" | "p2" | null
  >(null)
  const [activePointerId, setActivePointerId] = React.useState<number | null>(
    null
  )

  const svgRef = React.useRef<SVGSVGElement>(null)

  // Safe update proxy ensuring draftCurve is initiated
  const handleUpdate = React.useCallback(
    (patch: Parameters<typeof updateDraft>[0]) => {
      if (!draftCurve) {
        enterCustomize()
      }
      updateDraft(patch)
    },
    [draftCurve, enterCustomize, updateDraft]
  )

  // Compute dynamic auto-zoom vertical bounds
  const { minY, maxY } = React.useMemo(() => {
    if (curve.engine === "bezier") {
      return computeBezierViewBounds(curve.bezier, 0.14)
    }
    const ex = computeSpringExtremes(effectiveSpring)
    return {
      minY: Math.min(0, ex.minY) - 0.12,
      maxY: Math.max(1, ex.maxY) + 0.12,
    }
  }, [curve.engine, curve.bezier, effectiveSpring])

  // Peak overshoot metric
  const peakY = React.useMemo(() => {
    if (curve.engine === "bezier") {
      return computeBezierViewBounds(curve.bezier).maxY
    }
    return computeSpringExtremes(effectiveSpring).maxY
  }, [curve.engine, curve.bezier, effectiveSpring])

  // Coordinate projection math
  const svgX = React.useCallback(
    (x: number) => PAD_X + x * (SVG_WIDTH - 2 * PAD_X),
    []
  )

  const svgY = React.useCallback(
    (y: number) => {
      const span = maxY - minY
      const norm = (maxY - y) / (span || 1)
      return PAD_Y + norm * (SVG_HEIGHT - 2 * PAD_Y)
    },
    [minY, maxY]
  )

  // Inverse coordinate projection from pointer events back to normalized math space
  const screenToMath = React.useCallback(
    (clientX: number, clientY: number, svgElement: SVGSVGElement) => {
      const rect = svgElement.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
      const svgPointX = ((clientX - rect.left) / rect.width) * SVG_WIDTH
      const svgPointY = ((clientY - rect.top) / rect.height) * SVG_HEIGHT

      const rawX = (svgPointX - PAD_X) / (SVG_WIDTH - 2 * PAD_X)
      const clampedX = Math.max(0, Math.min(1, rawX))

      const span = maxY - minY
      const normY = (svgPointY - PAD_Y) / (SVG_HEIGHT - 2 * PAD_Y)
      const rawY = maxY - normY * span

      const round3 = (v: number) => Math.round(v * 1000) / 1000
      return { x: round3(clampedX), y: round3(rawY) }
    },
    [minY, maxY]
  )

  // Telemetry & t95 arrival
  const totalMs = channelDurationMs ?? 400
  const telemetry = React.useMemo(() => {
    return computeCurveTelemetry(curve, totalMs, springMode ?? "fit")
  }, [curve, totalMs, springMode])

  const t95Coords = React.useMemo(() => {
    const t95Ms = telemetry.timeTo95Ms ?? totalMs * 0.95
    const normTime = Math.max(0, Math.min(1, t95Ms / totalMs))
    let val = 0
    if (curve.engine === "bezier") {
      val = solveBezierAtTime(curve.bezier, normTime).value
    } else {
      val = solveSpringAtTime(effectiveSpring, t95Ms).value
    }
    const sx = Number.isFinite(svgX(normTime)) ? svgX(normTime) : svgX(1)
    const sy = Number.isFinite(svgY(val)) ? svgY(val) : svgY(1)
    return {
      x: sx,
      y: sy,
      arrivalMs: t95Ms,
    }
  }, [
    telemetry,
    totalMs,
    curve.engine,
    curve.bezier,
    effectiveSpring,
    svgX,
    svgY,
  ])

  // Main kinetic paths computation
  const bezierPath = React.useMemo(() => {
    if (curve.engine !== "bezier") return ""
    const x0 = svgX(0).toFixed(2)
    const y0 = svgY(0).toFixed(2)
    const x1 = svgX(curve.bezier.p1.x).toFixed(2)
    const y1 = svgY(curve.bezier.p1.y).toFixed(2)
    const x2 = svgX(curve.bezier.p2.x).toFixed(2)
    const y2 = svgY(curve.bezier.p2.y).toFixed(2)
    const x3 = svgX(1).toFixed(2)
    const y3 = svgY(1).toFixed(2)
    return `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`
  }, [curve.engine, curve.bezier, svgX, svgY])

  const springPath = React.useMemo(() => {
    if (curve.engine !== "spring") return ""
    const samples = sampleSpringCurve(effectiveSpring, undefined, 120)
    return samples
      .map((pt, idx) => {
        const sx = svgX(pt.t).toFixed(2)
        const sy = svgY(pt.value).toFixed(2)
        return `${idx === 0 ? "M" : "L"} ${sx} ${sy}`
      })
      .join(" ")
  }, [curve.engine, effectiveSpring, svgX, svgY])

  const mainPath = curve.engine === "bezier" ? bezierPath : springPath

  // Ghost parent baseline path
  const ghostParentPath = React.useMemo(() => {
    if (!parentCurve || !draftCurve?.isDirty) return ""
    if (parentCurve.engine === "bezier") {
      const x0 = svgX(0).toFixed(2)
      const y0 = svgY(0).toFixed(2)
      const x1 = svgX(parentCurve.bezier.p1.x).toFixed(2)
      const y1 = svgY(parentCurve.bezier.p1.y).toFixed(2)
      const x2 = svgX(parentCurve.bezier.p2.x).toFixed(2)
      const y2 = svgY(parentCurve.bezier.p2.y).toFixed(2)
      const x3 = svgX(1).toFixed(2)
      const y3 = svgY(1).toFixed(2)
      return `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`
    } else {
      const effParent =
        springMode === "fit" && typeof channelDurationMs === "number"
          ? fitSpringToDurationMs(parentCurve.spring, channelDurationMs)
          : parentCurve.spring
      const samples = sampleSpringCurve(effParent, undefined, 100)
      return samples
        .map((pt, idx) => {
          const sx = svgX(pt.t).toFixed(2)
          const sy = svgY(pt.value).toFixed(2)
          return `${idx === 0 ? "M" : "L"} ${sx} ${sy}`
        })
        .join(" ")
    }
  }, [
    parentCurve,
    draftCurve?.isDirty,
    springMode,
    channelDurationMs,
    svgX,
    svgY,
  ])

  // Velocity ribbon and top-edge line
  const { velocityRibbonPath, velocityTopEdgePath } = React.useMemo(() => {
    if (!showVelocity)
      return { velocityRibbonPath: "", velocityTopEdgePath: "" }
    let samples: { t: number; velocity: number }[] = []
    if (curve.engine === "bezier") {
      samples = sampleBezierCurve(curve.bezier, 80)
    } else {
      samples = sampleSpringCurve(effectiveSpring, undefined, 80)
    }
    const maxV = Math.max(0.001, ...samples.map((s) => Math.abs(s.velocity)))
    const baselineY = svgY(0)

    const topPoints = samples.map((s) => {
      const vNorm = (s.velocity / maxV) * 0.75
      return {
        sx: svgX(s.t),
        sy: svgY(vNorm),
      }
    })

    const topEdge = topPoints
      .map(
        (pt, idx) =>
          `${idx === 0 ? "M" : "L"} ${pt.sx.toFixed(2)} ${pt.sy.toFixed(2)}`
      )
      .join(" ")

    const lastPt = topPoints[topPoints.length - 1]
    const firstPt = topPoints[0]
    const ribbon = `${topEdge} L ${lastPt.sx.toFixed(2)} ${baselineY.toFixed(2)} L ${firstPt.sx.toFixed(2)} ${baselineY.toFixed(2)} Z`

    return { velocityRibbonPath: ribbon, velocityTopEdgePath: topEdge }
  }, [showVelocity, curve.engine, curve.bezier, effectiveSpring, svgX, svgY])

  // Pointer drag interactions
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent, handle: "p1" | "p2") => {
      e.preventDefault()
      e.stopPropagation()
      setDraggingHandle(handle)
      setActivePointerId(e.pointerId)
      try {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      } catch {
        // safe fallback
      }
    },
    []
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!draggingHandle || !svgRef.current) return
      e.preventDefault()
      const { x, y } = screenToMath(e.clientX, e.clientY, svgRef.current)
      if (draggingHandle === "p1") {
        handleUpdate({
          bezier: {
            p1: { x, y },
            p2: curve.bezier.p2,
          },
        })
      } else if (draggingHandle === "p2") {
        handleUpdate({
          bezier: {
            p1: curve.bezier.p1,
            p2: { x, y },
          },
        })
      }
    },
    [draggingHandle, screenToMath, curve.bezier, handleUpdate]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (draggingHandle && activePointerId !== null) {
        try {
          ;(e.currentTarget as Element).releasePointerCapture(activePointerId)
        } catch {
          // safe fallback
        }
      }
      if (draggingHandle && autoReplay && focusedTrackId) {
        triggerLive(focusedTrackId)
      }
      setDraggingHandle(null)
      setActivePointerId(null)
    },
    [draggingHandle, activePointerId, autoReplay, focusedTrackId, triggerLive]
  )

  // Arrow key micro-nudging
  const handleHandleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, handle: "p1" | "p2") => {
      const step = e.shiftKey ? 0.05 : 0.01
      let dx = 0
      let dy = 0

      if (e.key === "ArrowLeft") dx = -step
      else if (e.key === "ArrowRight") dx = step
      else if (e.key === "ArrowUp") dy = step
      else if (e.key === "ArrowDown") dy = -step
      else return

      e.preventDefault()
      e.stopPropagation()
      const nextBezier = nudgeBezierHandle(curve.bezier, handle, dx, dy)
      handleUpdate({ bezier: nextBezier })
    },
    [curve.bezier, handleUpdate]
  )

  // Quick Action: Mirror to Exit
  const handleMirrorToExit = React.useCallback(() => {
    if (curve.engine !== "bezier") return
    const nextP1 = {
      x: Math.max(
        0,
        Math.min(1, Math.round((1 - curve.bezier.p2.x) * 1000) / 1000)
      ),
      y: Math.round((1 - curve.bezier.p2.y) * 1000) / 1000,
    }
    const nextP2 = {
      x: Math.max(
        0,
        Math.min(1, Math.round((1 - curve.bezier.p1.x) * 1000) / 1000)
      ),
      y: Math.round((1 - curve.bezier.p1.y) * 1000) / 1000,
    }
    handleUpdate({ bezier: { p1: nextP1, p2: nextP2 } })
  }, [curve.engine, curve.bezier, handleUpdate])

  // Quick Action: Snap to Critical Damping
  const handleSnapCritical = React.useCallback(() => {
    if (curve.engine !== "spring") return
    setFocusedSpringMode("natural")
    const { mass, stiffness } = curve.spring
    const criticalDamping =
      Math.round(2 * Math.sqrt(stiffness * mass) * 100) / 100
    handleUpdate({
      spring: {
        ...curve.spring,
        damping: criticalDamping,
      },
    })
  }, [curve.engine, curve.spring, setFocusedSpringMode, handleUpdate])

  // Quick Action: Import
  const handleApplyImport = React.useCallback(() => {
    if (!importRaw.trim()) return
    const result = importCurveString(importRaw.trim())
    if (result) {
      setImportRaw("")
      setShowImport(false)
    }
  }, [importRaw, importCurveString])

  const handleImportKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleApplyImport()
    }
  }

  // Fork variant action
  const handleForkVariant = React.useCallback(() => {
    if (!draftCurve) return
    const rootId =
      draftCurve.sourceScope === "custom-root"
        ? draftCurve.sourceCurveId
        : (findCurveInCustomTree(customCurves, draftCurve.sourceCurveId)
            ?.parentRoot?.id ?? draftCurve.sourceCurveId)
    forkActiveDraftAsVariant(rootId)
  }, [draftCurve, customCurves, forkActiveDraftAsVariant])

  const y0Svg = svgY(0)
  const y1Svg = svgY(1)

  return (
    <div
      aria-label="Curve Editor Canvas"
      className={cn(
        "relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-[16px] bg-muted p-3 select-none",
        className
      )}
    >
      {/* TOP ~2/3: Pure 1:1 SVG Coordinate Box */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top Header Strip */}
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {draftCurve?.isDirty && (
              <span className="rounded-[6px] bg-background px-2 py-0.5 font-sans text-[10px] font-medium text-foreground tabular-nums">
                Draft *
              </span>
            )}
          </div>

          {/* Right: Clean Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Toggle auto-replay on release"
              onClick={() => setAutoReplay((prev) => !prev)}
              className={cn(
                "h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-[11px] font-medium transition-colors",
                autoReplay
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Auto-Replay
            </button>

            <button
              type="button"
              aria-label="Toggle velocity slope curve"
              onClick={() => setShowVelocity((prev) => !prev)}
              className={cn(
                "h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-[11px] font-medium transition-colors",
                showVelocity
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Velocity
            </button>
          </div>
        </div>

        {/* Centered 1:1 SVG Coordinate Box */}
        <div className="relative z-10 my-auto flex min-h-0 flex-1 items-center justify-center p-1">
          <div className="relative mx-auto flex aspect-square max-h-full w-full max-w-[380px] items-center justify-center rounded-[12px] bg-background p-4">
            {/* Velocity & Progress Legend */}
            {showVelocity && (
              <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-2 rounded-[6px] bg-secondary px-2 py-1 font-sans text-[9px] text-muted-foreground tabular-nums">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-2.5 bg-foreground" />
                  <span className="text-foreground">Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-2.5 bg-brand" />
                  <span className="text-brand">Velocity</span>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity={0.08}
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              {/* Subtle axis ticks */}
              <text
                x={svgX(0) - 8}
                y={y0Svg + 3}
                textAnchor="end"
                className="pointer-events-none fill-muted-foreground font-sans text-[9px] tabular-nums select-none"
              >
                0
              </text>
              <text
                x={svgX(0) - 8}
                y={y1Svg + 3}
                textAnchor="end"
                className="pointer-events-none fill-muted-foreground font-sans text-[9px] tabular-nums select-none"
              >
                1
              </text>

              {/* Subtle overshoot zone shading when maxY > 1.01 or minY < -0.01 */}
              {maxY > 1.01 && (
                <rect
                  x={svgX(0)}
                  y={svgY(maxY)}
                  width={svgX(1) - svgX(0)}
                  height={Math.max(0, y1Svg - svgY(maxY))}
                  className="text-muted-foreground"
                  fill="currentColor"
                  fillOpacity={0.04}
                />
              )}
              {minY < -0.01 && (
                <rect
                  x={svgX(0)}
                  y={y0Svg}
                  width={svgX(1) - svgX(0)}
                  height={Math.max(0, svgY(minY) - y0Svg)}
                  className="text-muted-foreground"
                  fill="currentColor"
                  fillOpacity={0.04}
                />
              )}

              {/* 4x4 hairline coordinate grid (25%, 50%, 75% vertical & horizontal) */}
              {[0.25, 0.5, 0.75].map((tick) => (
                <line
                  key={`grid-v-${tick}`}
                  x1={svgX(tick)}
                  y1={svgY(minY)}
                  x2={svgX(tick)}
                  y2={svgY(maxY)}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
              ))}
              {[0.25, 0.5, 0.75].map((tick) => (
                <line
                  key={`grid-h-${tick}`}
                  x1={svgX(0)}
                  y1={svgY(tick)}
                  x2={svgX(1)}
                  y2={svgY(tick)}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
              ))}

              {/* Horizontal reference rails at y = 0 and y = 1 */}
              <line
                x1={svgX(0)}
                y1={y0Svg}
                x2={svgX(1)}
                y2={y0Svg}
                className="text-muted-foreground"
                stroke="currentColor"
                strokeOpacity={0.22}
                strokeWidth={1}
              />
              <line
                x1={svgX(0)}
                y1={y1Svg}
                x2={svgX(1)}
                y2={y1Svg}
                className="text-muted-foreground"
                stroke="currentColor"
                strokeOpacity={0.22}
                strokeWidth={1}
              />

              {/* Linear diagonal (0,0) -> (1,1) */}
              <line
                x1={svgX(0)}
                y1={y0Svg}
                x2={svgX(1)}
                y2={y1Svg}
                className="text-muted-foreground"
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeDasharray="3 3"
                strokeWidth={1}
              />

              {/* Peak Overshoot Reference Guideline */}
              {peakY > 1.005 && (
                <g>
                  <line
                    x1={svgX(0)}
                    y1={svgY(peakY)}
                    x2={svgX(1)}
                    y2={svgY(peakY)}
                    className="stroke-muted-foreground"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                  />
                  <text
                    x={svgX(1) + 4}
                    y={svgY(peakY) + 3}
                    className="pointer-events-none fill-muted-foreground font-sans text-[9px] tabular-nums select-none"
                  >
                    +{((peakY - 1) * 100).toFixed(1)}%
                  </text>
                </g>
              )}

              {/* Ghost Parent Curve Baseline */}
              {ghostParentPath && (
                <path
                  d={ghostParentPath}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="none"
                />
              )}

              {/* Soft under-curve vertical gradient fill */}
              {mainPath && (
                <path
                  d={`${mainPath} L ${svgX(1)} ${y0Svg} L ${svgX(0)} ${y0Svg} Z`}
                  className="text-foreground"
                  fill="url(#curveGradient)"
                />
              )}

              {/* Velocity Ribbon Area & Edge */}
              {showVelocity && velocityRibbonPath && (
                <>
                  <path
                    d={velocityRibbonPath}
                    fill="var(--brand)"
                    fillOpacity={0.14}
                  />
                  <path
                    d={velocityTopEdgePath}
                    stroke="var(--brand)"
                    strokeWidth={1.25}
                    fill="none"
                  />
                </>
              )}

              {/* Main Kinetic Curve Path */}
              <path
                d={mainPath}
                className="fill-none stroke-foreground stroke-[2.25]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Live Perceptual t95 Arrival Marker */}
              <g>
                <circle
                  cx={t95Coords.x.toFixed(2)}
                  cy={t95Coords.y.toFixed(2)}
                  r={2.5}
                  className="fill-muted-foreground"
                />
                <text
                  x={t95Coords.x.toFixed(2)}
                  y={(t95Coords.y - 6).toFixed(2)}
                  textAnchor="middle"
                  className="pointer-events-none fill-muted-foreground font-sans text-[8px] tabular-nums select-none"
                >
                  t95
                </text>
              </g>

              {/* Draggable Bézier Handles */}
              {curve.engine === "bezier" && (
                <>
                  {/* Tether line: (0,0) -> P1 */}
                  <line
                    x1={svgX(0)}
                    y1={y0Svg}
                    x2={svgX(curve.bezier.p1.x)}
                    y2={svgY(curve.bezier.p1.y)}
                    className="stroke-muted-foreground stroke-[1.25]"
                  />

                  {/* Tether line: (1,1) -> P2 */}
                  <line
                    x1={svgX(1)}
                    y1={y1Svg}
                    x2={svgX(curve.bezier.p2.x)}
                    y2={svgY(curve.bezier.p2.y)}
                    className="stroke-muted-foreground stroke-[1.25]"
                  />

                  {/* Handle P1 */}
                  <g
                    tabIndex={0}
                    role="slider"
                    aria-label="Control handle P1"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={curve.bezier.p1.x}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-brand"
                    onKeyDown={(e) => handleHandleKeyDown(e, "p1")}
                    onPointerDown={(e) => handlePointerDown(e, "p1")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <circle
                      cx={svgX(curve.bezier.p1.x)}
                      cy={svgY(curve.bezier.p1.y)}
                      r={22}
                      className="cursor-grab fill-transparent active:cursor-grabbing"
                    />
                    <circle
                      cx={svgX(curve.bezier.p1.x)}
                      cy={svgY(curve.bezier.p1.y)}
                      r={6}
                      className="pointer-events-none fill-background stroke-foreground stroke-[2]"
                    />
                  </g>

                  {/* Handle P2 */}
                  <g
                    tabIndex={0}
                    role="slider"
                    aria-label="Control handle P2"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={curve.bezier.p2.x}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-brand"
                    onKeyDown={(e) => handleHandleKeyDown(e, "p2")}
                    onPointerDown={(e) => handlePointerDown(e, "p2")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <circle
                      cx={svgX(curve.bezier.p2.x)}
                      cy={svgY(curve.bezier.p2.y)}
                      r={22}
                      className="cursor-grab fill-transparent active:cursor-grabbing"
                    />
                    <circle
                      cx={svgX(curve.bezier.p2.x)}
                      cy={svgY(curve.bezier.p2.y)}
                      r={6}
                      className="pointer-events-none fill-background stroke-foreground stroke-[2]"
                    />
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM ~1/3: Controls & Working Tree Dock */}
      <div className="flex shrink-0 flex-col gap-2 rounded-[12px] bg-background p-2.5">
        {/* Row 1: Engine Switcher + Mirror/Critical + Import toggle */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center rounded-[8px] bg-muted p-0.5">
            <button
              type="button"
              aria-label="Switch to Bezier engine"
              onClick={() => handleUpdate({ engine: "bezier" as MotionEngine })}
              className={cn(
                "h-6 cursor-pointer rounded-[6px] px-2.5 font-heading text-xs font-medium transition-colors",
                curve.engine === "bezier"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Bezier
            </button>
            <button
              type="button"
              aria-label="Switch to Spring engine"
              onClick={() => handleUpdate({ engine: "spring" as MotionEngine })}
              className={cn(
                "h-6 cursor-pointer rounded-[6px] px-2.5 font-heading text-xs font-medium transition-colors",
                curve.engine === "spring"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Spring
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {curve.engine === "bezier" ? (
              <button
                type="button"
                aria-label="Mirror curve to exit"
                onClick={handleMirrorToExit}
                className="h-7 cursor-pointer rounded-[8px] bg-secondary px-2.5 font-sans text-[11px] font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              >
                Mirror to Exit
              </button>
            ) : (
              <button
                type="button"
                aria-label="Snap to critical damping"
                onClick={handleSnapCritical}
                className="h-7 cursor-pointer rounded-[8px] bg-secondary px-2.5 font-sans text-[11px] font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              >
                Critical (ζ = 1)
              </button>
            )}

            <button
              type="button"
              aria-label="Toggle curve import"
              onClick={() => setShowImport((prev) => !prev)}
              className={cn(
                "h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-[11px] font-medium transition-colors active:scale-95",
                showImport
                  ? "bg-foreground text-background"
                  : "bg-secondary text-foreground hover:bg-muted"
              )}
            >
              Import
            </button>
          </div>
        </div>

        {/* Collapsible Import Row */}
        {showImport && (
          <div className="flex items-center gap-1.5 rounded-[8px] bg-muted p-1">
            <input
              type="text"
              aria-label="Curve import definition"
              placeholder="cubic-bezier(...) or spring..."
              value={importRaw}
              onChange={(e) => setImportRaw(e.target.value)}
              onKeyDown={handleImportKeyDown}
              className="h-6 min-w-0 flex-1 rounded-[6px] bg-background px-2 font-sans text-xs text-foreground outline-none focus:bg-secondary"
            />
            <button
              type="button"
              aria-label="Apply imported curve"
              onClick={handleApplyImport}
              className="h-6 shrink-0 cursor-pointer rounded-[6px] bg-foreground px-2 font-sans text-xs font-medium text-background transition-colors active:scale-95"
            >
              Apply
            </button>
          </div>
        )}

        {/* Row 2: Parameters */}
        {curve.engine === "bezier" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between gap-1.5 rounded-[8px] bg-muted px-2.5 py-1.5">
              <span className="font-heading text-[11px] font-semibold text-foreground">
                P1
              </span>
              <div className="flex items-center gap-1">
                <span className="font-sans text-[10px] text-muted-foreground">
                  X
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  aria-label="P1 X coordinate"
                  value={curve.bezier.p1.x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) {
                      handleUpdate({
                        bezier: {
                          p1: {
                            x: Math.max(0, Math.min(1, val)),
                            y: curve.bezier.p1.y,
                          },
                          p2: curve.bezier.p2,
                        },
                      })
                    }
                  }}
                  className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-[10px] text-muted-foreground">
                  Y
                </span>
                <input
                  type="number"
                  step="0.01"
                  aria-label="P1 Y coordinate"
                  value={curve.bezier.p1.y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) {
                      handleUpdate({
                        bezier: {
                          p1: { x: curve.bezier.p1.x, y: val },
                          p2: curve.bezier.p2,
                        },
                      })
                    }
                  }}
                  className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 rounded-[8px] bg-muted px-2.5 py-1.5">
              <span className="font-heading text-[11px] font-semibold text-foreground">
                P2
              </span>
              <div className="flex items-center gap-1">
                <span className="font-sans text-[10px] text-muted-foreground">
                  X
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  aria-label="P2 X coordinate"
                  value={curve.bezier.p2.x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) {
                      handleUpdate({
                        bezier: {
                          p1: curve.bezier.p1,
                          p2: {
                            x: Math.max(0, Math.min(1, val)),
                            y: curve.bezier.p2.y,
                          },
                        },
                      })
                    }
                  }}
                  className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-[10px] text-muted-foreground">
                  Y
                </span>
                <input
                  type="number"
                  step="0.01"
                  aria-label="P2 Y coordinate"
                  value={curve.bezier.p2.y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) {
                      handleUpdate({
                        bezier: {
                          p1: curve.bezier.p1,
                          p2: { x: curve.bezier.p2.x, y: val },
                        },
                      })
                    }
                  }}
                  className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5 rounded-[8px] bg-muted px-2 py-1.5">
            <div className="flex items-center rounded-[6px] bg-background p-0.5">
              <button
                type="button"
                aria-label="Switch to Simple spring mode"
                onClick={() => setSpringInputMode("simple")}
                className={cn(
                  "h-5 cursor-pointer rounded-[5px] px-2 font-sans text-[10px] font-medium transition-colors",
                  springInputMode === "simple"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Simple
              </button>
              <button
                type="button"
                aria-label="Switch to Physics spring mode"
                onClick={() => setSpringInputMode("physics")}
                className={cn(
                  "h-5 cursor-pointer rounded-[5px] px-2 font-sans text-[10px] font-medium transition-colors",
                  springInputMode === "physics"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Physics
              </button>
            </div>

            {springInputMode === "simple" ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="font-sans text-[10px] text-muted-foreground">
                    Response
                  </span>
                  <input
                    type="number"
                    step="10"
                    min="20"
                    max="3000"
                    aria-label="Spring response in milliseconds"
                    value={
                      springToBounceAndDuration(effectiveSpring).durationMs
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        const { bounce } =
                          springToBounceAndDuration(effectiveSpring)
                        const nextSpring = bounceAndDurationToSpring(
                          val,
                          bounce,
                          effectiveSpring.mass
                        )
                        if (focusedChannel?.springMode === "fit") {
                          setFocusedDurationMs(val)
                        }
                        handleUpdate({ spring: nextSpring })
                      }
                    }}
                    className="h-6 w-14 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                  />
                  <span className="font-sans text-[9px] text-muted-foreground tabular-nums">
                    ms
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-sans text-[10px] text-muted-foreground">
                    Bounce
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="-0.5"
                    max="0.85"
                    aria-label="Spring bounce"
                    value={springToBounceAndDuration(effectiveSpring).bounce}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        const { durationMs } =
                          springToBounceAndDuration(effectiveSpring)
                        const nextSpring = bounceAndDurationToSpring(
                          durationMs,
                          val,
                          effectiveSpring.mass
                        )
                        handleUpdate({ spring: nextSpring })
                      }
                    }}
                    className="h-6 w-14 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="font-sans text-[10px] text-muted-foreground">
                    Mass
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    aria-label="Spring mass"
                    value={curve.spring.mass}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setFocusedSpringMode("natural")
                        handleUpdate({
                          spring: {
                            ...curve.spring,
                            mass: Math.max(0.01, val),
                          },
                        })
                      }
                    }}
                    className="h-6 w-11 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-sans text-[10px] text-muted-foreground">
                    Stiff
                  </span>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    aria-label="Spring stiffness"
                    value={curve.spring.stiffness}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setFocusedSpringMode("natural")
                        handleUpdate({
                          spring: {
                            ...curve.spring,
                            stiffness: Math.max(1, val),
                          },
                        })
                      }
                    }}
                    className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-sans text-[10px] text-muted-foreground">
                    Damp
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0.1"
                    aria-label="Spring damping"
                    value={curve.spring.damping}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setFocusedSpringMode("natural")
                        handleUpdate({
                          spring: {
                            ...curve.spring,
                            damping: Math.max(0.1, val),
                          },
                        })
                      }
                    }}
                    className="h-6 w-12 rounded-[6px] bg-secondary text-center font-sans text-xs text-foreground tabular-nums outline-none focus:bg-background"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 3: Working Tree Actions */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1.5">
            {draftCurve?.isDirty && (
              <>
                <button
                  type="button"
                  aria-label="Revert uncommitted draft"
                  onClick={revertActiveDraft}
                  className="h-7 cursor-pointer rounded-[8px] bg-muted px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
                >
                  Revert
                </button>
                {draftCurve.sourceScope !== "preset" && (
                  <button
                    type="button"
                    aria-label="Commit draft changes to curve"
                    onClick={commitActiveDraft}
                    className="h-7 cursor-pointer rounded-[8px] bg-secondary px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
                  >
                    Commit
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {draftCurve?.sourceScope === "preset" ? (
              <button
                type="button"
                aria-label="Save draft as new custom curve"
                onClick={() => forkActiveDraftToRoot()}
                className="h-7 cursor-pointer rounded-[8px] bg-foreground px-2.5 font-heading text-xs font-medium text-background transition-colors active:scale-95"
              >
                Save Custom
              </button>
            ) : (
              <button
                type="button"
                aria-label="Fork draft as variant branch"
                onClick={handleForkVariant}
                className="h-7 cursor-pointer rounded-[8px] bg-secondary px-2.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              >
                + Fork Variant
              </button>
            )}

            <button
              type="button"
              aria-label="Back to Audition mode"
              onClick={exitCustomize}
              className="h-7 cursor-pointer rounded-[8px] bg-secondary px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
