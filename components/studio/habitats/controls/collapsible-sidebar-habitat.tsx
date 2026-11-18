"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  Mail01Icon,
  RepeatIcon,
  Settings02Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface CollapsibleSidebarHabitatProps {
  compareItemId?: string
}

const PRIMARY_NAV_ITEMS = [
  { id: "inbox", label: "Inbox", icon: Mail01Icon },
  { id: "issues", label: "Issues", icon: Task01Icon },
  { id: "cycles", label: "Cycles", icon: RepeatIcon },
] as const

export function CollapsibleSidebarHabitat({
  compareItemId,
}: CollapsibleSidebarHabitatProps = {}) {
  const asideRef = React.useRef<HTMLElement>(null)
  const workspaceRef = React.useRef<HTMLDivElement>(null)
  const triggerWrapRef = React.useRef<HTMLDivElement>(null)
  const chevronRef = React.useRef<HTMLSpanElement>(null)

  // 120fps GPU driver: clip-path expansion, trigger recentering, chevron rotation & label fade
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const clipPx = Math.max(0, frame.values.railClip ?? 54)
    const labelOp = Math.min(1, Math.max(0, frame.values.labelFade ?? 0))
    const openProgress = Math.min(1, Math.max(0, (clipPx - 54) / 102))

    if (workspaceRef.current) {
      workspaceRef.current.style.clipPath = `inset(0px 0px 0px ${clipPx.toFixed(2)}px round 11px)`
    }

    if (triggerWrapRef.current) {
      const offsetX = (clipPx - 54) * 0.5
      triggerWrapRef.current.style.transform = `translate3d(${offsetX.toFixed(2)}px, 0px, 0px)`
    }

    if (chevronRef.current) {
      chevronRef.current.style.transform = `rotate(${(openProgress * 180).toFixed(1)}deg)`
    }

    if (asideRef.current) {
      const labels = asideRef.current.querySelectorAll<HTMLSpanElement>(
        "[data-sidebar-label]"
      )
      const labelTranslateX = (1 - labelOp) * -6
      for (const span of labels) {
        span.style.opacity = labelOp.toFixed(3)
        span.style.transform = `translate3d(${labelTranslateX.toFixed(2)}px, 0px, 0px)`
      }
    }
  }, [])

  const { isOpen, open, close } = usePairedHabitat({
    enterTrackId: "sidebar:expand",
    exitTrackId: "sidebar:collapse",
    onFrame: handleFrame,
    compareItemId,
  })

  const toggle = React.useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, close, open])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      {/* 1. Slim, Symmetric Sidebar Rail (54px collapsed -> 156px expanded reveal) */}
      <aside
        ref={asideRef}
        aria-label="Application sidebar rail"
        className="absolute top-1.5 bottom-1.5 left-1.5 z-10 flex w-[144px] flex-col p-1.5"
      >
        {/* Top Header: 36px icon aligned + gap */}
        <div className="flex h-9 items-center gap-2.5 px-0.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-background font-heading text-xs font-semibold text-foreground">
            S
          </div>
          <span
            data-sidebar-label=""
            className="truncate font-heading text-xs font-semibold text-foreground will-change-transform"
            style={{
              opacity: 0,
              transform: "translate3d(-6.00px, 0px, 0px)",
            }}
          >
            Satisium
          </span>
        </div>

        {/* Primary Nav Items */}
        <nav
          aria-label="Sidebar navigation"
          className="mt-3 flex flex-col gap-1"
        >
          {PRIMARY_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={toggle}
              aria-label={item.label}
              className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-1.5 text-left transition-colors hover:bg-background"
            >
              <div className="flex size-5 shrink-0 items-center justify-center">
                <HugeiconsIcon
                  icon={item.icon}
                  className="size-4 shrink-0 text-foreground"
                />
              </div>
              <span
                data-sidebar-label=""
                className="truncate font-sans text-xs font-medium text-foreground will-change-transform"
                style={{
                  opacity: 0,
                  transform: "translate3d(-6.00px, 0px, 0px)",
                }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom Pinned Settings Item */}
        <div className="mt-auto">
          <button
            type="button"
            onClick={toggle}
            aria-label="Settings"
            className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-1.5 text-left transition-colors hover:bg-background"
          >
            <div className="flex size-5 shrink-0 items-center justify-center">
              <HugeiconsIcon
                icon={Settings02Icon}
                className="size-4 shrink-0 text-foreground"
              />
            </div>
            <span
              data-sidebar-label=""
              className="truncate font-sans text-xs font-medium text-foreground will-change-transform"
              style={{
                opacity: 0,
                transform: "translate3d(-6.00px, 0px, 0px)",
              }}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Container (GPU Clip-path over rail) */}
      <div
        ref={workspaceRef}
        className="relative z-20 flex h-full w-full items-center justify-center rounded-[11px] bg-background will-change-[clip-path]"
        style={{
          clipPath: "inset(0px 0px 0px 54.00px round 11px)",
        }}
      >
        <div
          ref={triggerWrapRef}
          className="will-change-transform"
          style={{
            transform: "translate3d(0.00px, 0px, 0px)",
          }}
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="inline-flex h-8.5 cursor-pointer items-center gap-2 rounded-[10px] bg-secondary px-3.5 font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground active:scale-95"
          >
            <span
              ref={chevronRef}
              className="flex size-4 items-center justify-center will-change-transform"
              style={{
                transform: "rotate(0.0deg)",
              }}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            </span>
            <span>{isOpen ? "Collapse Sidebar" : "Expand Sidebar"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
