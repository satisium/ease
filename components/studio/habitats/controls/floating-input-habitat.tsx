"use client"

import * as React from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import type { TrackFrameResult } from "@/core"

interface FloatingInputHabitatProps {
  compareItemId?: string
}

export function FloatingInputHabitat({
  compareItemId,
}: FloatingInputHabitatProps) {
  const store = useEaseStoreApi()
  const [value, setValue] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchOpen, setSearchOpen] = React.useState(false)

  const valueRef = React.useRef(value)
  const floatingOpenRef = React.useRef(false)
  const searchOpenRef = React.useRef(false)
  const activeTargetRef = React.useRef<"floating" | "search" | "all">("all")

  React.useEffect(() => {
    valueRef.current = value
  }, [value])

  const labelRef = React.useRef<HTMLLabelElement | null>(null)
  const searchWrapRef = React.useRef<HTMLDivElement | null>(null)
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      const isScrubOrCompare =
        Boolean(compareItemId) ||
        store.conductor.getSnapshot().playbackState === "scrubbing"
      const target = activeTargetRef.current

      const rawLy = frame.values.labelY ?? 0
      const rawLs = frame.values.labelScale ?? 1
      const rawClip = frame.values.searchClip ?? 204

      // 1. Label Lift & Scale
      if (labelRef.current) {
        if (isScrubOrCompare || target === "all" || target === "floating") {
          labelRef.current.style.transform = `translate3d(0px, ${rawLy.toFixed(2)}px, 0px) scale(${rawLs.toFixed(4)})`
        } else {
          const isFloated =
            floatingOpenRef.current || valueRef.current.length > 0
          const ly = isFloated ? -11 : 0
          const ls = isFloated ? 0.78 : 1
          labelRef.current.style.transform = `translate3d(0px, ${ly.toFixed(2)}px, 0px) scale(${ls.toFixed(4)})`
        }
      }

      // 2. Search Clip-Path
      if (searchWrapRef.current) {
        let clipPx: number
        if (isScrubOrCompare || target === "all" || target === "search") {
          clipPx = Math.max(0, Math.min(204, rawClip))
        } else {
          clipPx = searchOpenRef.current ? 0 : 204
        }
        searchWrapRef.current.style.clipPath = `inset(0px 0px 0px ${clipPx.toFixed(2)}px round 10px)`
        if (searchInputRef.current) {
          searchInputRef.current.style.pointerEvents =
            clipPx > 180 ? "none" : "auto"
        }
      }
    },
    [compareItemId, store]
  )

  const { open, close } = usePairedHabitat({
    enterTrackId: "input:focus",
    exitTrackId: "input:blur",
    onFrame: handleFrame,
    compareItemId,
  })

  const handleFocusFloating = React.useCallback(() => {
    activeTargetRef.current = "floating"
    floatingOpenRef.current = true
    open()
  }, [open])

  const handleBlurFloating = React.useCallback(() => {
    if (!valueRef.current) {
      activeTargetRef.current = "floating"
      floatingOpenRef.current = false
      close()
    }
  }, [close])

  const handleToggleSearch = React.useCallback(() => {
    activeTargetRef.current = "search"
    const next = !searchOpenRef.current
    searchOpenRef.current = next
    setSearchOpen(next)
    if (next) {
      open()
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery("")
      close()
    }
  }, [open, close])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex w-full max-w-[264px] flex-col items-center gap-5">
          {/* 1. Floating Label Field */}
          <div className="relative h-11 w-full rounded-[10px] bg-secondary px-3">
            <label
              ref={labelRef}
              htmlFor="floating-workspace-input"
              className="pointer-events-none absolute top-3.5 left-3 origin-left font-sans text-xs text-muted-foreground will-change-transform"
            >
              Workspace name
            </label>
            <input
              id="floating-workspace-input"
              aria-label="Workspace name"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={handleFocusFloating}
              onBlur={handleBlurFloating}
              className="h-full w-full bg-transparent pt-3.5 font-sans text-xs text-foreground outline-none"
            />
          </div>

          {/* 2. Fixed-Width Search Input (240px wide, 36px tall, 204px clipped at rest) */}
          <div className="relative flex h-9 w-[240px] items-center">
            <div
              ref={searchWrapRef}
              style={{ clipPath: "inset(0px 0px 0px 204.00px round 10px)" }}
              className="absolute inset-0 flex items-center rounded-[10px] bg-secondary pr-10 pl-3 will-change-[clip-path]"
            >
              <input
                ref={searchInputRef}
                aria-label="Search components input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent font-sans text-xs text-foreground outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleToggleSearch}
              aria-label={
                searchOpen ? "Collapse search bar" : "Expand search bar"
              }
              className="relative z-10 ml-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] bg-secondary text-foreground active:scale-95"
            >
              <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
