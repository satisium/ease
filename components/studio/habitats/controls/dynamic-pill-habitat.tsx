"use client"

import * as React from "react"
import {
  Cancel01Icon,
  MusicNote01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TrackFrameResult } from "@/core"
import { usePairedHabitat } from "@/hooks/use-paired-habitat"

export interface DynamicPillHabitatProps {
  compareItemId?: string
}

interface MediaTrack {
  title: string
  artist: string
  duration: string
  elapsed: string
  progressPct: number
}

const MEDIA_TRACKS: readonly MediaTrack[] = [
  {
    title: "Midnight Kinetics",
    artist: "Satisium Audio",
    duration: "3:42",
    elapsed: "1:18",
    progressPct: 36,
  },
  {
    title: "Glass Physics",
    artist: "Studio Mix",
    duration: "2:58",
    elapsed: "0:54",
    progressPct: 30,
  },
  {
    title: "Expo Decel",
    artist: "Ambient Lab",
    duration: "4:15",
    elapsed: "2:10",
    progressPct: 51,
  },
]

export function DynamicPillHabitat({
  compareItemId,
}: DynamicPillHabitatProps = {}) {
  const [trackIndex, setTrackIndex] = React.useState(0)
  const [isTrackPlaying, setIsTrackPlaying] = React.useState(true)

  const currentTrack = MEDIA_TRACKS[trackIndex]!

  const pillRef = React.useRef<HTMLDivElement>(null)
  const compactRef = React.useRef<HTMLDivElement>(null)
  const expandedRef = React.useRef<HTMLDivElement>(null)

  // Pure GPU 120fps Dynamic Island Morph (clip-path, transform, opacity)
  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    const ex = frame.values.expand ?? 0
    const op = Math.min(1, Math.max(0, frame.values.contentOpacity ?? 0))

    if (pillRef.current) {
      // Width leads slightly ahead of height for organic Dynamic Island blossoming
      const wProg = Math.min(1, Math.max(0, ex * 1.12))
      const hProg = Math.min(1, Math.max(0, ex))
      const sideInset = 68 * (1 - wProg) // (304 - 168) / 2 = 68px
      const bottomInset = 96 * (1 - hProg) // 132 - 36 = 96px
      const radius = 18 + 8 * hProg // 18px -> 26px

      pillRef.current.style.clipPath = `inset(0px ${sideInset.toFixed(2)}px ${bottomInset.toFixed(2)}px ${sideInset.toFixed(2)}px round ${radius.toFixed(2)}px)`

      // Map spring overshoot into crisp GPU scale
      const overshoot = ex > 1 ? (ex - 1) * 0.65 : ex < 0 ? ex * 0.4 : 0
      const scaleX = 1 + overshoot
      const scaleY = 1 + overshoot * 1.2
      pillRef.current.style.transform = `scale3d(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)}, 1)`
    }

    if (compactRef.current) {
      const cVis = Math.max(0, 1 - op * 2.4)
      compactRef.current.style.opacity = cVis.toFixed(3)
      compactRef.current.style.transform = `scale(${(0.92 + 0.08 * cVis).toFixed(4)})`
      compactRef.current.style.pointerEvents = cVis > 0.1 ? "auto" : "none"
    }

    if (expandedRef.current) {
      expandedRef.current.style.opacity = op.toFixed(3)
      expandedRef.current.style.transform = `translate3d(0, ${((1 - op) * -6).toFixed(2)}px, 0) scale(${(0.95 + 0.05 * op).toFixed(4)})`
      expandedRef.current.style.pointerEvents = op > 0.1 ? "auto" : "none"
    }
  }, [])

  const { isOpen, open, close } = usePairedHabitat({
    enterTrackId: "pill:expand",
    exitTrackId: "pill:collapse",
    onFrame: handleFrame,
    compareItemId,
  })

  // Escape key dismisses expanded pill
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, close])

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTrackIndex((i) => (i - 1 + MEDIA_TRACKS.length) % MEDIA_TRACKS.length)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTrackIndex((i) => (i + 1) % MEDIA_TRACKS.length)
  }

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsTrackPlaying((p) => !p)
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-background p-4">
        {/* Fixed-Size Anchor Container */}
        <div className="relative h-[132px] w-[304px]">
          {/* Dynamic Capsule Container with Fixed Dimensions & GPU clip-path */}
          <div
            ref={pillRef}
            className="relative h-[132px] w-[304px] origin-top overflow-hidden bg-foreground text-background will-change-[clip-path,transform] select-none"
            style={{
              clipPath: "inset(0px 68.00px 96.00px 68.00px round 18.00px)",
              transform: "scale3d(1.0000, 1.0000, 1)",
            }}
          >
            {/* Compact Layer (Fixed Size) */}
            <div
              ref={compactRef}
              className="absolute top-0 left-1/2 h-[36px] w-[168px] -translate-x-1/2 will-change-transform"
              style={{ opacity: 1, pointerEvents: "auto" }}
            >
              <button
                type="button"
                onClick={open}
                aria-label="Expand dynamic action pill"
                className="flex h-full w-full cursor-pointer items-center justify-between px-3.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-brand text-brand-foreground">
                    <HugeiconsIcon icon={MusicNote01Icon} className="size-3" />
                  </span>
                  <span className="truncate font-heading text-[11px] font-medium text-background">
                    {currentTrack.title}
                  </span>
                </div>

                {/* 3 Equalizer Bars */}
                <div className="flex h-3 shrink-0 items-end gap-0.5">
                  <span
                    className={`w-0.5 rounded-full bg-background ${
                      isTrackPlaying ? "h-1.5" : "h-1"
                    }`}
                  />
                  <span
                    className={`w-0.5 rounded-full bg-background ${
                      isTrackPlaying ? "h-3" : "h-1"
                    }`}
                  />
                  <span
                    className={`w-0.5 rounded-full bg-background ${
                      isTrackPlaying ? "h-2" : "h-1"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Expanded Layer (Fixed Size) */}
            <div
              ref={expandedRef}
              className="absolute inset-0 flex h-[132px] w-[304px] flex-col justify-between p-3.5 will-change-transform"
              style={{ opacity: 0, pointerEvents: "none" }}
            >
              {/* Top row: Artwork + Title/Artist + Dismiss */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand text-brand-foreground">
                  <HugeiconsIcon icon={MusicNote01Icon} className="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-heading text-xs font-semibold text-background">
                    {currentTrack.title}
                  </span>
                  <span className="truncate font-sans text-[11px] text-muted-foreground">
                    {currentTrack.artist}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Collapse dynamic action pill"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[9px] bg-background text-foreground transition-opacity hover:opacity-90 active:scale-95"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </button>
              </div>

              {/* Middle row: Progress Bar */}
              <div className="flex items-center gap-2 font-sans text-[10px] text-muted-foreground tabular-nums select-none">
                <span>{currentTrack.elapsed}</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-background"
                    style={{ width: `${currentTrack.progressPct}%` }}
                  />
                </div>
                <span>{currentTrack.duration}</span>
              </div>

              {/* Bottom row: Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous track"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-background transition-opacity hover:opacity-80 active:scale-95"
                >
                  <HugeiconsIcon icon={PreviousIcon} className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayToggle}
                  aria-label={isTrackPlaying ? "Pause track" : "Play track"}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[9px] bg-background text-foreground transition-opacity hover:opacity-90 active:scale-95"
                >
                  <HugeiconsIcon
                    icon={isTrackPlaying ? PauseIcon : PlayIcon}
                    className="size-4"
                  />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next track"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-background transition-opacity hover:opacity-80 active:scale-95"
                >
                  <HugeiconsIcon icon={NextIcon} className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
