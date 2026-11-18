"use client"

import * as React from "react"
import {
  Exchange01Icon,
  Link01Icon,
  PlusSignIcon,
  Rocket01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface CommandPaletteHabitatProps {
  compareItemId?: string
}

const COMMAND_ACTIONS = [
  {
    id: "new-project",
    label: "Create new project",
    shortcut: "N",
    icon: PlusSignIcon,
  },
  {
    id: "deploy",
    label: "Deploy to production",
    shortcut: "⌘D",
    icon: Rocket01Icon,
  },
  {
    id: "switch-workspace",
    label: "Switch workspace",
    shortcut: "⌘W",
    icon: Exchange01Icon,
  },
  {
    id: "copy-invite",
    label: "Copy invite link",
    shortcut: "⌘L",
    icon: Link01Icon,
  },
] as const

export function CommandPaletteHabitat({
  compareItemId,
}: CommandPaletteHabitatProps = {}) {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Pointer-Events Guard: Prevent invisible scrim/card from blocking clicks underneath
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (overlayRef.current) {
      const cardOpacity = frame.values.opacity ?? 1
      const backdropOpacity = frame.values.backdrop ?? 0
      if (cardOpacity <= 0.01 && backdropOpacity <= 0.01) {
        overlayRef.current.style.pointerEvents = "none"
      } else {
        overlayRef.current.style.pointerEvents = "auto"
      }
    }
  }, [])

  const { bindRef, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "spotlight:open",
    exitTrackId: "spotlight:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const handleOpen = React.useCallback(() => {
    setSelectedIndex(0)
    setQuery("")
    open()
  }, [open])

  const handleClose = React.useCallback(() => {
    setSelectedIndex(0)
    close()
  }, [close])

  const filteredCommands = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMAND_ACTIONS
    return COMMAND_ACTIONS.filter((cmd) => cmd.label.toLowerCase().includes(q))
  }, [query])

  // Keyboard ergonomics: Arrow navigation, Enter select, Escape dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredCommands.length > 0) {
          handleClose()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, filteredCommands, handleClose])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        {/* 1. Calm Resting Trigger: Only centered search trigger button */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleOpen}
            aria-label="Open command palette"
            className="flex h-9 w-[256px] cursor-pointer items-center justify-between rounded-[10px] bg-secondary px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Search01Icon} className="size-3.5" />
              <span className="font-sans text-xs">Search commands...</span>
            </div>
            <span className="rounded-[6px] bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground tabular-nums">
              ⌘ K
            </span>
          </button>
        </div>

        {/* 2. Palette Overlay: Mounted above trigger when isVisible */}
        {isVisible && (
          <div
            ref={overlayRef}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            {/* Precision Scrim / Backdrop (Zero backdrop-blur-*) */}
            <div
              ref={bindRef("backdrop")}
              onClick={handleClose}
              className="absolute inset-0 cursor-pointer bg-black"
            />

            {/* Satisium Borderless Squircle Command Card (Pure 120fps GPU transform + opacity) */}
            <div
              ref={bindRef(["opacity", "translateY", "scale"])}
              role="dialog"
              aria-modal="true"
              aria-label="Command Palette"
              className="relative z-50 w-full max-w-[388px] rounded-[16px] bg-muted p-2 will-change-transform"
            >
              {/* Top Search Bar (autoFocus removed to prevent Frame-1 paint hitch) */}
              <div className="flex h-9.5 items-center gap-2 rounded-[10px] bg-background px-3">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  placeholder="Type a command or search..."
                  aria-label="Search commands"
                  className="h-full flex-1 bg-transparent font-sans text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close command palette"
                  className="cursor-pointer rounded-[6px] bg-secondary px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Esc
                </button>
              </div>

              {/* Actions List */}
              <div
                role="listbox"
                aria-label="Commands"
                className="flex flex-col gap-0.5 pt-1 pb-1"
              >
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        onClick={handleClose}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        aria-label={cmd.label}
                        aria-selected={isSelected}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-2 text-left transition-colors ${
                          isSelected
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-background text-muted-foreground">
                            <HugeiconsIcon
                              icon={cmd.icon}
                              className="size-3.5"
                            />
                          </div>
                          <span className="font-sans text-xs font-medium text-foreground">
                            {cmd.label}
                          </span>
                        </div>
                        <span className="rounded-[4px] bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground tabular-nums">
                          {cmd.shortcut}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="py-6 text-center font-sans text-xs text-muted-foreground">
                    No commands found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
