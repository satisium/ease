"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface SegmentedTabsHabitatProps {
  compareItemId?: string
}

const TABS = [
  {
    id: "overview",
    label: "Overview",
    summary: "3 active deployments · 99.98% uptime",
  },
  {
    id: "activity",
    label: "Activity",
    summary: "2 kinetic presets updated 4m ago",
  },
  {
    id: "settings",
    label: "Settings",
    summary: "Workspace visibility · Private",
  },
] as const

export function SegmentedTabsHabitat({
  compareItemId,
}: SegmentedTabsHabitatProps = {}) {
  const store = useEaseStoreApi()
  const [activeTab, setActiveTab] = React.useState<number>(0)

  const pillRef = React.useRef<HTMLDivElement>(null)
  const panelTextRef = React.useRef<HTMLParagraphElement>(null)
  const fromTabRef = React.useRef<number>(0)
  const toTabRef = React.useRef<number>(1)
  const isSelfTriggeredRef = React.useRef<boolean>(false)

  // 120fps Imperative indicator glide & squeeze
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const p = frame.progressByChannel.indicator ?? 0
    const sq = Math.min(1, Math.max(0, frame.progressByChannel.squeeze ?? 0))

    if (pillRef.current) {
      const slot =
        fromTabRef.current + (toTabRef.current - fromTabRef.current) * p
      const squeezePulse = Math.sin(sq * Math.PI)
      const scaleX = 1 + 0.045 * squeezePulse
      const scaleY = 1 - 0.045 * squeezePulse

      pillRef.current.style.transform = `translate3d(${(slot * 100).toFixed(2)}%, 0px, 0px) scale3d(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)}, 1)`
    }

    if (panelTextRef.current) {
      const vis = 1 - Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 0.55
      panelTextRef.current.style.opacity = vis.toFixed(3)
    }
  }, [])

  const { triggerLive } = useTransitionTrack("tabs:switch", {
    compareItemId,
    onFrame: handleFrame,
  })

  // Sync external/toolbar play triggers
  React.useEffect(() => {
    const unsubscribe = store.subscribe((curr, prev) => {
      const isTarget = compareItemId
        ? (curr.compareQueue.find((i) => i.id === compareItemId)
            ?.overrideTrackId ?? curr.globalCompareTarget.trackId) ===
          "tabs:switch"
        : curr.focusedTrackId === "tabs:switch"

      if (
        isTarget &&
        curr.playbackState === "playing" &&
        prev.playbackState !== "playing"
      ) {
        if (isSelfTriggeredRef.current) {
          isSelfTriggeredRef.current = false
          return
        }
        setActiveTab((currTab) => {
          const next = (currTab + 1) % TABS.length
          fromTabRef.current = currTab
          toTabRef.current = next
          return next
        })
      }
    })
    return unsubscribe
  }, [store, compareItemId])

  const handleSelectTab = (idx: number) => {
    if (idx === activeTab) return
    isSelfTriggeredRef.current = true
    fromTabRef.current = activeTab
    toTabRef.current = idx
    setActiveTab(idx)

    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        {/* Max 300px wrapper fits CompareTile 320px cleanly */}
        <div className="flex w-full max-w-[300px] flex-col gap-2">
          {/* Segmented Bar */}
          <div
            role="tablist"
            aria-label="Segmented control bar"
            className="relative grid grid-cols-3 rounded-[11px] bg-secondary p-1"
          >
            {/* Sliding Indicator Pill (1/3 of bar) */}
            <div
              ref={pillRef}
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-[8px] bg-background will-change-transform"
              style={{
                transform: `translate3d(${(activeTab * 100).toFixed(2)}%, 0px, 0px) scale3d(1.0000, 1.0000, 1)`,
              }}
            />

            {/* 3 Tab Buttons */}
            {TABS.map((tab, idx) => {
              const isSelected = activeTab === idx
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`${tab.label} tab`}
                  onClick={() => handleSelectTab(idx)}
                  className={`relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-[8px] font-sans text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Calm Status Card */}
          <div className="rounded-[11px] bg-secondary px-3.5 py-2.5">
            <p
              ref={panelTextRef}
              className="will-change-opacity font-sans text-xs text-muted-foreground"
            >
              {TABS[activeTab].summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
