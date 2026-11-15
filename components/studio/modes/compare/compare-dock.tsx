"use client"

import * as React from "react"
import { listComponents, trackRegistry, getPairedTrackId } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

export function CompareDock() {
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const setGlobalCompareTarget = useEaseStore((s) => s.setGlobalCompareTarget)
  const playScoped = useEaseStore((s) => s.playScoped)
  const interruptActive = useEaseStore((s) => s.interruptActive)
  const exitCompare = useEaseStore((s) => s.exitCompare)

  const [isComponentMenuOpen, setIsComponentMenuOpen] = React.useState(false)
  const [isChannelMenuOpen, setIsChannelMenuOpen] = React.useState(false)

  const compMenuRef = React.useRef<HTMLDivElement>(null)
  const chanMenuRef = React.useRef<HTMLDivElement>(null)

  // Close menus on outside click or Escape
  React.useEffect(() => {
    if (!isComponentMenuOpen && !isChannelMenuOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (
        compMenuRef.current &&
        !compMenuRef.current.contains(e.target as Node)
      ) {
        setIsComponentMenuOpen(false)
      }
      if (
        chanMenuRef.current &&
        !chanMenuRef.current.contains(e.target as Node)
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

  const components = React.useMemo(
    () => listComponents({ includePrimitives: true }),
    []
  )
  const currentTrack = React.useMemo(
    () =>
      trackRegistry.get(globalCompareTarget.trackId) ?? trackRegistry.list()[0],
    [globalCompareTarget.trackId]
  )
  const currentChannels = React.useMemo(() => {
    return (
      trackBindings[globalCompareTarget.trackId] ?? currentTrack?.channels ?? []
    )
  }, [trackBindings, globalCompareTarget.trackId, currentTrack])

  const pairedTrackId = React.useMemo(
    () => getPairedTrackId(globalCompareTarget.trackId),
    [globalCompareTarget.trackId]
  )
  const hasPairedPhase = Boolean(
    pairedTrackId && pairedTrackId !== globalCompareTarget.trackId
  )

  const isEntranceActive = currentTrack.phase === "enter"
  const enterTrackId = isEntranceActive
    ? globalCompareTarget.trackId
    : (pairedTrackId ?? globalCompareTarget.trackId)
  const exitTrackId = !isEntranceActive
    ? globalCompareTarget.trackId
    : (pairedTrackId ?? globalCompareTarget.trackId)

  const currentGroup = React.useMemo(
    () =>
      components.find((c) => c.componentId === currentTrack.componentId) ??
      components[0],
    [components, currentTrack.componentId]
  )

  const activeChannelLabel =
    globalCompareTarget.channelId === "all"
      ? "All"
      : (currentChannels.find((c) => c.id === globalCompareTarget.channelId)
          ?.label ?? "All")

  return (
    <div className="mx-auto flex shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-[14px] bg-muted p-1 select-none">
      {/* 1. Component Picker */}
      <div className="relative" ref={compMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsComponentMenuOpen((v) => !v)
            setIsChannelMenuOpen(false)
          }}
          aria-label="Select global comparison component"
          aria-expanded={isComponentMenuOpen}
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
        >
          <span>{currentGroup?.componentLabel ?? "Modal Dialog"}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              isComponentMenuOpen && "rotate-180"
            )}
          />
        </button>

        {isComponentMenuOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 flex w-48 flex-col gap-0.5 rounded-[12px] bg-card p-1">
            <span className="px-2 py-0.5 font-sans text-[10px] text-muted-foreground uppercase">
              Components
            </span>
            {components.map((comp) => {
              const isSelected = comp.componentId === currentGroup?.componentId
              const firstTrack = comp.tracks[0]
              return (
                <button
                  key={comp.componentId}
                  type="button"
                  onClick={() => {
                    if (firstTrack) {
                      setGlobalCompareTarget({
                        trackId: firstTrack.id,
                        channelId: "all",
                      })
                    }
                    setIsComponentMenuOpen(false)
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1 text-left font-sans text-xs transition-colors",
                    isSelected
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={`Select ${comp.componentLabel}`}
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
        )}
      </div>

      {/* 2. In | Out Phase Toggle */}
      {hasPairedPhase && (
        <div
          role="tablist"
          aria-label="Kinetic phase selection"
          className="flex items-center rounded-[8px] bg-background p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isEntranceActive}
            aria-label="Entrance phase"
            onClick={() => setGlobalCompareTarget({ trackId: enterTrackId })}
            className={cn(
              "flex h-6 cursor-pointer items-center rounded-[6px] px-2 font-sans text-xs transition-colors",
              isEntranceActive
                ? "bg-secondary font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isEntranceActive}
            aria-label="Exit phase"
            onClick={() => setGlobalCompareTarget({ trackId: exitTrackId })}
            className={cn(
              "flex h-6 cursor-pointer items-center rounded-[6px] px-2 font-sans text-xs transition-colors",
              !isEntranceActive
                ? "bg-secondary font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Out
          </button>
        </div>
      )}

      {/* 3. Channel Picker Dropdown */}
      <div className="relative" ref={chanMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsChannelMenuOpen((v) => !v)
            setIsComponentMenuOpen(false)
          }}
          aria-label="Select comparison channel"
          aria-expanded={isChannelMenuOpen}
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
        >
          <span>{activeChannelLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              isChannelMenuOpen && "rotate-180"
            )}
          />
        </button>

        {isChannelMenuOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 flex w-44 flex-col gap-0.5 rounded-[12px] bg-card p-1">
            <span className="px-2 py-0.5 font-sans text-[10px] text-muted-foreground uppercase">
              Channels
            </span>
            <button
              type="button"
              onClick={() => {
                setGlobalCompareTarget({ channelId: "all" })
                setIsChannelMenuOpen(false)
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1 text-left font-sans text-xs transition-colors",
                globalCompareTarget.channelId === "all"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label="Target all channels"
            >
              <span>All Channels</span>
              {globalCompareTarget.channelId === "all" && (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-3 text-foreground"
                />
              )}
            </button>

            {currentChannels.map((ch) => {
              const isSelected = globalCompareTarget.channelId === ch.id
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setGlobalCompareTarget({ channelId: ch.id })
                    setIsChannelMenuOpen(false)
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1 text-left font-sans text-xs transition-colors",
                    isSelected
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={`Target ${ch.label} channel`}
                >
                  <span>{ch.label}</span>
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
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* 4. Trigger All */}
      <button
        type="button"
        onClick={() => playScoped()}
        aria-label="Trigger all compare tiles"
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-foreground px-3 font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
      >
        <span>Trigger All</span>
        <span className="rounded-[4px] bg-muted px-1 py-0.5 font-sans text-[9px] text-foreground tabular-nums">
          Space
        </span>
      </button>

      {/* 5. Interrupt */}
      <button
        type="button"
        onClick={() => interruptActive()}
        aria-label="Interrupt mid-flight transition"
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-background px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
      >
        <span>Interrupt</span>
        <span className="rounded-[4px] bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground">
          I
        </span>
      </button>

      {/* 6. Done */}
      <button
        type="button"
        onClick={() => exitCompare()}
        aria-label="Exit compare mode"
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] bg-secondary px-2.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-background active:scale-95"
      >
        <span>Done</span>
        <span className="rounded-[4px] bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground">
          Esc
        </span>
      </button>
    </div>
  )
}
