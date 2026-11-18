"use client"

import * as React from "react"
import { FavouriteIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

export interface TactileTogglesHabitatProps {
  compareItemId?: string
}

export function TactileTogglesHabitat({
  compareItemId,
}: TactileTogglesHabitatProps = {}) {
  const store = useEaseStoreApi()

  // Independent states per control
  const [switchOn, setSwitchOn] = React.useState<boolean>(false)
  const [checkOn, setCheckOn] = React.useState<boolean>(false)
  const [liked, setLiked] = React.useState<boolean>(false)

  const switchDirRef = React.useRef<number>(1)
  const checkDirRef = React.useRef<number>(1)
  const likeDirRef = React.useRef<number>(1)
  const activeControlRef = React.useRef<"switch" | "check" | "like" | "all">(
    "all"
  )

  const switchBtnRef = React.useRef<HTMLButtonElement>(null)
  const thumbRef = React.useRef<HTMLSpanElement>(null)
  const checkBoxRef = React.useRef<HTMLButtonElement>(null)
  const checkPathRef = React.useRef<SVGPathElement>(null)
  const likeBtnRef = React.useRef<HTMLButtonElement>(null)
  const heartRef = React.useRef<HTMLSpanElement>(null)
  const ringRef = React.useRef<HTMLDivElement>(null)

  // 120fps GPU driver: selectively animates active control while resting peers
  const handleFrame = React.useCallback(
    (frame: TrackFrameResult) => {
      const rawThumb = (frame.values.thumb ?? 0) / 16
      const rawCheck = frame.progressByChannel.check ?? 0
      const rawBurst = frame.progressByChannel.burst ?? 0

      const isScrubOrCompare =
        Boolean(compareItemId) ||
        store.conductor.getSnapshot().playbackState === "scrubbing"
      const active = activeControlRef.current

      // 1. Switch Thumb Snap
      let tThumb: number
      if (isScrubOrCompare || active === "all") {
        tThumb = rawThumb
      } else if (active === "switch") {
        tThumb =
          switchDirRef.current === -1 ? Math.max(0, 1 - rawThumb) : rawThumb
      } else {
        tThumb = switchOn ? 1 : 0
      }

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate3d(${(tThumb * 16).toFixed(2)}px, 0px, 0px)`
      }
      if (switchBtnRef.current) {
        if (tThumb >= 0.5) {
          switchBtnRef.current.classList.add("bg-foreground")
          switchBtnRef.current.classList.remove("bg-secondary")
          if (thumbRef.current) {
            thumbRef.current.classList.add("bg-background")
            thumbRef.current.classList.remove("bg-foreground")
          }
        } else {
          switchBtnRef.current.classList.add("bg-secondary")
          switchBtnRef.current.classList.remove("bg-foreground")
          if (thumbRef.current) {
            thumbRef.current.classList.add("bg-foreground")
            thumbRef.current.classList.remove("bg-background")
          }
        }
      }

      // 2. Stroke Check Draw & Box Tap
      let tCheck: number
      if (isScrubOrCompare || active === "all") {
        tCheck = rawCheck
      } else if (active === "check") {
        tCheck =
          checkDirRef.current === -1 ? Math.max(0, 1 - rawCheck) : rawCheck
      } else {
        tCheck = checkOn ? 1 : 0
      }

      if (checkBoxRef.current) {
        const sq =
          1 - 0.1 * Math.sin(Math.min(1, Math.max(0, tCheck)) * Math.PI)
        checkBoxRef.current.style.transform = `scale(${sq.toFixed(4)})`
        if (tCheck >= 0.5) {
          checkBoxRef.current.classList.add("bg-foreground", "text-background")
          checkBoxRef.current.classList.remove(
            "bg-secondary",
            "text-foreground"
          )
        } else {
          checkBoxRef.current.classList.add("bg-secondary", "text-foreground")
          checkBoxRef.current.classList.remove(
            "bg-foreground",
            "text-background"
          )
        }
      }
      if (checkPathRef.current) {
        const offset = (20 * (1 - Math.min(1, Math.max(0, tCheck)))).toFixed(2)
        checkPathRef.current.style.strokeDashoffset = offset
      }

      // 3. Like Burst & Pop
      let tBurst: number
      if (isScrubOrCompare || active === "all") {
        tBurst = rawBurst
      } else if (active === "like") {
        tBurst =
          likeDirRef.current === -1 ? Math.max(0, 1 - rawBurst) : rawBurst
      } else {
        tBurst = liked ? 1 : 0
      }

      const b = Math.max(0, tBurst)
      if (heartRef.current) {
        const heartScale =
          1 +
          0.34 * Math.sin(Math.min(1, b) * Math.PI) +
          (b > 1 ? (b - 1) * 0.45 : 0)
        heartRef.current.style.transform = `scale(${heartScale.toFixed(4)})`
      }
      if (ringRef.current) {
        const ringScale = (0.6 + Math.min(1.2, b) * 1.1).toFixed(3)
        const ringOpacity = (b > 0.02 && b < 0.95 ? 0.55 * (1 - b) : 0).toFixed(
          3
        )
        ringRef.current.style.transform = `scale(${ringScale})`
        ringRef.current.style.opacity = ringOpacity
      }
    },
    [compareItemId, store, switchOn, checkOn, liked]
  )

  const { triggerLive } = useTransitionTrack("toggles:press", {
    compareItemId,
    onFrame: handleFrame,
  })

  const toggleSwitch = React.useCallback(() => {
    const next = !switchOn
    switchDirRef.current = next ? 1 : -1
    activeControlRef.current = "switch"
    setSwitchOn(next)
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [switchOn, compareItemId, store, triggerLive])

  const toggleCheck = React.useCallback(() => {
    const next = !checkOn
    checkDirRef.current = next ? 1 : -1
    activeControlRef.current = "check"
    setCheckOn(next)
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [checkOn, compareItemId, store, triggerLive])

  const toggleLike = React.useCallback(() => {
    const next = !liked
    likeDirRef.current = next ? 1 : -1
    activeControlRef.current = "like"
    setLiked(next)
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [liked, compareItemId, store, triggerLive])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-4">
        {/* Breathing 3-column control group with zero outer wrapper box */}
        <div className="flex items-center justify-center gap-8">
          {/* 1. Auto-save Switch */}
          <div className="flex flex-col items-center gap-2">
            <button
              ref={switchBtnRef}
              role="switch"
              type="button"
              aria-checked={switchOn}
              aria-label={
                switchOn ? "Disable auto-save switch" : "Enable feature switch"
              }
              onClick={toggleSwitch}
              className="relative h-6 w-10 cursor-pointer rounded-[8px] bg-secondary p-0.5 will-change-transform"
            >
              <span
                ref={thumbRef}
                className="block size-5 rounded-[6px] bg-foreground will-change-transform"
                style={{
                  transform: "translate3d(0.00px, 0px, 0px)",
                }}
              />
            </button>
            <span className="font-sans text-[11px] font-medium text-foreground">
              Sync
            </span>
          </div>

          {/* 2. Notification Checkbox */}
          <div className="flex flex-col items-center gap-2">
            <button
              ref={checkBoxRef}
              role="checkbox"
              type="button"
              aria-checked={checkOn}
              aria-label={checkOn ? "Uncheck task option" : "Check task option"}
              onClick={toggleCheck}
              className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-foreground will-change-transform"
              style={{
                transform: "scale(1.0000)",
              }}
            >
              <svg
                className="size-3.5 fill-none stroke-current"
                viewBox="0 0 16 16"
              >
                <path
                  ref={checkPathRef}
                  d="M3.5 8.5L6.5 11.5L12.5 5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="20"
                  style={{
                    strokeDashoffset: "20.00",
                  }}
                />
              </svg>
            </button>
            <span className="font-sans text-[11px] font-medium text-foreground">
              Alerts
            </span>
          </div>

          {/* 3. Like Preset Burst */}
          <div className="flex flex-col items-center gap-2">
            <button
              ref={likeBtnRef}
              type="button"
              aria-pressed={liked}
              aria-label={liked ? "Unlike component" : "Like component"}
              onClick={toggleLike}
              className="relative flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-secondary text-foreground"
            >
              <div
                ref={ringRef}
                className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-transform"
                style={{
                  transform: "scale(0.600)",
                  opacity: 0,
                }}
              >
                <svg
                  className="size-full fill-none stroke-foreground"
                  viewBox="0 0 28 28"
                >
                  <circle cx="14" cy="14" r="13" strokeWidth="1.5" />
                </svg>
              </div>
              <span
                ref={heartRef}
                className="inline-flex will-change-transform"
                style={{
                  transform: "scale(1.0000)",
                }}
              >
                <HugeiconsIcon
                  icon={FavouriteIcon}
                  className={`size-4 ${
                    liked
                      ? "fill-foreground text-foreground"
                      : "text-foreground"
                  }`}
                />
              </span>
            </button>
            <span className="font-sans text-[11px] font-medium text-foreground tabular-nums">
              {liked ? "25" : "24"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
