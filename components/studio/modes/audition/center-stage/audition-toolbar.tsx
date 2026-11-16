"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
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
} from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { SATISIUM_POPOVER_VARIANTS, SATISIUM_PRESS_CLASS } from "@/lib/motion"

export function AuditionToolbar() {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusTrack = useEaseStore((s) => s.focusTrack)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const focusChannel = useEaseStore((s) => s.focusChannel)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const isSolo = useEaseStore((s) => s.isSolo)
  const toggleSolo = useEaseStore((s) => s.toggleSolo)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)

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

  const realComponents = React.useMemo(
    () => components.filter((c) => c.componentId !== "primitives"),
    [components]
  )

  const primitivesComponent = React.useMemo(
    () => components.find((c) => c.componentId === "primitives"),
    [components]
  )

  const currentPlugin = React.useMemo(
    () => getTrackPlugin(focusedTrackId) ?? trackRegistry.list()[0],
    [focusedTrackId]
  )
  const currentChannels = React.useMemo(() => {
    return trackBindings[focusedTrackId] ?? currentPlugin?.channels ?? []
  }, [trackBindings, focusedTrackId, currentPlugin])

  const activeChannel = React.useMemo(() => {
    return currentChannels.find((c) => c.id === focusedChannelId)
  }, [currentChannels, focusedChannelId])

  const channelLabel =
    focusedChannelId === "all"
      ? "All Channels"
      : focusedTrackId === "primitives:all" && focusedChannelId === "position"
        ? "Position"
        : (activeChannel?.label ?? focusedChannelId)

  const componentDisplayLabel =
    currentPlugin?.componentId === "primitives"
      ? "Primitives"
      : (currentPlugin?.componentLabel ?? "Modal Dialog")

  const pairedTrackId = React.useMemo(
    () => getPairedTrackId(focusedTrackId),
    [focusedTrackId]
  )

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
              className="absolute bottom-full left-0 z-50 mb-2 flex w-48 origin-bottom-left flex-col gap-0.5 rounded-[12px] bg-card p-1 select-none"
            >
              <span className="px-2.5 py-1 font-sans text-[10px] text-muted-foreground uppercase">
                Components
              </span>
              {realComponents.map((comp) => {
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

              {primitivesComponent && (
                <>
                  <div className="my-1 h-px bg-muted" />
                  {(() => {
                    const isSelected =
                      primitivesComponent.componentId ===
                      currentPlugin?.componentId
                    const firstTrack = primitivesComponent.tracks[0]
                    return (
                      <button
                        key={primitivesComponent.componentId}
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
                        aria-label="Primitives"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Primitives</span>
                          {isSelected && (
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="size-3 text-foreground"
                            />
                          )}
                        </div>
                        <span className="font-sans text-[10px] text-muted-foreground">
                          Lab
                        </span>
                      </button>
                    )
                  })()}
                </>
              )}
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
              <button
                type="button"
                aria-label="Target All channels"
                onClick={() => {
                  focusChannel("all")
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

      {/* 4. Solo Toggle (S) — Disabled when focusedChannelId === 'all' */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSolo}
            disabled={focusedChannelId === "all"}
            aria-label="Toggle channel solo"
            className={cn(
              "flex h-8 cursor-pointer items-center justify-center rounded-[10px] px-2.5 font-sans text-[11px] font-medium transition-colors outline-none",
              SATISIUM_PRESS_CLASS,
              isSolo
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground",
              focusedChannelId === "all" &&
                "cursor-not-allowed opacity-40 hover:bg-muted hover:text-muted-foreground"
            )}
          >
            Solo
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="flex items-center gap-1.5 text-xs"
        >
          <span>
            {focusedChannelId === "all"
              ? "Select a specific channel to solo"
              : isSolo
                ? "Solo Active: Isolating channel"
                : "Solo Channel"}
          </span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-sans text-[10px] text-muted-foreground">
            S
          </kbd>
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
