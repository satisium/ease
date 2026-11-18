/**
 * @file core/clock/track-conductor.ts
 * @description Scoped 120fps animation clock and playback state machine outside React.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies. Works in Node SSR and Vitest via injectable ClockDriver.
 * - Pub/sub state machine notifying listeners synchronously on ticks and state changes.
 * - Free interaction auto-capture with Pin protection.
 * - Scoped scrubbing and Mount/Unmount protection (`shouldForceMount`).
 * - Mid-flight velocity-preserving C1 interruption support.
 * - Breather resting phase for looping animations (real-time loopDelayMs).
 */

import { ChannelInterruptSnapshot } from "../math/evaluator"

/** Active playback lifecycle state. */
export type PlaybackState = "idle" | "playing" | "resting" | "scrubbing"

/** Interaction provenance: natural live trigger vs manual timeline scrubbing. */
export type InteractionMode = "live" | "scrub"

/** Playback playback speed multiplier. */
export type PlaybackSpeed = 1 | 0.5 | 0.25

/** Injectable clock driver interface for environment abstraction and deterministic testing. */
export interface ClockDriver {
  now: () => number
  requestFrame: (cb: (timestamp: number) => void) => number
  cancelFrame: (id: number) => void
}

/** Immutable snapshot of conductor state delivered to subscribers. */
export interface ConductorSnapshot {
  /** Wall-clock elapsed animation time in milliseconds. */
  elapsedMs: number
  /** Total duration in milliseconds for the focused track. */
  totalDurationMs: number
  /** Normalized progress clamped between 0 and 1. */
  progress: number
  /** Current state of the clock. */
  playbackState: PlaybackState
  /** Whether currently running from live user action or timeline scrubber. */
  interactionMode: InteractionMode
  /** Identifier of the currently focused transition track. */
  focusedTrackId: string
  /** If true, live component interactions do not steal focus from this track. */
  isPinned: boolean
  /** Whether the animation loops continuously on arrival. */
  isLooping: boolean
  /** Rest delay in milliseconds between loop iterations. */
  loopDelayMs: number
  /** Speed multiplier (1 = normal, 0.5 = half speed, 0.25 = quarter speed). */
  speed: PlaybackSpeed
  /** Whether solo channel isolation is active. */
  isSoloActive: boolean
  /** Active interruption snapshots keyed by channel ID. */
  interruptions: Record<string, ChannelInterruptSnapshot>
}

/** Creates a default ClockDriver using requestAnimationFrame or setTimeout fallback. */
function createDefaultClockDriver(): ClockDriver {
  const hasRaf =
    typeof globalThis !== "undefined" &&
    typeof globalThis.requestAnimationFrame === "function" &&
    typeof globalThis.cancelAnimationFrame === "function"

  const now = () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now()

  if (hasRaf) {
    return {
      now,
      requestFrame: (cb) => globalThis.requestAnimationFrame(cb),
      cancelFrame: (id) => globalThis.cancelAnimationFrame(id),
    }
  }

  // Node.js SSR / Vitest environment fallback
  return {
    now,
    requestFrame: (cb) => {
      const handle = setTimeout(() => {
        cb(now())
      }, 16) as unknown as number
      return handle
    },
    cancelFrame: (id) => clearTimeout(id),
  }
}

/**
 * Scoped 120fps animation clock and mutable state machine.
 */
export class TrackConductor {
  private readonly driver: ClockDriver
  private readonly listeners = new Set<(snapshot: ConductorSnapshot) => void>()
  private rafId: number | null = null
  private lastTimestamp: number | null = null
  private restElapsedMs = 0

  // State
  private elapsedMs = 0
  private totalDurationMs = 280
  private playbackState: PlaybackState = "idle"
  private interactionMode: InteractionMode = "live"
  private focusedTrackId = "primitives:all"
  private isPinned = false
  private isLooping = false
  private loopDelayMs = 400
  private speed: PlaybackSpeed = 1
  private isSoloActive = false
  private interruptions: Record<string, ChannelInterruptSnapshot> = {}

  constructor(driver?: ClockDriver, initialTrackId = "primitives:all") {
    this.driver = driver ?? createDefaultClockDriver()
    this.focusedTrackId = initialTrackId
  }

  // ==========================================================================
  // Subscriptions & Snapshots
  // ==========================================================================

