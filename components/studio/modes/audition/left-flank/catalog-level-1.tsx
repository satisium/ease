"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  PlusSignIcon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { MiniGraph } from "@/components/ui/mini-graph"
import { computeCurveTelemetry } from "@/core/math/telemetry"
import { getCanonicalPresetById } from "@/core/presets/index"
import { findCurveInCustomTree } from "@/core/state/curve-tree-reducers"
import { useEaseStore } from "@/hooks/use-ease-store"
import { cn } from "@/lib/utils"
import { PresetCurveStage } from "./preset-curve-stage"

export function CatalogLevel1() {
  const navStack = useEaseStore((s) => s.navStack)
  const customCurves = useEaseStore((s) => s.customCurves)
  const backToPresets = useEaseStore((s) => s.backToPresets)
  const drillIntoCurve = useEaseStore((s) => s.drillIntoCurve)
  const deleteCurve = useEaseStore((s) => s.deleteCurve)
  const renameCurve = useEaseStore((s) => s.renameCurve)
  const forkPresetToCustom = useEaseStore((s) => s.forkPresetToCustom)
  const addVariantToRoot = useEaseStore((s) => s.addVariantToRoot)
  const promoteVariant = useEaseStore((s) => s.promoteVariant)
  const stageVariantsToCompare = useEaseStore((s) => s.stageVariantsToCompare)
  const selectCurveForFocused = useEaseStore((s) => s.selectCurveForFocused)
  const focusedChannel = useEaseStore((s) => s.getFocusedChannel())

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleEditValue, setTitleEditValue] = React.useState("")

  const detailScrollRef = React.useRef<HTMLDivElement>(null)
  const [detailScrollState, setDetailScrollState] = React.useState<{
    canScrollUp: boolean
    canScrollDown: boolean
  }>({
    canScrollUp: false,
    canScrollDown: false,
  })

  const updateDetailScrollState = React.useCallback(() => {
    const el = detailScrollRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    const hasOverflow = maxScroll > 2

    const canScrollUp = hasOverflow && scrollTop > 2
    const canScrollDown = hasOverflow && scrollTop < maxScroll - 2

    setDetailScrollState((prev) => {
      if (
        prev.canScrollUp === canScrollUp &&
        prev.canScrollDown === canScrollDown
      ) {
        return prev
      }
      return { canScrollUp, canScrollDown }
    })
  }, [])

  React.useEffect(() => {
    updateDetailScrollState()
  }, [navStack, updateDetailScrollState])

  React.useEffect(() => {
    const el = detailScrollRef.current
    if (!el) return

    updateDetailScrollState()

    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      updateDetailScrollState()
    })
    ro.observe(el)

    return () => ro.disconnect()
  }, [updateDetailScrollState])

  const detailMaskStyle = React.useMemo<React.CSSProperties>(() => {
    const { canScrollUp, canScrollDown } = detailScrollState
    if (!canScrollUp && !canScrollDown) {
      return {}
    }

    const fadeSize = "16px"
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
  }, [detailScrollState])

  if (navStack.level !== 1) {
    return null
  }

  const curveId = navStack.curveId
  const curve =
    findCurveInCustomTree(customCurves, curveId)?.node ??
    getCanonicalPresetById(curveId)

  if (!curve) {
    return null
  }

  const telemetry = computeCurveTelemetry(curve)
  const isRootCustom =
    Boolean(curve.isCustom) && customCurves.some((c) => c.id === curve.id)

  const handleSaveTitle = () => {
    if (curve.isCustom && titleEditValue.trim()) {
      renameCurve(curve.id, titleEditValue.trim())
    }
    setIsEditingTitle(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      {/* TIER 1: PINNED TOP NAVIGATION BAR */}
      <div className="flex shrink-0 items-center justify-between pb-2.5">
        <button
          type="button"
          onClick={backToPresets}
          aria-label="Back to preset library"
          className="group flex cursor-pointer items-center gap-1.5 rounded-[8px] bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          />
          <span className="font-heading">Presets</span>
        </button>

        <div className="flex items-center gap-1.5">
          {curve.isCustom && (
            <button
              type="button"
              onClick={() => deleteCurve(curve.id)}
              aria-label={`Delete ${curve.name}`}
              title={`Delete ${curve.name}`}
              className="flex size-6 cursor-pointer items-center justify-center rounded-[6px] bg-secondary text-muted-foreground transition-colors hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            </button>
          )}
          <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
            {Math.round(telemetry.settlingTimeMs)}ms
          </span>
        </div>
      </div>

      {/* TIER 2: SCROLLABLE RUNWAY */}
      <div
        ref={detailScrollRef}
        data-testid="preset-detail-scroll-container"
        onScroll={updateDetailScrollState}
        style={detailMaskStyle}
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5"
      >
        {/* 1:1 Kinetic Curve Stage */}
        <PresetCurveStage key={curve.id} curve={curve} />

        {/* Title, Lineage & Description */}
        <div className="flex shrink-0 flex-col gap-1 text-left">
          <div className="flex flex-col gap-0.5">
            {isEditingTitle && curve.isCustom ? (
              <input
                autoFocus
                value={titleEditValue}
                onChange={(e) => setTitleEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle()
                  if (e.key === "Escape") setIsEditingTitle(false)
                }}
                onBlur={handleSaveTitle}
                className="h-6 w-full rounded-[6px] bg-muted px-2 font-heading text-sm font-semibold text-foreground focus:outline-none"
              />
            ) : (
              <div className="group/title flex items-center gap-1.5">
                <h3
                  onClick={() => {
                    if (curve.isCustom) {
                      setTitleEditValue(curve.name)
                      setIsEditingTitle(true)
                    }
                  }}
                  className={cn(
                    "font-heading text-sm font-semibold tracking-tight text-foreground",
                    curve.isCustom &&
                      "cursor-pointer underline-offset-4 hover:underline"
                  )}
                  title={curve.isCustom ? "Click to rename" : curve.name}
                >
                  {curve.name}
                </h3>
                {curve.isCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleEditValue(curve.name)
                      setIsEditingTitle(true)
                    }}
                    aria-label="Rename curve"
                    title="Rename curve"
                    className="flex size-4 cursor-pointer items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100 hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="size-3" />
                  </button>
                )}
              </div>
            )}
            <p className="truncate font-sans text-[11px] text-muted-foreground">
              {curve.engine === "bezier" ? "Cubic Bézier" : "Physics Spring"} ·{" "}
              {curve.parentName
                ? `Forked from: ${curve.parentName}`
                : curve.category || "General"}
            </p>
          </div>
          {curve.description && (
            <p className="font-sans text-xs leading-relaxed text-muted-foreground">
              {curve.description}
            </p>
          )}
        </div>

        {/* Unified Parameter & Telemetry Slab */}
        <div className="flex flex-col gap-2 rounded-[12px] bg-secondary p-3">
          {/* Parameters: Spring (3-col) or Bézier (2-col Anchors) */}
          {curve.engine === "spring" ? (
            <div className="grid grid-cols-3 divide-x divide-muted font-sans text-xs">
              <div className="flex flex-col items-start gap-0.5 pr-2 text-left">
                <span className="text-[10px] text-muted-foreground">Mass</span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {curve.spring.mass ?? 1}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2 text-center">
                <span className="text-[10px] text-muted-foreground">
                  Stiffness
                </span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {curve.spring.stiffness}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 pl-2 text-right">
                <span className="text-[10px] text-muted-foreground">
                  Damping
                </span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {curve.spring.damping}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-muted font-sans">
              <div className="flex flex-col items-start gap-0.5 pr-3 text-left">
                <span className="text-[10px] text-muted-foreground">
                  Anchor P1
                </span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {curve.bezier.p1.x.toFixed(2)}, {curve.bezier.p1.y.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 pl-3 text-right">
                <span className="text-[10px] text-muted-foreground">
                  Anchor P2
                </span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {curve.bezier.p2.x.toFixed(2)}, {curve.bezier.p2.y.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-muted" />

          {/* Kinetic Telemetry Rows */}
          <div className="flex flex-col gap-1.5 font-sans text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">
                t95 Arrival
              </span>
              <span className="truncate font-mono font-medium text-foreground">
                {telemetry.timeTo95Ms}ms
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">Overshoot</span>
              <span className="truncate font-mono font-medium text-foreground">
                {telemetry.overshootPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">
                Classification
              </span>
              <span className="truncate font-medium text-foreground">
                {telemetry.classification}
              </span>
            </div>
          </div>
        </div>

        {/* Recommended For Use Cases */}
        {curve.useCases && curve.useCases.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[10px] font-medium text-muted-foreground">
              Recommended for
            </span>
            <div className="flex flex-wrap gap-1">
              {curve.useCases.map((uc) => (
                <span
                  key={uc}
                  className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[11px] text-muted-foreground"
                >
                  {uc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Custom Variants Grid (If Custom Root) */}
        {isRootCustom && (
          <div className="flex flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-xs font-semibold text-foreground">
                  Variants
                </span>
                <span className="rounded-[6px] bg-secondary px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
                  {curve.variants?.length ?? 0}
                </span>
              </div>

              {(curve.variants?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => stageVariantsToCompare(curve.id)}
                  className="cursor-pointer rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Compare Variants
                </button>
              )}
            </div>

            {/* Clean 1:1 Squircle 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2">
              {(curve.variants ?? []).map((v) => {
                const isSelected = focusedChannel?.curve.id === v.id

                return (
                  <div
                    key={v.id}
                    className="group relative flex w-full flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => selectCurveForFocused(v.id)}
                      onDoubleClick={() => drillIntoCurve(v.id)}
                      title={`${v.name} · Click to select · Double-click to inspect`}
                      className={cn(
                        "group relative flex w-full cursor-pointer flex-col items-center rounded-[12px] p-1 transition-all",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[9px] bg-background p-2">
                        <MiniGraph
                          mode={v.engine}
                          bezier={v.bezier}
                          spring={v.spring}
                          className={cn(
                            "h-full w-full stroke-2 transition-colors",
                            isSelected
                              ? "stroke-foreground"
                              : "stroke-muted-foreground group-hover:stroke-foreground"
                          )}
                        />
                      </div>

                      <div className="flex h-5 w-full items-center justify-center px-1">
                        <span className="truncate font-sans text-[11px] leading-none font-medium tracking-tight">
                          {v.name}
                        </span>
                      </div>
                    </button>

                    {/* Delete Variant */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCurve(v.id)
                      }}
                      aria-label={`Delete ${v.name}`}
                      title={`Delete ${v.name}`}
                      className="absolute top-2 left-2 z-10 flex size-4.5 cursor-pointer items-center justify-center rounded-[5px] bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-2.5" />
                    </button>

                    {/* Promote to Root */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        promoteVariant(curve.id, v.id)
                      }}
                      aria-label={`Promote ${v.name} to root`}
                      title={`Promote ${v.name} to root`}
                      className="absolute top-2 right-2 z-10 flex size-4.5 cursor-pointer items-center justify-center rounded-[5px] bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        className="size-2.5"
                      />
                    </button>
                  </div>
                )
              })}

              {/* Action Tile: + Add Variant */}
              <button
                type="button"
                onClick={() => addVariantToRoot(curve.id)}
                aria-label="Add variant to root curve"
                title="Add variant"
                className="group flex w-full cursor-pointer flex-col items-center rounded-[12px] bg-muted p-1 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                <div className="relative flex aspect-square w-full items-center justify-center rounded-[9px] bg-background p-2">
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    className="size-5 text-muted-foreground group-hover:text-foreground"
                  />
                </div>
                <div className="flex h-5 w-full items-center justify-center px-1">
                  <span className="truncate font-sans text-[11px] leading-none font-medium tracking-tight">
                    + Add Variant
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TIER 3: PINNED BOTTOM ACTION CTA */}
      <div className="shrink-0 border-t border-muted bg-background pt-2">
        <button
          type="button"
          onClick={() => {
            const created = forkPresetToCustom(curve.id)
            if (created) {
              drillIntoCurve(created.id)
            }
          }}
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          <span>
            {curve.isCustom ? "Fork as New Curve" : "Fork to Custom Curves"}
          </span>
        </button>
      </div>
    </div>
  )
}
