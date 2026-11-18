"use client"

import * as React from "react"
import {
  ArchiveIcon,
  ArrowDown01Icon,
  Copy01Icon,
  Download01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface DropdownHabitatProps {
  compareItemId?: string
}

interface ActionItem {
  id: string
  label: string
  shortcut: string
  icon: typeof Copy01Icon
  destructive?: boolean
}

const ACTION_ITEMS: ActionItem[] = [
  { id: "duplicate", label: "Duplicate", shortcut: "⌘D", icon: Copy01Icon },
  { id: "copy-link", label: "Copy link", shortcut: "⌘L", icon: Link01Icon },
  {
    id: "export-json",
    label: "Export JSON",
    shortcut: "⌘E",
    icon: Download01Icon,
  },
  {
    id: "archive",
    label: "Archive",
    shortcut: "⌫",
    icon: ArchiveIcon,
    destructive: true,
  },
]

export function DropdownHabitat({ compareItemId }: DropdownHabitatProps = {}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Pointer-Events Guard: Prevent invisible menu from blocking clicks
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (!menuRef.current) return
    const opacity = frame.values.opacity ?? 1
    if (opacity <= 0.01) {
      menuRef.current.style.pointerEvents = "none"
    } else {
      menuRef.current.style.pointerEvents = "auto"
    }
  }, [])

  const { bindRef, isOpen, isVisible, open, close } = usePairedHabitat({
    enterTrackId: "dropdown:open",
    exitTrackId: "dropdown:close",
    onFrame: handleFrame,
    compareItemId,
  })

  const bindMenu = bindRef(["opacity", "translateY", "scale"])
  const setMenuRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      menuRef.current = el
      bindMenu(el)
    },
    [bindMenu]
  )

  // Handle outside click and Escape dismissal
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    }
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("pointerdown", handlePointerDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isOpen, close])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        <div
          ref={containerRef}
          className="relative inline-flex flex-col items-start"
        >
          {/* Anchored Toggle Trigger */}
          <button
            type="button"
            onClick={() => (isOpen ? close() : open())}
            aria-label="Toggle actions menu"
            aria-expanded={isOpen}
            className="inline-flex h-8.5 cursor-pointer items-center gap-2 rounded-[9px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <span>Actions</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Anchored Popover Menu Surface */}
          {isVisible && (
            <div
              ref={setMenuRef}
              role="menu"
              aria-label="Context actions"
              className="absolute top-full left-0 z-40 mt-1.5 w-48 origin-top-left rounded-[12px] bg-secondary p-1 will-change-transform"
            >
              <div className="flex flex-col gap-0.5">
                {ACTION_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    aria-label={item.label}
                    onClick={close}
                    className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left transition-colors hover:bg-background"
                  >
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={item.icon}
                        className={`size-3.5 shrink-0 ${
                          item.destructive
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`font-sans text-xs ${
                          item.destructive
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="font-sans text-[10px] text-muted-foreground tabular-nums">
                      {item.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
