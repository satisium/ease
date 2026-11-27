"use client"

import * as React from "react"
import {
  PlayIcon,
  PauseIcon,
  Refresh03Icon,
  RepeatIcon,
  AccessibilityIcon,
  PinIcon,
  RotateLeft01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion, AnimatePresence, LayoutGroup } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useEaseStore, useEaseStoreApi } from "@/hooks/use-ease-store"
import { useClockRef } from "@/hooks/use-clock-ref"
import { useStudioUi } from "@/components/studio/studio-ui-context"
import {
  Slider as SatisSlider,
  type SliderImperativeHandle,
} from "./satis-slider"
import {
  SATISIUM_SPRING_PILL,
  SATISIUM_EASE_DECEL,
  SATISIUM_EASE_ACCEL,
  SATISIUM_PRESS_CLASS,
} from "@/lib/motion"

export function TimelineConsole() {
  const store = useEaseStoreApi()

  // Low-frequency studio shell visibility
  const { isTimelineOpen } = useStudioUi()

  // Low-frequency store states
  const isPlaying = useEaseStore((s) => s.isPlaying)
  const isLooping = useEaseStore((s) => s.isLooping)
  const loopDelayMs = useEaseStore((s) => s.loopDelayMs)
  const speed = useEaseStore((s) => s.speed)
  const isReducedMotion = useEaseStore((s) => s.isReducedMotion)
  const isPinned = useEaseStore((s) => s.isPinned)
  const setPinned = useEaseStore((s) => s.setPinned)
  const resetFocusedTrack = useEaseStore((s) => s.resetFocusedTrack)
  const setFocusedDurationMs = useEaseStore((s) => s.setFocusedDurationMs)
  const setFocusedSpringMode = useEaseStore((s) => s.setFocusedSpringMode)
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const totalDurationMs = useEaseStore((s) => s.totalDurationMs)
  const isSolo = useEaseStore((s) => s.isSolo)

  // Focused channel resolution
  const currentChannels = trackBindings[focusedTrackId] ?? []
  const focusedChannel =
    focusedChannelId !== "all"
      ? (currentChannels.find((c) => c.id === focusedChannelId) ?? null)
      : (currentChannels.find((c) => c.property !== "opacity") ??
        currentChannels[0] ??
        null)

  // 120fps imperative refs for zero-re-render scrubbing & readout
  const sliderImperativeRef = React.useRef<SliderImperativeHandle>(null)
  const elapsedRef = React.useRef<HTMLSpanElement>(null)

  // Inline duration editing state
  const [isEditingDuration, setIsEditingDuration] = React.useState(false)

  // Initial snapshot fallback for static rendering
  const initialSnap = store.conductor.getSnapshot()
  const initialElapsedMs = Math.round(initialSnap.elapsedMs)

  // 120fps conductor subscriber (ZERO component re-renders)
  useClockRef((snap) => {
    if (snap.interactionMode === "live") return
    sliderImperativeRef.current?.setProgress(snap.progress * 100)
    if (elapsedRef.current) {
      elapsedRef.current.textContent = `${Math.round(snap.elapsedMs)}ms`
    }
  })

  // Pointer drag coordination
  const wasPlayingOnDragRef = React.useRef(false)

  const handlePointerDown = React.useCallback(() => {
    wasPlayingOnDragRef.current =
      store.conductor.getSnapshot().playbackState === "playing"
    if (wasPlayingOnDragRef.current) {
      store.getState().pauseScoped()
    }
  }, [store])

  const handlePointerUp = React.useCallback(() => {
    if (wasPlayingOnDragRef.current) {
      store.getState().playScoped()
    }
    wasPlayingOnDragRef.current = false
  }, [store])

  const handleScrubChange = React.useCallback(
    (pct: number) => {
      const snap = store.conductor.getSnapshot()
      const targetMs = (pct / 100) * snap.totalDurationMs
      store.getState().seekScoped(targetMs)
    },
    [store]
  )

  return (
    <AnimatePresence initial={false}>
      {isTimelineOpen && (
        <motion.div
          key="timeline-console-wrapper"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: SATISIUM_SPRING_PILL,
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              duration: 0.18,
              ease: SATISIUM_EASE_ACCEL,
            },
          }}
          className="shrink-0 overflow-hidden"
        >
          <TooltipProvider delayDuration={150}>
            <motion.section
              initial={{ y: 20 }}
              animate={{
                y: 0,
                transition: SATISIUM_SPRING_PILL,
              }}
              exit={{
                y: 16,
                transition: {
                  duration: 0.18,
                  ease: SATISIUM_EASE_ACCEL,
                },
              }}
              aria-label="Master Precision Timeline Dock"
              className="flex w-full shrink-0 flex-col gap-3 rounded-[20px] bg-background p-3.5 px-4 transition-colors select-none"
            >
              {/* Row 1: Full-Width Satisium Reimagined Slider (120fps Imperative Driver) */}
              <div
                className="flex w-full items-center"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
              >
                <SatisSlider
                  imperativeRef={sliderImperativeRef}
                  defaultValue={initialSnap.progress * 100}
                  onChange={handleScrubChange}
                  min={0}
                  max={100}
                  step={0.1}
                  size="sm"
                  layout="inline"
                  fillVariant="subdued"
                  showValue={false}
                  disableTransition={true}
                  className="w-full"
                />
              </div>

              {/* Row 2: Precision Transport Controls & Sharp Readout */}
              <div className="flex shrink-0 items-center justify-between">
                {/* Left: Minimal Icon Transport Cluster */}
                <LayoutGroup id="timeline-transport">
                  <div className="flex items-center gap-1.5">
                    {/* Play / Pause Toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => store.getState().togglePlayback()}
                          aria-label={
                            isPlaying ? "Pause animation" : "Play animation"
                          }
                          className={cn(
                            "flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-foreground text-background",
                            SATISIUM_PRESS_CLASS
                          )}
                        >
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={isPlaying ? "pause" : "play"}
                              initial={{
                                opacity: 0,
                                scale: 0.6,
                                filter: "blur(2px)",
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                filter: "blur(0px)",
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.6,
                                filter: "blur(2px)",
                              }}
                              transition={{
                                duration: 0.14,
                                ease: SATISIUM_EASE_DECEL,
                              }}
                              className="flex items-center justify-center"
                            >
                              <HugeiconsIcon
                                icon={isPlaying ? PauseIcon : PlayIcon}
                                className="size-3.5"
                              />
                            </motion.span>
                          </AnimatePresence>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span>{isPlaying ? "Pause" : "Play"}</span>
                        <kbd className="rounded bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground tabular-nums">
                          Space
                        </kbd>
                      </TooltipContent>
                    </Tooltip>

                    {/* Replay */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            store.getState().seekScoped(0)
                            store.getState().playScoped()
                          }}
                          aria-label="Replay from Origin"
                          className={cn(
                            "flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                            SATISIUM_PRESS_CLASS
                          )}
                        >
                          <HugeiconsIcon
                            icon={Refresh03Icon}
                            className="size-3.5"
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span>Replay</span>
                        <kbd className="rounded bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground tabular-nums">
                          R
                        </kbd>
                      </TooltipContent>
                    </Tooltip>

                    {/* Loop Toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            store.getState().setLooping(!isLooping)
                          }
                          aria-label="Toggle continuous loop"
                          className={cn(
                            "flex size-7 cursor-pointer items-center justify-center rounded-[8px] transition-colors",
                            SATISIUM_PRESS_CLASS,
                            isLooping
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <HugeiconsIcon
                            icon={RepeatIcon}
                            className="size-3.5"
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {isLooping
                          ? "Continuous Loop: Active"
                          : "Toggle Continuous Loop"}
                      </TooltipContent>
                    </Tooltip>

                    {/* Loop Delay Breather Selector Pill */}
                    <AnimatePresence initial={false}>
                      {isLooping && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            scale: 0.85,
                            filter: "blur(3px)",
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.85,
                            filter: "blur(3px)",
                          }}
                          transition={{
                            duration: 0.16,
                            ease: SATISIUM_EASE_DECEL,
                          }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextDelay =
                                    loopDelayMs === 0
                                      ? 400
                                      : loopDelayMs === 400
                                        ? 800
                                        : 0
                                  store.getState().setLoopDelayMs(nextDelay)
                                }}
                                aria-label={`Loop delay breather: ${loopDelayMs}ms. Click to cycle`}
                                className={cn(
                                  "flex h-7 cursor-pointer items-center justify-center rounded-[8px] bg-muted px-2 font-sans text-[11px] text-muted-foreground tabular-nums transition-colors hover:bg-secondary hover:text-foreground",
                                  SATISIUM_PRESS_CLASS
                                )}
                              >
                                <span>{loopDelayMs}ms</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <span>
                                Loop Delay: {loopDelayMs}ms · Click to cycle
                                (0ms · 400ms · 800ms)
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      layout
                      transition={SATISIUM_SPRING_PILL}
                      className="mx-0.5 h-3.5 w-px bg-secondary"
                    />

                    {/* Speed Multiplier Segment */}
                    <motion.div
                      layout
                      transition={SATISIUM_SPRING_PILL}
                      className="flex h-7 items-center rounded-[8px] bg-muted p-0.5 font-sans text-xs"
                    >
                      {([1, 0.5, 0.25] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => store.getState().setSpeed(s)}
                          aria-label={`Set playback speed to ${s}x`}
                          className={cn(
                            "relative z-10 cursor-pointer rounded-[6px] px-2 py-0.5 font-sans text-[11px] tabular-nums transition-colors outline-none",
                            SATISIUM_PRESS_CLASS,
                            speed === s
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {speed === s && (
                            <motion.div
                              layoutId="timeline-speed-pill"
                              transition={SATISIUM_SPRING_PILL}
                              className="absolute inset-0 rounded-[6px] bg-background"
                            />
                          )}
                          <span className="relative z-20">{s}x</span>
                        </button>
                      ))}
                    </motion.div>

                    {/* Channel Scope Segmented Pill: All Channels vs Solo Active Channel */}
                    {currentChannels.length > 1 && (
                      <>
                        <motion.div
                          layout
                          transition={SATISIUM_SPRING_PILL}
                          className="mx-0.5 h-3.5 w-px bg-secondary"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              layout
                              transition={SATISIUM_SPRING_PILL}
                              className="flex h-7 items-center rounded-[8px] bg-muted p-0.5 font-sans text-xs"
                            >
                              {(
                                [
                                  {
                                    id: "all",
                                    label: "All",
                                    solo: false,
                                    aria: "Audition all channels",
                                  },
                                  {
                                    id: "solo",
                                    label: "Solo",
                                    solo: true,
                                    aria: "Solo active channel",
                                  },
                                ] as const
                              ).map((opt) => {
                                const isActive = isSolo === opt.solo
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      store.getState().setSolo(opt.solo)
                                    }
                                    aria-label={opt.aria}
                                    aria-pressed={isActive}
                                    className={cn(
                                      "relative z-10 cursor-pointer rounded-[6px] px-2 py-0.5 font-sans text-[11px] transition-colors outline-none",
                                      SATISIUM_PRESS_CLASS,
                                      isActive
                                        ? "font-semibold text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId="timeline-scope-pill"
                                        transition={SATISIUM_SPRING_PILL}
                                        className="absolute inset-0 rounded-[6px] bg-background"
                                      />
                                    )}
                                    <span className="relative z-20">
                                      {opt.label}
                                    </span>
                                  </button>
                                )
                              })}
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <span>
                              {isSolo
                                ? "Solo: Isolating active channel"
                                : "All: Full choreography"}
                            </span>
                            <kbd className="rounded bg-muted px-1 py-0.5 font-sans text-[10px] text-muted-foreground">
                              S
                            </kbd>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </LayoutGroup>

                {/* Right: Spring Mode, Pin, Reset, A11y Suite & Clickable Duration Readout */}
                <div className="flex items-center gap-2">
                  {/* Spring Fit | Natural Mode Switcher */}
                  <AnimatePresence initial={false}>
                    {focusedChannel?.curve.engine === "spring" && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          scale: 0.85,
                          filter: "blur(3px)",
                        }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{
                          opacity: 0,
                          scale: 0.85,
                          filter: "blur(3px)",
                        }}
                        transition={{
                          duration: 0.16,
                          ease: SATISIUM_EASE_DECEL,
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                setFocusedSpringMode(
                                  focusedChannel.springMode === "fit"
                                    ? "natural"
                                    : "fit"
                                )
                              }
                              aria-label={`Spring mode: ${focusedChannel.springMode}. Click to toggle`}
                              className={cn(
                                "flex h-7 cursor-pointer items-center justify-center rounded-[8px] bg-muted px-2 font-sans text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                                SATISIUM_PRESS_CLASS
                              )}
                            >
                              {focusedChannel.springMode === "fit"
                                ? "Fit to Time"
                                : "Natural Settle"}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <span>
                              Spring Mode:{" "}
                              {focusedChannel.springMode === "fit"
                                ? "Fit (scaled to timeline duration)"
                                : "Natural (unconstrained physics settling)"}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pin Active Curve */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setPinned(!isPinned)}
                        aria-label={
                          isPinned ? "Unpin active curve" : "Pin active curve"
                        }
                        className={cn(
                          "flex size-7 cursor-pointer items-center justify-center rounded-[8px] transition-colors",
                          SATISIUM_PRESS_CLASS,
                          isPinned
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={PinIcon} className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span>{isPinned ? "Curve Pinned" : "Pin Curve"}</span>
                    </TooltipContent>
                  </Tooltip>

                  {/* Reset Track Channels */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={resetFocusedTrack}
                        aria-label="Reset track channels to defaults"
                        className={cn(
                          "flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                          SATISIUM_PRESS_CLASS
                        )}
                      >
                        <HugeiconsIcon
                          icon={RotateLeft01Icon}
                          className="size-3.5"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span>Reset Track Channels</span>
                    </TooltipContent>
                  </Tooltip>

                  {/* Reduced Motion Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          store.getState().setReducedMotion(!isReducedMotion)
                        }
                        aria-label="Toggle reduced motion accessibility simulation"
                        className={cn(
                          "flex size-7 cursor-pointer items-center justify-center rounded-[8px] transition-colors",
                          SATISIUM_PRESS_CLASS,
                          isReducedMotion
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <HugeiconsIcon
                          icon={AccessibilityIcon}
                          className="size-3.5"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isReducedMotion
                        ? "Reduced Motion: Enabled (Instant steps)"
                        : "Simulate Reduced Motion (A11y)"}
                    </TooltipContent>
                  </Tooltip>

                  <div className="h-3.5 w-px bg-border" />

                  {/* 120fps Safe Timestamp & Clickable Duration Control */}
                  <div className="flex items-baseline gap-1 font-sans text-xs select-none">
                    <span
                      ref={elapsedRef}
                      className="inline-block w-[46px] text-right font-sans text-xs font-medium text-foreground tabular-nums"
                    >
                      {initialElapsedMs}ms
                    </span>
                    <span className="text-muted-foreground">/</span>
                    {isEditingDuration ? (
                      <input
                        type="number"
                        autoFocus
                        defaultValue={totalDurationMs}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = Number(e.currentTarget.value)
                            if (!isNaN(val) && val > 0) {
                              setFocusedDurationMs(val)
                            }
                            setIsEditingDuration(false)
                          } else if (e.key === "Escape") {
                            setIsEditingDuration(false)
                          }
                        }}
                        onBlur={(e) => {
                          const val = Number(e.currentTarget.value)
                          if (!isNaN(val) && val > 0) {
                            setFocusedDurationMs(val)
                          }
                          setIsEditingDuration(false)
                        }}
                        className="h-6 w-[48px] rounded-[6px] bg-secondary px-1 text-center font-sans text-xs text-foreground tabular-nums focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingDuration(true)}
                        title="Click to edit duration (Enter to commit)"
                        aria-label={`Total duration ${totalDurationMs}ms. Click to edit`}
                        className="inline-flex w-[48px] items-center justify-center rounded-[6px] bg-muted py-0.5 font-sans text-xs font-medium text-muted-foreground tabular-nums transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {totalDurationMs}ms
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