  /**
   * Returns an immutable snapshot of current conductor state.
   */
  getSnapshot(): ConductorSnapshot {
    const progress =
      this.totalDurationMs > 0
        ? Math.min(1, Math.max(0, this.elapsedMs / this.totalDurationMs))
        : 1

    return {
      elapsedMs: this.elapsedMs,
      totalDurationMs: this.totalDurationMs,
      progress,
      playbackState: this.playbackState,
      interactionMode: this.interactionMode,
      focusedTrackId: this.focusedTrackId,
      isPinned: this.isPinned,
      isLooping: this.isLooping,
      loopDelayMs: this.loopDelayMs,
      speed: this.speed,
      isSoloActive: this.isSoloActive,
      interruptions: { ...this.interruptions },
    }
  }

  /**
   * Subscribes to conductor state changes and frame ticks.
   *
   * @param listener - Callback receiving fresh snapshot on every update.
   * @returns Unsubscribe function.
   */
  subscribe(listener: (snapshot: ConductorSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  // ==========================================================================
  // RAF Clock Loop
  // ==========================================================================

  private startRafLoop(): void {
    if (this.rafId !== null) return
    this.lastTimestamp = null

    const tick = (now: number) => {
      if (
        this.playbackState !== "playing" &&
        this.playbackState !== "resting"
      ) {
        this.stopRafLoop()
        return
      }

      let dt = 0
      if (this.lastTimestamp === null) {
        this.lastTimestamp = now
        dt = 0
      } else {
        const rawDt = Math.max(0, now - this.lastTimestamp)
        dt = Math.min(rawDt, 50)
        this.lastTimestamp = now
      }

      this.advanceFrame(dt)

      if (
        this.playbackState === "playing" ||
        this.playbackState === "resting"
      ) {
        this.rafId = this.driver.requestFrame(tick)
      } else {
        this.rafId = null
        this.lastTimestamp = null
      }
    }

    this.rafId = this.driver.requestFrame(tick)
  }

  private stopRafLoop(): void {
    if (this.rafId !== null) {
      this.driver.cancelFrame(this.rafId)
      this.rafId = null
    }
    this.lastTimestamp = null
  }

  // ==========================================================================
  // Deterministic Frame Advance
  // ==========================================================================

  /**
   * Advances the conductor by unscaled wall-clock delta milliseconds.
   * Public for deterministic testing and manual frame stepping.
   *
   * @param dtMs - Delta elapsed in wall-clock milliseconds.
   */
  advanceFrame(dtMs: number): void {
    const safeDt = Math.max(0, dtMs)

    // 1. Resting phase between loop cycles
    if (this.playbackState === "resting") {
      // Breather uses unscaled real-time dt so slow-mo doesn't delay breather
      this.restElapsedMs += safeDt
      if (this.restElapsedMs >= this.loopDelayMs) {
        this.restElapsedMs = 0
        this.elapsedMs = 0
        this.interruptions = {}
        this.playbackState = "playing"
      }
      this.notify()
      return
    }

    // 2. Active playing phase
    if (this.playbackState === "playing") {
      const scaledDt = safeDt * this.speed
      this.elapsedMs += scaledDt

      if (this.elapsedMs >= this.totalDurationMs) {
        this.elapsedMs = this.totalDurationMs

        if (this.isLooping) {
          if (this.loopDelayMs > 0) {
            this.playbackState = "resting"
            this.restElapsedMs = 0
          } else {
            this.elapsedMs = 0
            this.interruptions = {}
            this.playbackState = "playing"
          }
        } else {
          this.playbackState = "idle"
          this.stopRafLoop()
        }
      }

      this.notify()
    }
  }

  // ==========================================================================
  // Live Triggers & Focus Control
  // ==========================================================================

  /**
   * Auto-captures and plays a natural interaction on a component track.
   *
   * @param trackId - Track being triggered.
   * @param durationMs - Optional total duration update.
   */
  triggerLive(trackId: string, durationMs?: number): void {
    if (!this.isPinned) {
      this.focusedTrackId = trackId
    }

    this.interactionMode = "live"
    this.interruptions = {}

    if (durationMs !== undefined && durationMs > 0) {
      this.totalDurationMs = durationMs
    }

    this.elapsedMs = 0
    this.restElapsedMs = 0
    this.playbackState = "playing"
    this.lastTimestamp = null
    this.startRafLoop()
    this.notify()
  }

  /**
   * Explicitly sets the focused track without triggering playback.
   *
   * @param trackId - Track to focus.
   * @param durationMs - Optional total duration update.
   */
  focusTrack(trackId: string, durationMs?: number): void {
    this.focusedTrackId = trackId
    if (durationMs !== undefined && durationMs > 0) {
      this.totalDurationMs = durationMs
    }
    this.elapsedMs = 0
    this.restElapsedMs = 0
    this.interruptions = {}

    if (this.playbackState !== "playing") {
      this.playbackState = "idle"
      this.stopRafLoop()
    }

    this.notify()
  }

  /**
   * Updates the track total duration and clamps current elapsed time.
   *
   * @param durationMs - Total duration in milliseconds.
   */
  setTotalDurationMs(durationMs: number): void {
    this.totalDurationMs = Math.max(0, durationMs)
    this.elapsedMs = Math.min(this.elapsedMs, this.totalDurationMs)
    this.notify()
  }

  // ==========================================================================
  // Scoped Playback & Scrubbing
  // ==========================================================================

  /**
   * Starts scoped scrub playback from current position or restarts if at end.
   *
   * @param durationMs - Optional duration override.
   */
  playScoped(durationMs?: number): void {
    this.interactionMode = "scrub"
    if (durationMs !== undefined && durationMs > 0) {
      this.totalDurationMs = durationMs
    }

    if (
      this.totalDurationMs > 0 &&
      this.elapsedMs >= this.totalDurationMs - 2
    ) {
      this.elapsedMs = 0
      this.interruptions = {}
    }

    this.restElapsedMs = 0
    this.playbackState = "playing"
    this.lastTimestamp = null
    this.startRafLoop()
    this.notify()
  }

  /**
   * Pauses the animation clock and enters idle state.
   */
  pause(): void {
    this.playbackState = "idle"
    this.stopRafLoop()
    this.notify()
  }

  /**
   * Toggles between play and pause.
   *
   * @param durationMs - Optional duration override.
   */
  togglePlay(durationMs?: number): void {
    if (this.playbackState === "playing" || this.playbackState === "resting") {
      this.pause()
    } else {
      this.playScoped(durationMs)
    }
  }

  /**
   * Seeks the animation clock to an exact millisecond timestamp.
   *
   * @param elapsedMs - Target timestamp in milliseconds.
   */
  seek(elapsedMs: number): void {
    this.interactionMode = "scrub"
    this.playbackState = "scrubbing"
    this.stopRafLoop()

    this.elapsedMs = Math.min(this.totalDurationMs, Math.max(0, elapsedMs))
    if (this.elapsedMs === 0) {
      this.interruptions = {}
    }

    this.notify()
  }

  // ==========================================================================
  // Controls & Toggles
  // ==========================================================================

  setPinned(pinned: boolean): void {
    this.isPinned = pinned
    this.notify()
  }

  setLooping(looping: boolean): void {
    this.isLooping = looping
    this.notify()
  }

  setLoopDelayMs(ms: number): void {
    this.loopDelayMs = Math.max(0, ms)
    this.notify()
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed
    this.notify()
  }

  setSoloActive(solo: boolean): void {
    this.isSoloActive = solo
    this.notify()
  }

  // ==========================================================================
  // Mount/Unmount Safety Invariant
  // ==========================================================================

  /**
   * Determines whether a component track must remain mounted to prevent premature unmounting.
   *
   * @param trackId - The track ID to check.
   * @returns True if the element must be force mounted.
   */
  shouldForceMount(trackId: string): boolean {
    if (this.focusedTrackId !== trackId) {
      return false
    }

    return (
      this.interactionMode === "scrub" ||
      this.isSoloActive ||
      this.playbackState !== "idle"
    )
  }

  // ==========================================================================
  // Mid-Flight Interruption
  // ==========================================================================

  /**
   * Captures mid-flight position and velocity snapshots and initiates immediate retargeting.
   *
   * @param params - New target track, duration, and channel snapshots.
   */
  interrupt(params: {
    nextTrackId?: string
    nextDurationMs: number
    snapshots: Record<string, ChannelInterruptSnapshot>
  }): void {
    this.interruptions = { ...params.snapshots }
    if (params.nextTrackId) {
      this.focusedTrackId = params.nextTrackId
    }
    this.totalDurationMs = Math.max(0, params.nextDurationMs)
    this.elapsedMs = 0
    this.restElapsedMs = 0
    this.playbackState = "playing"
    this.lastTimestamp = null
    this.startRafLoop()
    this.notify()
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Cancels active animation handles and unsubscribes all listeners.
   */
  destroy(): void {
    this.stopRafLoop()
    this.listeners.clear()
    this.playbackState = "idle"
  }
}

/** Pre-instantiated default TrackConductor singleton. */
export const trackConductor = new TrackConductor(undefined, "dialog:open")
