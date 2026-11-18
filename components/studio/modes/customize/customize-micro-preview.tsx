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
import { ArrowDown01Icon, Layers01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion, AnimatePresence, LayoutGroup } from "motion/react"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"
import { useEaseStore } from "@/hooks/use-ease-store"
import {
  trackRegistry,
  getPairedTrackId,
  listComponents,
  TrackCategory,
} from "@/core"
import { PrimitivesXRay, type PrimitiveFilter } from "./primitives-xray"
import { cn } from "@/lib/utils"
import {
  SATISIUM_EASE_DECEL,
  SATISIUM_EASE_ACCEL,
  SATISIUM_SPRING_PILL,
  SATISIUM_PRESS_CLASS,
} from "@/lib/motion"

const downwardPopoverVariants = {
  initial: { opacity: 0, scale: 0.95, y: -4, filter: "blur(2px)" },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.15, ease: SATISIUM_EASE_DECEL },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -2,
    filter: "blur(2px)",
    transition: { duration: 0.11, ease: SATISIUM_EASE_ACCEL },
  },
} as const

export interface CustomizeMicroPreviewProps {
  className?: string
}

const COMPONENT_CATEGORIES: readonly TrackCategory[] = [
  "Overlays",
  "Controls",
  "Disclosure",
  "Landing",
] as const

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

  const components = React.useMemo(
    () => listComponents({ includePrimitives: true }),
    []
  )
  const categorizedComponents = React.useMemo(() => {
    const list: { category: TrackCategory; items: typeof components }[] = []
    for (const cat of COMPONENT_CATEGORIES) {
      const items = components.filter((c) => c.category === cat)
      if (items.length > 0) {
        list.push({ category: cat, items })
      }
    }
    return list
  }, [components])
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
                className={cn(
                  "flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-heading text-[11px] font-medium text-foreground transition-colors hover:bg-secondary",
                  SATISIUM_PRESS_CLASS
                )}
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

              <AnimatePresence>
                {isComponentMenuOpen && (
                  <motion.div
                    variants={downwardPopoverVariants}
                    initial="initial"
                    animate="animate"
                    exit={process.env.NODE_ENV === "test" ? undefined : "exit"}
                    className="absolute top-full left-0 z-50 mt-1 no-scrollbar flex max-h-[300px] w-48 origin-top-left flex-col gap-0.5 overflow-y-auto rounded-[12px] bg-background p-1 select-none"
                  >
                    <span className="sr-only">Components</span>
                    {/* Featured Lab / Primitives block */}
                    {(() => {
                      const primComp = components.find(
                        (c) => c.componentId === "primitives"
                      )
                      if (!primComp) return null
                      const isSelected = track?.componentId === "primitives"
                      return (
                        <div className="mb-1.5 rounded-[10px] bg-muted p-1">
                          <div className="flex items-center justify-between px-2 pt-0.5 pb-1">
                            <span className="font-sans text-[10px] font-medium text-muted-foreground">
                              Lab
                            </span>
                            <span className="rounded-[4px] bg-background px-1.5 py-0.5 font-sans text-[9px] font-medium text-muted-foreground">
                              Default
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label="Primitives"
                            onClick={() => {
                              handleToggleMode("primitives")
                              setIsComponentMenuOpen(false)
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left transition-colors",
                              isSelected
                                ? "bg-secondary text-foreground"
                                : "text-foreground hover:bg-secondary"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <HugeiconsIcon
                                icon={Layers01Icon}
                                className="size-3.5 shrink-0 text-foreground"
                              />
                              <span className="font-heading text-xs font-semibold">
                                Primitives
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-[4px] bg-background px-1.5 py-0.5 font-sans text-[9px] font-medium text-muted-foreground">
                                4-in-1
                              </span>
                              {isSelected && (
                                <span className="size-1.5 rounded-full bg-foreground" />
                              )}
                            </div>
                          </button>
                        </div>
                      )
                    })()}

                    {categorizedComponents.map((group) => (
                      <div
                        key={group.category}
                        className="flex flex-col gap-0.5"
                      >
                        <div className="px-2 pt-1.5 pb-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                          {group.category}
                        </div>
                        {group.items.map((comp) => {
                          const isSelected =
                            comp.componentId === track?.componentId
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
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
                    SATISIUM_PRESS_CLASS,
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
                    SATISIUM_PRESS_CLASS,
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
                className={cn(
                  "flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-sans text-[11px] font-medium text-foreground transition-colors hover:bg-secondary",
                  SATISIUM_PRESS_CLASS
                )}
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

              <AnimatePresence>
                {isChannelMenuOpen && (
                  <motion.div
                    variants={downwardPopoverVariants}
                    initial="initial"
                    animate="animate"
                    exit={process.env.NODE_ENV === "test" ? undefined : "exit"}
                    className="absolute top-full left-0 z-50 mt-1 flex w-44 origin-top-left flex-col gap-0.5 rounded-[12px] bg-background p-1 select-none"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
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
                    SATISIUM_PRESS_CLASS,
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
        <LayoutGroup id="customize-preview-mode-toggle">
          <div className="relative flex items-center rounded-[10px] bg-background p-0.5">
            <button
              type="button"
              aria-label="Switch to Component preview"
              onClick={() => handleToggleMode("component")}
              className={cn(
                "relative z-10 h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-xs font-medium transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                customizePreviewMode === "component"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {customizePreviewMode === "component" && (
                <motion.div
                  layoutId="customize-preview-mode-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[8px] bg-secondary"
                />
              )}
              <span className="relative z-20">Component</span>
            </button>
            <button
              type="button"
              aria-label="Switch to Primitives X-Ray preview"
              onClick={() => handleToggleMode("primitives")}
              className={cn(
                "relative z-10 h-7 cursor-pointer rounded-[8px] px-2.5 font-sans text-xs font-medium transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                customizePreviewMode === "primitives"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {customizePreviewMode === "primitives" && (
                <motion.div
                  layoutId="customize-preview-mode-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[8px] bg-secondary"
                />
              )}
              <span className="relative z-20">Primitives</span>
            </button>
          </div>
        </LayoutGroup>
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
