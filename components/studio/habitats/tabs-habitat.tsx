"use client"

import * as React from "react"
import {
  Layers01Icon,
  ChartLineData02Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useEaseStore, useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"
import type { TrackFrameResult } from "@/core"

const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: Layers01Icon,
    title: "Surface Architecture",
    description:
      "Horizontal indicator glide with momentary compression during high-speed transit.",
    metricLabel: "Transit Speed",
    metricValue: "260ms",
  },
  {
    id: "metrics",
    label: "Metrics",
    icon: ChartLineData02Icon,
    title: "Kinetic Telemetry",
    description:
      "Live resting tension and settling velocity measurements across active tab boundaries.",
    metricLabel: "Peak Velocity",
    metricValue: "340 px/s",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings02Icon,
    title: "Dynamic Constraints",
    description:
      "Physics profile parameters enforcing spatial integrity and tactile boundary clamping.",
    metricLabel: "Stiffness",
    metricValue: "180 N/m",
  },
] as const

export interface TabsHabitatProps {
  compareItemId?: string
}

export function TabsHabitat({ compareItemId }: TabsHabitatProps = {}) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)

  const [activeTab, setActiveTab] = React.useState<number>(0)
  const pillRef = React.useRef<HTMLDivElement>(null)
  const fromIndexRef = React.useRef<number>(0)
  const targetIndexRef = React.useRef<number>(0)
  const isInternalActionRef = React.useRef<boolean>(false)

  const onFrame = React.useCallback((result: TrackFrameResult) => {
    if (!pillRef.current) return
    const tx = result.values["translateX"] ?? 0
    // translateX is registered as 0 to 100 (%)
    const progress = tx / 100
    const interp =
      fromIndexRef.current +
      (targetIndexRef.current - fromIndexRef.current) * progress
    const scale = result.values["scale"] ?? 1

    pillRef.current.style.transform = `translate3d(${interp * 100}%, 0, 0) scale(${scale})`
  }, [])

  const { triggerLive } = useTransitionTrack("tabs:switch", {
    onFrame,
    compareItemId,
  })

  // Sync external/keyboard Spacebar or Toolbar triggers & Compare Mode
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
        if (isInternalActionRef.current) {
          isInternalActionRef.current = false
          return
        }
        const currentTarget = targetIndexRef.current
        const next = (currentTarget + 1) % TABS.length
        fromIndexRef.current = currentTarget
        targetIndexRef.current = next
        setActiveTab(next)
      }
    })
    return unsubscribe
  }, [store, compareItemId])

  const handleSelectTab = (idx: number) => {
    if (idx === activeTab) return
    isInternalActionRef.current = true
    fromIndexRef.current = activeTab
    targetIndexRef.current = idx
    setActiveTab(idx)

    if (compareItemId) {
      store.getState().playScoped()
    } else if (focusedTrackId === "tabs:switch") {
      triggerLive()
    } else {
      store.getState().focusTrack("tabs:switch")
      store.getState().triggerLive("tabs:switch")
    }
  }

  const currentTabData = TABS[activeTab]

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="w-full max-w-[440px] rounded-[20px] bg-card p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-[8px] bg-secondary text-foreground">
              <HugeiconsIcon icon={currentTabData.icon} className="size-3.5" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-semibold text-foreground">
                Segmented Tabs Stage
              </h4>
              <p className="font-sans text-[11px] text-muted-foreground">
                Auditioning 120fps indicator glide & squeeze
              </p>
            </div>
          </div>
          <span className="font-sans text-[10px] text-muted-foreground">
            tabs:switch
          </span>
        </div>

        {/* Tab Strip with Imperative Sliding Pill */}
        <div className="relative mt-2 flex rounded-[12px] bg-muted p-1">
          {/* 120fps Sliding Indicator Pill (Width is 1/3 of container) */}
          <div className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/3)]">
            <div
              ref={pillRef}
              className="h-full w-full rounded-[8px] bg-background will-change-transform"
            />
          </div>

          {/* Interactive Tab Buttons */}
          <div className="relative z-10 grid w-full grid-cols-3">
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
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] font-sans text-xs transition-colors",
                    isSelected
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon icon={tab.icon} className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div className="mt-4 rounded-[14px] bg-secondary p-4">
          <span className="font-sans text-[10px] tracking-wider text-muted-foreground uppercase">
            Active Segment
          </span>
          <h5 className="mt-1 font-heading text-sm font-semibold text-foreground">
            {currentTabData.title}
          </h5>
          <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
            {currentTabData.description}
          </p>

          <div className="mt-4 flex items-center justify-between rounded-[8px] bg-card px-3 py-2">
            <span className="font-sans text-[11px] text-muted-foreground">
              {currentTabData.metricLabel}
            </span>
            <span className="font-sans text-[11px] font-semibold text-foreground tabular-nums">
              {currentTabData.metricValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
