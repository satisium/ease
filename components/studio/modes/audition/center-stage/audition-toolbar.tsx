"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Layers01Icon,
  RotateLeft01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion, AnimatePresence } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  listComponents,
  getPairedTrackId,
  getTrackPlugin,
  trackRegistry,
  TrackCategory,
  ChannelBinding,
  EaseCurve,
  TransitionTrackPlugin,
} from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { SATISIUM_POPOVER_VARIANTS, SATISIUM_PRESS_CLASS } from "@/lib/motion"

function areCurvesMathEqual(a: EaseCurve, b: EaseCurve): boolean {
  if (a.engine !== b.engine) return false
  if (a.engine === "spring") {
    return (
      Math.abs(a.spring.stiffness - b.spring.stiffness) < 1e-4 &&
      Math.abs(a.spring.damping - b.spring.damping) < 1e-4 &&
      Math.abs(a.spring.mass - b.spring.mass) < 1e-4
    )
  }
  return (
    Math.abs(a.bezier.p1.x - b.bezier.p1.x) < 1e-4 &&
    Math.abs(a.bezier.p1.y - b.bezier.p1.y) < 1e-4 &&
    Math.abs(a.bezier.p2.x - b.bezier.p2.x) < 1e-4 &&
    Math.abs(a.bezier.p2.y - b.bezier.p2.y) < 1e-4
  )
}

function isChannelModified(
  channel: ChannelBinding,
  defaultChannel: ChannelBinding
): boolean {
  if (channel.durationMs !== defaultChannel.durationMs) return true
  if (channel.delayMs !== defaultChannel.delayMs) return true
  if (channel.springMode !== defaultChannel.springMode) return true
  if (channel.curve.id !== defaultChannel.curve.id) return true
  if (!areCurvesMathEqual(channel.curve, defaultChannel.curve)) return true
  return false
}

const COMPONENT_CATEGORIES: readonly TrackCategory[] = [
  "Overlays",
  "Controls",
  "Disclosure",
  "Landing",
] as const

