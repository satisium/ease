"use client"

import * as React from "react"
import {
  Refresh03Icon,
  LaptopIcon,
  Tablet01Icon,
  SmartPhone01Icon,
  GitCompareIcon,
  SlidersHorizontalIcon,
  ArrowUpRight01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CursorPointer01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion, LayoutGroup } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  getArchetypeManifest,
  MotionSlotDefinition,
} from "@/components/studio/domain/archetype-registry"
import { resolveEase } from "@/components/studio/domain/studio-kinetics"
import { useStudioStore, ViewportMode } from "@/store/useStudioStore"

function getSlotIcon(iconType?: MotionSlotDefinition["iconType"]) {
  switch (iconType) {
    case "in":
      return ArrowDown01Icon
    case "out":
      return ArrowUp01Icon
    case "slide":
      return SlidersHorizontalIcon
    case "press":
      return CursorPointer01Icon
    default:
      return ArrowDown01Icon
  }
}

export function AuditionToolbar() {
  const viewportMode = useStudioStore((s) => s.viewportMode)
  const setViewportMode = useStudioStore((s) => s.setViewportMode)
  const setPreviewWidth = useStudioStore((s) => s.setPreviewWidth)
  const activeScenarioKey = useStudioStore((s) => s.activeScenarioKey)
  const scenarioSlots = useStudioStore((s) => s.scenarioSlots)
  const activeSlotId = useStudioStore((s) => s.activeSlotId)
  const setActiveSlotId = useStudioStore((s) => s.setActiveSlotId)
  const activeChannelId = useStudioStore((s) => s.activeChannelId)
  const setActiveChannelId = useStudioStore((s) => s.setActiveChannelId)
  const scenarioChannelSlots = useStudioStore((s) => s.scenarioChannelSlots)
  const discoveredChannels = useStudioStore((s) => s.discoveredChannels)
  const customCurves = useStudioStore((s) => s.customCurves)
  const triggerAudition = useStudioStore((s) => s.triggerAudition)
  const isTimelineOpen = useStudioStore((s) => s.isTimelineOpen)
  const toggleTimeline = useStudioStore((s) => s.toggleTimeline)
  const compareQueue = useStudioStore((s) => s.compareQueue)
  const activeCurveId = useStudioStore((s) => s.activeCurveId)
  const toggleCompare = useStudioStore((s) => s.toggleCompare)
  const setMode = useStudioStore((s) => s.setMode)

  const isCurrentCurveQueued = compareQueue.includes(activeCurveId)

  const manifest = React.useMemo(
    () => getArchetypeManifest(activeScenarioKey),
    [activeScenarioKey]
  )

  const slotsWithCurves = React.useMemo(() => {
    const currentSlotsRecord = scenarioSlots[activeScenarioKey] || {}
    const slots = manifest?.slots || [
      {
        id: "enter",
        label: "Entrance",
        description: "Arrival ease",
        defaultCurveId: "modal-sheet",
        iconType: "in" as const,
      },
    ]

    return slots.map((slotDef) => {
      const assignedCurveId =
        currentSlotsRecord[slotDef.id] ||
        (slotDef.id === "enter"
          ? currentSlotsRecord.enterId
          : slotDef.id === "exit"
            ? currentSlotsRecord.exitId
            : undefined) ||
        slotDef.defaultCurveId

      const curve = resolveEase(assignedCurveId, customCurves)
      return {
        ...slotDef,
        assignedCurveId,
        curve,
      }
    })
  }, [manifest, activeScenarioKey, scenarioSlots, customCurves])

  const activeSlotDef = React.useMemo(() => {
    return (
      manifest?.slots.find((s) => s.id === activeSlotId) ?? manifest?.slots[0]
    )
  }, [manifest, activeSlotId])

  const channelsWithCurves = React.useMemo(() => {
    const detected = discoveredChannels?.[activeScenarioKey]?.[activeSlotId]
    const rawChannels =
      detected && detected.length > 0 ? detected : activeSlotDef?.channels || []
    const slotChannelAssignments =
      scenarioChannelSlots?.[activeScenarioKey]?.[activeSlotId] || {}

    return rawChannels.map((ch) => {
      const assignedCurveId = slotChannelAssignments[ch.id] || ch.defaultCurveId
      const curve = resolveEase(assignedCurveId, customCurves)
      return {
        ...ch,
        assignedCurveId,
        curve,
      }
    })
  }, [
    discoveredChannels,
    activeSlotDef,
    scenarioChannelSlots,
    activeScenarioKey,
    activeSlotId,
    customCurves,
  ])

  const handleViewportChange = (mode: ViewportMode) => {
    setViewportMode(mode)
    if (mode === "desktop") setPreviewWidth("100%")
    if (mode === "tablet") setPreviewWidth(768)
    if (mode === "mobile") setPreviewWidth(375)
  }

  return (
    <div className="absolute bottom-3 left-3 z-30 flex max-w-[calc(100vw-24px)] scrollbar-none items-center gap-1.5 overflow-x-auto rounded-[14px] bg-background p-1 select-none">
      {/* Viewport switcher: Desktop / Tablet / Mobile */}
      <LayoutGroup id="audition-viewport">
        <div className="relative flex shrink-0 items-center rounded-[10px] bg-muted p-0.5">
          {[
            {
              mode: "desktop" as const,
              icon: LaptopIcon,
              label: "Desktop",
            },
            {
              mode: "tablet" as const,
              icon: Tablet01Icon,
              label: "Tablet",
            },
            {
              mode: "mobile" as const,
              icon: SmartPhone01Icon,
              label: "Mobile",
            },
          ].map((item) => {
            const isActive = viewportMode === item.mode
            return (
              <Tooltip key={item.mode}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleViewportChange(item.mode)}
                    className={cn(
                      "relative z-10 flex size-8 cursor-pointer items-center justify-center rounded-[8px] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="audition-viewport-pill"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                        className="absolute inset-0 rounded-[8px] bg-background"
                      />
                    )}
                    <span className="relative z-20">
                      <HugeiconsIcon icon={item.icon} className="size-4" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span>{item.label} View</span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </LayoutGroup>

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* Single Archetype Component Badge */}
      <div className="flex h-7 shrink-0 items-center rounded-[8px] bg-muted px-2.5 font-heading text-xs font-medium text-foreground select-none">
        Dialog
      </div>

      {/* Kinetic Slot Badges (Semantic Phase Switcher: Entrance vs Exit) */}
      {slotsWithCurves.length > 1 ? (
        <LayoutGroup id="audition-slots">
          <div
            role="tablist"
            aria-label="Kinetic phase selection"
            className="relative flex shrink-0 items-center rounded-[10px] bg-muted p-0.5"
          >
            {slotsWithCurves.map((slot) => {
              const isSlotActive = activeSlotId === slot.id
              const Icon = getSlotIcon(slot.iconType)
              return (
                <Tooltip key={slot.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isSlotActive}
                      onClick={() => setActiveSlotId(slot.id)}
                      className={cn(
                        "relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 font-sans text-[11px] tracking-tight transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        isSlotActive
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSlotActive && (
                        <motion.div
                          layoutId="audition-slot-pill"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                          className="absolute inset-0 rounded-[8px] bg-background shadow-xs"
                        />
                      )}
                      <span className="relative z-20 flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={Icon}
                          className={cn(
                            "size-3 shrink-0",
                            isSlotActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{slot.label}</span>
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span>
                      {slot.label} Phase · Active Curve:{" "}
                      <span className="font-medium text-foreground">
                        {slot.curve.name}
                      </span>
                    </span>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </LayoutGroup>
      ) : slotsWithCurves.length === 1 ? (
        <div
          role="tablist"
          aria-label="Kinetic phase selection"
          className="flex shrink-0 items-center rounded-[10px] bg-muted p-0.5"
        >
          {slotsWithCurves.map((slot) => {
            const Icon = getSlotIcon(slot.iconType)
            return (
              <Tooltip key={slot.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={true}
                    onClick={() => setActiveSlotId(slot.id)}
                    className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-sans text-[11px] font-medium tracking-tight text-foreground shadow-xs transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <HugeiconsIcon
                      icon={Icon}
                      className="size-3 text-foreground"
                    />
                    <span className="truncate">{slot.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span>
                    {slot.label} Phase · Active Curve:{" "}
                    <span className="font-medium text-foreground">
                      {slot.curve.name}
                    </span>
                  </span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ) : null}

      {/* Kinetic Channel Strip (Multi-Target Property Tuning) */}
      {channelsWithCurves.length > 0 && (
        <>
          <div className="h-4 w-px shrink-0 bg-border" />
          <LayoutGroup id="audition-channels">
            <div
              role="tablist"
              aria-label="Kinetic channel selection"
              className="relative flex shrink-0 items-center rounded-[10px] bg-muted p-0.5"
            >
              {/* All (Master) Chip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeChannelId === "all"}
                    onClick={() => setActiveChannelId("all")}
                    className={cn(
                      "relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 font-sans text-[11px] tracking-tight transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      activeChannelId === "all"
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {activeChannelId === "all" && (
                      <motion.div
                        layoutId="audition-channel-pill"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                        className="absolute inset-0 rounded-[8px] bg-background shadow-xs"
                      />
                    )}
                    <span className="relative z-20">All</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span>
                    Master Channel ({activeSlotDef?.label} · All Properties)
                  </span>
                </TooltipContent>
              </Tooltip>

              {/* Individual Kinetic Channel Chips */}
              {channelsWithCurves.map((ch) => {
                const isChannelActive = activeChannelId === ch.id
                return (
                  <Tooltip key={ch.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isChannelActive}
                        onClick={() => setActiveChannelId(ch.id)}
                        className={cn(
                          "relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 font-sans text-[11px] tracking-tight transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          isChannelActive
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isChannelActive && (
                          <motion.div
                            layoutId="audition-channel-pill"
                            transition={{
                              type: "spring",
                              stiffness: 350,
                              damping: 30,
                            }}
                            className="absolute inset-0 rounded-[8px] bg-background shadow-xs"
                          />
                        )}
                        <span className="relative z-20 flex items-center gap-1">
                          <span>{ch.label}</span>
                          <span className="font-mono text-[9px] text-muted-foreground">
                            {ch.curve.name}
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span>
                        {ch.label} ({ch.property}) ·{" "}
                        <span className="font-medium text-foreground">
                          {ch.curve.name}
                        </span>
                        {ch.role ? ` · ${ch.role}` : ""}
                        {ch.delayMs ? ` · ${ch.delayMs}ms delay` : ""}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </LayoutGroup>
        </>
      )}

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* Replay Animation Action */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={triggerAudition}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-background text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={Refresh03Icon} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>Replay Animation</span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            R
          </kbd>
        </TooltipContent>
      </Tooltip>

      {/* Toggle Master Timeline Scrubber */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleTimeline}
            className={cn(
              "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isTimelineOpen
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>
            {isTimelineOpen
              ? "Hide Timeline Scrubber"
              : "Reveal Timeline Scrubber"}
          </span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            T
          </kbd>
        </TooltipContent>
      </Tooltip>

      {/* Customize in Stage 2 / Customize Mode */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setMode("customize")}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-background text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>Customize Parameters</span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            2
          </kbd>
        </TooltipContent>
      </Tooltip>

      {/* Add to Compare Queue Action */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => toggleCompare(activeCurveId)}
            className={cn(
              "relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isCurrentCurveQueued
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={GitCompareIcon} className="size-4" />
            {compareQueue.length > 0 && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full font-mono text-[9px] font-semibold",
                  isCurrentCurveQueued
                    ? "bg-background text-foreground"
                    : "bg-foreground text-background"
                )}
              >
                {compareQueue.length}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>
            {isCurrentCurveQueued
              ? `Queued for Compare (${compareQueue.length}/3) · Click to remove`
              : `Add to Compare Queue (${compareQueue.length}/3)`}
          </span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            C
          </kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
