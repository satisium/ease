"use client"

/**
 * @file components/studio/modes/customize/customize-micro-preview.tsx
 * @description In-process Micro-Preview stage for Customize Mode (Component Habitat vs Primitives X-Ray).
 *
 * Invariants:
 * - Seamless toggle between real UI Habitat component and 4-property Primitives X-Ray.
 * - Dynamic sync guarantee: switching to primitives immediately propagates active working draft.
 * - Top Header: Component switcher, Phase toggle, and Channel dropdown (in Component mode) or
 *   Primitives filter pill (in Primitives mode) on the left, alongside Component/Primitives toggle on the right.
 * - Exact Card-in-Card parity: Both Component stage and Primitives share rounded-[12px] bg-background footprint.
 * - Satisium Design Language: 0 borders, 0 shadows, 0 opacity modifiers, squircle geometry.
 */

import * as React from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"
import { useEaseStore } from "@/hooks/use-ease-store"
import { trackRegistry, getPairedTrackId, listComponents } from "@/core"
import { PrimitivesXRay, type PrimitiveFilter } from "./primitives-xray"
import { cn } from "@/lib/utils"

export interface CustomizeMicroPreviewProps {
  className?: string
}

export function CustomizeMicroPreview({
  className,
}: CustomizeMicroPreviewProps) {
  const customizePreviewMode = useEaseStore((s) => s.customizePreviewMode)
  const setCustomizePreviewMode = useEaseStore((s) => s.setCustomizePreviewMode)
  const draftCurve = useEaseStore((s) => s.draftCurve)
  const updateDraft = useEaseStore((s) => s.updateDraft)
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const focusTrack = useEaseStore((s) => s.focusTrack)
  const focusChannel = useEaseStore((s) => s.focusChannel)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)

  const [primitivesFilter, setPrimitivesFilter] =
    React.useState<PrimitiveFilter>("all")
  const [isComponentMenuOpen, setIsComponentMenuOpen] = React.useState(false)
  const [isChannelMenuOpen, setIsChannelMenuOpen] = React.useState(false)

  const componentMenuRef = React.useRef<HTMLDivElement>(null)
  const channelMenuRef = React.useRef<HTMLDivElement>(null)

  const components = React.useMemo(() => listComponents(), [])
  const track = trackRegistry.get(focusedTrackId)
  const componentLabel = track?.componentLabel ?? "Component"
  const activeChannel = track?.channels.find((c) => c.id === focusedChannelId)
  const channelLabel =
    focusedChannelId === "all"
      ? "All Channels"
      : (activeChannel?.label ?? focusedChannelId)

  const pairedTrackId = React.useMemo(() => {
    return getPairedTrackId(focusedTrackId)
  }, [focusedTrackId])

  const isInPhase = React.useMemo(() => {
    const [, phase] = focusedTrackId.split(":")
    return phase === "open" || phase === "enter" || phase === "press"
  }, [focusedTrackId])

  // Click-outside listener for dropdown menus
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        componentMenuRef.current &&
        !componentMenuRef.current.contains(event.target as Node)
      ) {
        setIsComponentMenuOpen(false)
      }
      if (
        channelMenuRef.current &&
        !channelMenuRef.current.contains(event.target as Node)
      ) {
        setIsChannelMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsComponentMenuOpen(false)
        setIsChannelMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleToggleMode = React.useCallback(
    (mode: "component" | "primitives") => {
      setCustomizePreviewMode(mode)
      // Sync guarantee: when switching to primitives, if working curve exists,
      // update draft to push active curve math across primitives:all channels
      if (mode === "primitives" && draftCurve?.workingCurve) {
        updateDraft({})
      }
    },
    [setCustomizePreviewMode, draftCurve, updateDraft]
  )

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[16px] bg-muted p-3 select-none",
        className
      )}
    >
      {/* Top Header Row: Symmetrical Left & Right Blocks */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        {/* Left Side: Component + Phase + Channel (in Component mode) OR Primitives Filter (in Primitives mode) */}
        {customizePreviewMode === "component" ? (
          <div className="flex items-center gap-1.5">
            {/* 1. Component Switcher Dropdown */}
            <div className="relative" ref={componentMenuRef}>
              <button
                type="button"
                onClick={() => setIsComponentMenuOpen((v) => !v)}
                aria-label="Select interactive component"
                aria-expanded={isComponentMenuOpen}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-heading text-[11px] font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
              >
                <span>{componentLabel}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className={cn(
                    "size-3 text-muted-foreground transition-transform",
                    isComponentMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {isComponentMenuOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 flex w-48 flex-col gap-0.5 rounded-[12px] bg-background p-1 select-none">
                  <span className="px-2 py-1 font-sans text-[10px] text-muted-foreground uppercase">
                    Components
                  </span>
                  {components.map((comp) => {
                    const isSelected = comp.componentId === track?.componentId
                    const firstTrack = comp.tracks[0]
                    return (
                      <button
                        key={comp.componentId}
                        type="button"
                        aria-label={`Select ${comp.componentLabel} component`}
                        onClick={() => {
                          if (firstTrack) {
                            focusTrack(firstTrack.id)
                            enterCustomize()
                          }
                          setIsComponentMenuOpen(false)
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-sans text-xs transition-colors",
                          isSelected
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span>{comp.componentLabel}</span>
                        {isSelected && (
                          <span className="size-1.5 rounded-full bg-foreground" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Phase Toggle (In | Out) */}
            {pairedTrackId && (
              <div className="flex items-center rounded-[8px] bg-background p-0.5">
                <button
                  type="button"
                  aria-label="Switch to In phase"
                  onClick={() => {
                    if (!isInPhase) {
                      focusTrack(pairedTrackId)
                      enterCustomize()
                    }
                  }}
                  className={cn(
                    "h-6 cursor-pointer rounded-[6px] px-2 font-sans text-[11px] font-medium transition-colors",
                    isInPhase
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  In
                </button>
                <button
                  type="button"
                  aria-label="Switch to Out phase"
                  onClick={() => {
                    if (isInPhase) {
                      focusTrack(pairedTrackId)
                      enterCustomize()
                    }
                  }}
                  className={cn(
                    "h-6 cursor-pointer rounded-[6px] px-2 font-sans text-[11px] font-medium transition-colors",
                    !isInPhase
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Out
                </button>
              </div>
            )}

            {/* 3. Scalable Channel Dropdown */}
            <div className="relative" ref={channelMenuRef}>
              <button
                type="button"
                onClick={() => setIsChannelMenuOpen((v) => !v)}
                aria-label="Select target channel"
                aria-expanded={isChannelMenuOpen}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-sans text-[11px] font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
              >
                <span>{channelLabel}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className={cn(
                    "size-3 text-muted-foreground transition-transform",
                    isChannelMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {isChannelMenuOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 flex w-44 flex-col gap-0.5 rounded-[12px] bg-background p-1 select-none">
                  <span className="px-2 py-1 font-sans text-[10px] text-muted-foreground uppercase">
                    Channels
                  </span>
                  <button
                    type="button"
                    aria-label="Target All channels"
                    onClick={() => {
                      focusChannel("all")
                      enterCustomize()
                      setIsChannelMenuOpen(false)
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-sans text-xs transition-colors",
                      focusedChannelId === "all"
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>All Channels</span>
                    {focusedChannelId === "all" && (
                      <span className="size-1.5 rounded-full bg-foreground" />
                    )}
                  </button>
                  {track?.channels.map((channel) => {
                    const isSelected = channel.id === focusedChannelId
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        aria-label={`Target ${channel.label} channel`}
                        onClick={() => {
                          focusChannel(channel.id)
                          enterCustomize()
                          setIsChannelMenuOpen(false)
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-sans text-xs transition-colors",
                          isSelected
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span>{channel.label}</span>
                        {isSelected && (
                          <span className="size-1.5 rounded-full bg-foreground" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Primitives Filter Pill (aligned naturally with the header) */
          <div className="flex items-center rounded-[10px] bg-background p-0.5">
            {(["all", "position", "scale", "opacity", "rotate"] as const).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-label={`Filter ${filter} primitive`}
                  onClick={() => setPrimitivesFilter(filter)}
                  className={cn(
                    "h-6 cursor-pointer rounded-[8px] px-2 font-sans text-[11px] font-medium capitalize transition-colors",
                    primitivesFilter === filter
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        )}

        {/* Right Side: Mode Toggle (Component | Primitives) */}
        <div className="flex items-center rounded-[10px] bg-background p-0.5">
          <button
            type="button"
            aria-label="Switch to Component preview"
            onClick={() => handleToggleMode("component")}
            className={cn(
              "h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-xs font-medium transition-colors",
              customizePreviewMode === "component"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Component
          </button>
          <button
            type="button"
            aria-label="Switch to Primitives X-Ray preview"
            onClick={() => handleToggleMode("primitives")}
            className={cn(
              "h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-xs font-medium transition-colors",
              customizePreviewMode === "primitives"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Primitives
          </button>
        </div>
      </div>

      {/* Main Stage Body (Fills 100% of available space) */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {customizePreviewMode === "component" ? (
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[12px] bg-background contain-paint">
            <HabitatStage />
          </div>
        ) : (
          <PrimitivesXRay
            filter={primitivesFilter}
            onFilterChange={setPrimitivesFilter}
            showFilterBar={false}
          />
        )}
      </div>
    </div>
  )
}