export function AuditionToolbar() {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusTrack = useEaseStore((s) => s.focusTrack)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const focusChannel = useEaseStore((s) => s.focusChannel)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)
  const resetTrack = useEaseStore((s) => s.resetTrack)

  const [isComponentMenuOpen, setIsComponentMenuOpen] = React.useState(false)
  const [isChannelMenuOpen, setIsChannelMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const channelMenuRef = React.useRef<HTMLDivElement>(null)

  // Close menus on outside click or Escape key
  React.useEffect(() => {
    if (!isComponentMenuOpen && !isChannelMenuOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (
        isComponentMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsComponentMenuOpen(false)
      }
      if (
        isChannelMenuOpen &&
        channelMenuRef.current &&
        !channelMenuRef.current.contains(e.target as Node)
      ) {
        setIsChannelMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsComponentMenuOpen(false)
        setIsChannelMenuOpen(false)
      }
    }
    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isComponentMenuOpen, isChannelMenuOpen])

  // Track & Channel Resolutions
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

  const currentPlugin = React.useMemo(
    () => getTrackPlugin(focusedTrackId) ?? trackRegistry.list()[0],
    [focusedTrackId]
  )
  const currentChannels = React.useMemo(() => {
    return trackBindings[focusedTrackId] ?? currentPlugin?.channels ?? []
  }, [trackBindings, focusedTrackId, currentPlugin])

  const activeChannel = React.useMemo(() => {
    return (
      currentChannels.find((c) => c.id === focusedChannelId) ??
      currentChannels.find((c) => c.property !== "opacity") ??
      currentChannels[0]
    )
  }, [currentChannels, focusedChannelId])

  const channelLabel =
    focusedTrackId === "primitives:all" &&
    (focusedChannelId === "position" || focusedChannelId === "all")
      ? "Position"
      : (activeChannel?.label ?? focusedChannelId)

  const componentDisplayLabel =
    currentPlugin?.componentId === "primitives"
      ? "Primitives"
      : (currentPlugin?.componentLabel ?? "Primitives")

  const pairedTrackId = React.useMemo(
    () => getPairedTrackId(focusedTrackId),
    [focusedTrackId]
  )

  const isTrackModified = React.useMemo(() => {
    if (!currentPlugin) return false
    const checkTrack = (
      trackId: string,
      canonical: TransitionTrackPlugin | undefined
    ) => {
      if (!canonical) return false
      const channels = trackBindings[trackId] ?? canonical.channels
      if (channels.length !== canonical.channels.length) return true
      return channels.some((ch, i) => {
        const defaultCh = canonical.channels[i]
        if (!defaultCh) return true
        return isChannelModified(ch, defaultCh)
      })
    }

    if (checkTrack(focusedTrackId, currentPlugin)) return true
    if (pairedTrackId && pairedTrackId !== focusedTrackId) {
      const pairedPlugin = trackRegistry.get(pairedTrackId)
      if (checkTrack(pairedTrackId, pairedPlugin)) return true
    }
    return false
  }, [currentPlugin, focusedTrackId, pairedTrackId, trackBindings])

  const hasPairedPhase = Boolean(
    pairedTrackId && pairedTrackId !== focusedTrackId
  )
  const enterTrackId =
    currentPlugin?.phase === "enter"
      ? focusedTrackId
      : (pairedTrackId ?? focusedTrackId)
  const exitTrackId =
    currentPlugin?.phase === "exit"
      ? focusedTrackId
      : (pairedTrackId ?? focusedTrackId)
  const isEntranceActive = focusedTrackId === enterTrackId

  return (
    <div className="flex items-center gap-1 rounded-[14px] bg-background p-1 select-none">
      {/* 1. Component Picker Popover Trigger */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setIsComponentMenuOpen((v) => !v)
            setIsChannelMenuOpen(false)
          }}
          aria-label="Select interactive component"
          aria-expanded={isComponentMenuOpen}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] bg-muted px-2.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-secondary",
            SATISIUM_PRESS_CLASS
          )}
        >
          <span>{componentDisplayLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={`size-3 text-muted-foreground transition-transform ${
              isComponentMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isComponentMenuOpen && (
            <motion.div
              variants={SATISIUM_POPOVER_VARIANTS}
              initial="initial"
              animate="animate"
              exit={process.env.NODE_ENV === "test" ? undefined : "exit"}
              className="absolute bottom-full left-0 z-50 mb-2 no-scrollbar flex max-h-[300px] w-48 origin-bottom-left flex-col gap-0.5 overflow-y-auto rounded-[12px] bg-card p-1 select-none"
            >
              <span className="sr-only">Components</span>
              {/* Featured Lab / Primitives block */}
              {(() => {
                const primComp = components.find(
                  (c) => c.componentId === "primitives"
                )
                if (!primComp) return null
                const isSelected = currentPlugin?.componentId === "primitives"
                const firstTrack = primComp.tracks[0]
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
                        if (firstTrack) {
                          focusTrack(firstTrack.id)
                        }
                        setIsComponentMenuOpen(false)
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left transition-colors",
                        isSelected
                          ? "bg-background text-foreground"
                          : "text-foreground hover:bg-background"
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
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            className="size-3 text-foreground"
                          />
                        )}
                      </div>
                    </button>
                  </div>
                )
              })()}

              {categorizedComponents.map((group) => (
                <div key={group.category} className="flex flex-col gap-0.5">
                  <div className="px-2 pt-1.5 pb-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                    {group.category}
                  </div>
                  {group.items.map((comp) => {
                    const isSelected =
                      comp.componentId === currentPlugin?.componentId
                    const firstTrack = comp.tracks[0]
                    return (
                      <button
                        key={comp.componentId}
                        type="button"
                        onClick={() => {
                          if (firstTrack) {
                            focusTrack(firstTrack.id)
                          }
                          setIsComponentMenuOpen(false)
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-sans text-xs transition-colors",
                          isSelected
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-label={comp.componentLabel}
                      >
                        <span>{comp.componentLabel}</span>
                        {isSelected && (
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            className="size-3 text-foreground"
                          />
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

      {/* 2. Semantic Phase Switcher (Entrance | Exit) */}
      {hasPairedPhase && (
        <div
          role="tablist"
          aria-label="Kinetic phase selection"
          className="flex items-center rounded-[10px] bg-muted p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isEntranceActive}
            aria-label="Entrance phase"
            onClick={() => focusTrack(enterTrackId)}
            className={cn(
              "flex h-7 cursor-pointer items-center rounded-[8px] px-2 font-sans text-[11px] transition-colors",
              SATISIUM_PRESS_CLASS,
              isEntranceActive
                ? "bg-background font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Entrance
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isEntranceActive}
            aria-label="Exit phase"
            onClick={() => focusTrack(exitTrackId)}
            className={cn(
              "flex h-7 cursor-pointer items-center rounded-[8px] px-2 font-sans text-[11px] transition-colors",
              SATISIUM_PRESS_CLASS,
              !isEntranceActive
                ? "bg-background font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Exit
          </button>
        </div>
      )}

      {/* 3. Unified Channel Dropdown */}
      <div className="relative" ref={channelMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsChannelMenuOpen((v) => !v)
            setIsComponentMenuOpen(false)
          }}
          aria-label="Select kinetic channel"
          aria-expanded={isChannelMenuOpen}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] bg-muted px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-secondary",
            SATISIUM_PRESS_CLASS
          )}
        >
          <span>{channelLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              isChannelMenuOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isChannelMenuOpen && (
            <motion.div
              variants={SATISIUM_POPOVER_VARIANTS}
              initial="initial"
              animate="animate"
              exit={process.env.NODE_ENV === "test" ? undefined : "exit"}
              className="absolute bottom-full left-0 z-50 mb-2 flex w-56 origin-bottom-left flex-col gap-0.5 rounded-[14px] bg-card p-1.5 select-none"
            >
              <span className="px-2 py-1 font-sans text-[10px] font-semibold text-muted-foreground uppercase">
                Channels
              </span>
              {currentChannels.map((ch) => {
                const isSelected = ch.id === focusedChannelId
                const displayLabel =
                  focusedTrackId === "primitives:all" && ch.id === "position"
                    ? "Position"
                    : ch.label
                return (
                  <button
                    key={ch.id}
                    type="button"
                    aria-label={`${displayLabel} channel`}
                    onClick={() => {
                      focusChannel(ch.id)
                      setIsChannelMenuOpen(false)
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left font-sans text-xs transition-colors",
                      isSelected
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{displayLabel}</span>
                    <span className="font-sans text-[10px] text-muted-foreground tabular-nums">
                      {ch.curve.name} · {ch.durationMs}ms
                    </span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Reset Component to Defaults */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => resetTrack(focusedTrackId)}
            disabled={!isTrackModified}
            aria-label="Reset component to default curves"
            className={cn(
              "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-muted text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground",
              SATISIUM_PRESS_CLASS,
              !isTrackModified &&
                "cursor-not-allowed opacity-40 hover:bg-muted hover:text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={RotateLeft01Icon} className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <span>
            {isTrackModified
              ? "Reset component to default curves"
              : "Default curves active"}
          </span>
        </TooltipContent>
      </Tooltip>

      {/* 5. Customize (Tune) Squircle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={enterCustomize}
            aria-label="Customize curve"
            className={cn(
              "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-secondary text-foreground transition-colors hover:bg-muted",
              SATISIUM_PRESS_CLASS
            )}
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="flex items-center gap-1.5 text-xs"
        >
          <span>Customize curve in Canvas</span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-sans text-[10px] text-muted-foreground">
            2
          </kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
