/**
 * @file core/math/evaluator.ts
 * @description Pure frame evaluation engine for multi-channel choreographed transition tracks.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - 120fps allocations: returns direct numerical primitives for DOM applicator refs.
 * - Multi-channel stagger & duration alignment.
 * - Smart Opacity Protection: prevents opacity blooming outside [0, 1] during spring overshoot.
 * - Solo (S) channel isolation: locks sibling channels to visible rest states in both
 *   entrance and exit phases.
 * - Reduced Motion (♿): spatial properties lock immediately; opacity fades linearly in 140ms.
 * - C1 continuous interruption preservation for smooth reversal/retargeting.
 */

import {
  ChannelBinding,
  EaseCurve,
  TrackFrameResult,
  TransitionTrackPlugin,
} from "../schema"

export type { TrackFrameResult }
import { solveBezierAtTime } from "./bezier"
import {
  computeSpringSettleTimeMs,
  fitSpringToDurationMs,
  solveSpringAtTime,
} from "./spring-ode"

/** Duration of cross-fades when reduced motion (prefers-reduced-motion) is active. */
export const REDUCED_MOTION_DURATION_MS = 140

/** Snapshot of channel progress and velocity captured at the instant of an interruption. */
export interface ChannelInterruptSnapshot {
  /** Normalized position at interruption handoff (0 to 1). */
  x0: number
  /** Normalized velocity in units/second at handoff. */
  v0: number
}

/** Options provided to evaluate an entire choreographed track frame. */
export interface EvaluateTrackOptions {
  /** The track plugin being evaluated (e.g. Dialog Open, Drawer Close). */
  track: Pick<TransitionTrackPlugin, "phase" | "channels">
  /** Wall-clock elapsed time in milliseconds from animation trigger. */
  elapsedMs: number
  /** ID of channel isolated in Solo mode (or null/empty/"all" for full track). */
  soloChannelId?: string | null
  /** True when user OS requests reduced motion. */
  isReducedMotion?: boolean
  /** When true (default), clamps opacity channel progress to [0, 1]. */
  protectOpacityOvershoot?: boolean
  /** Active interruption snapshots keyed by channel ID. */
  interruptions?: Record<string, ChannelInterruptSnapshot>
}

/**
 * Computes the effective wall-clock duration of an individual channel in milliseconds,
 * taking into account its motion engine, spring mode, and accessibility constraints.
 *
 * @param channel - The channel binding to measure.
 * @param isReducedMotion - Whether reduced motion is active.
 * @returns Duration in milliseconds.
 */
export function getChannelEffectiveDurationMs(
  channel: ChannelBinding,
  isReducedMotion = false
): number {
  if (isReducedMotion) {
    return channel.property === "opacity" ? REDUCED_MOTION_DURATION_MS : 0
  }

  if (channel.curve.engine === "bezier") {
    return Math.max(1, channel.durationMs)
  }

  if (channel.curve.engine === "spring") {
    if (channel.springMode === "fit") {
      const fitted = fitSpringToDurationMs(
        channel.curve.spring,
        channel.durationMs
      )
      return Math.max(
        channel.durationMs,
        computeSpringSettleTimeMs(fitted, 0.005)
      )
    }
    // Natural unconstrained mode
    return computeSpringSettleTimeMs(channel.curve.spring, 0.005)
  }

  return Math.max(1, channel.durationMs)
}

/**
 * Computes the total wall-clock duration of a complete track, including delays,
 * accounting for solo channel filtering and accessibility overrides.
 *
 * @param track - The track or channel collection.
 * @param isReducedMotion - Whether reduced motion is active.
 * @param soloChannelId - Optional solo channel filter.
 * @returns Total duration in milliseconds.
 */
export function getTrackTotalDurationMs(
  track: Pick<TransitionTrackPlugin, "channels">,
  isReducedMotion = false,
  soloChannelId?: string | null
): number {
  if (!track.channels || track.channels.length === 0) {
    return 0
  }

  const isSoloActive = Boolean(soloChannelId && soloChannelId !== "all")
  const activeChannels = isSoloActive
    ? track.channels.filter((c) => c.id === soloChannelId)
    : track.channels

  if (activeChannels.length === 0) {
    return 0
  }

  return Math.max(
    0,
    ...activeChannels.map(
      (channel) =>
        channel.delayMs +
        getChannelEffectiveDurationMs(channel, isReducedMotion)
    )
  )
}

/**
 * Evaluates an individual channel at a specific elapsed millisecond timestamp.
 *
 * @param channel - The channel binding being evaluated.
 * @param elapsedMs - Wall-clock elapsed time in milliseconds.
 * @param options - Accessibility, protection, and interruption options.
 * @returns Evaluated value, normalized progress, velocity per second, and complete flag.
 */
export function evaluateChannelAtTime(
  channel: ChannelBinding,
  elapsedMs: number,
  options?: {
    isReducedMotion?: boolean
    protectOpacityOvershoot?: boolean
    interruption?: ChannelInterruptSnapshot
  }
): {
  value: number
  progress: number
  velocityPerSec: number
  isComplete: boolean
} {
  const isReducedMotion = options?.isReducedMotion ?? false
  const protectOpacity = options?.protectOpacityOvershoot !== false
  const interruption = options?.interruption
  const localElapsed = elapsedMs - channel.delayMs

  // --------------------------------------------------------------------------
  // 1. Reduced Motion Override
  // --------------------------------------------------------------------------
  if (isReducedMotion) {
    if (channel.property === "opacity") {
      if (localElapsed <= 0) {
        return {
          value: channel.from,
          progress: 0,
          velocityPerSec: 0,
          isComplete: false,
        }
      }
      if (localElapsed >= REDUCED_MOTION_DURATION_MS) {
        return {
          value: channel.to,
          progress: 1,
          velocityPerSec: 0,
          isComplete: true,
        }
      }
      const progress = localElapsed / REDUCED_MOTION_DURATION_MS
      const value = channel.from + (channel.to - channel.from) * progress
      const velocityPerSec = 1 / (REDUCED_MOTION_DURATION_MS / 1000)
      return {
        value,
        progress,
        velocityPerSec,
        isComplete: false,
      }
    }

    // Spatial properties snap immediately to destination
    return {
      value: channel.to,
      progress: 1,
      velocityPerSec: 0,
      isComplete: true,
    }
  }

  // --------------------------------------------------------------------------
  // 2. Pre-Delay Boundary (localElapsed < 0)
  // --------------------------------------------------------------------------
  if (localElapsed < 0) {
    const x0 = interruption?.x0 ?? 0
    const value = channel.from + (channel.to - channel.from) * x0
    return {
      value,
      progress: x0,
      velocityPerSec: 0,
      isComplete: false,
    }
  }

  // --------------------------------------------------------------------------
  // 3. Bézier Engine Evaluation
  // --------------------------------------------------------------------------
  if (channel.curve.engine === "bezier") {
    const dur = Math.max(1, channel.durationMs)
    const isComplete = localElapsed >= dur
    const tNorm = Math.min(1, Math.max(0, localElapsed / dur))
    const solved = solveBezierAtTime(channel.curve.bezier, tNorm)

    const x0 = interruption?.x0 ?? 0
    let progress = isComplete ? 1 : x0 + (1 - x0) * solved.value
    let velocityPerSec = isComplete
      ? 0
      : (solved.velocity * (1 - x0)) / (dur / 1000)

    // Smart Opacity Protection
    if (channel.property === "opacity" && protectOpacity) {
      if (progress > 1) {
        progress = 1
        velocityPerSec = 0
      } else if (progress < 0) {
        progress = 0
        velocityPerSec = 0
      }
    }

    const value = channel.from + (channel.to - channel.from) * progress
    return {
      value,
      progress,
      velocityPerSec,
      isComplete,
    }
  }

  // --------------------------------------------------------------------------
  // 4. Analytical Spring ODE Engine Evaluation
  // --------------------------------------------------------------------------
  const effectiveSpring =
    channel.springMode === "fit"
      ? fitSpringToDurationMs(channel.curve.spring, channel.durationMs)
      : channel.curve.spring

  const x0 = interruption?.x0 ?? 0
  const v0 = interruption?.v0 ?? effectiveSpring.velocity
  const settleMs = computeSpringSettleTimeMs(effectiveSpring, 0.005, x0, v0)
  const isComplete = localElapsed >= settleMs
  const solved = solveSpringAtTime(effectiveSpring, localElapsed, x0, v0)

  let progress = isComplete ? 1 : solved.value
  let velocityPerSec = isComplete ? 0 : solved.velocity

  // Smart Opacity Protection
  if (channel.property === "opacity" && protectOpacity) {
    if (progress > 1) {
      progress = 1
      velocityPerSec = 0
    } else if (progress < 0) {
      progress = 0
      velocityPerSec = 0
    }
  }

  const value = channel.from + (channel.to - channel.from) * progress
  return {
    value,
    progress,
    velocityPerSec,
    isComplete,
  }
}

/**
 * Evaluates an entire choreographed track frame at a given timestamp.
 *
 * Handles:
 * - Multi-channel stagger delays.
 * - Solo (S) channel isolation with sibling rest state preservation.
 * - Aggregated completion check across all active channels.
 *
 * @param options - Evaluation parameters.
 * @returns TrackFrameResult with channel values and complete state.
 */
export function evaluateTrackFrame(
  options: EvaluateTrackOptions
): TrackFrameResult {
  const {
    track,
    elapsedMs,
    soloChannelId,
    isReducedMotion = false,
    protectOpacityOvershoot = true,
    interruptions,
  } = options

  const values: Record<string, number> = {}
  let isComplete = true

  const isSoloActive = Boolean(soloChannelId && soloChannelId !== "all")

  for (const channel of track.channels) {
    if (isSoloActive && channel.id !== soloChannelId) {
      // Sibling channel: lock to visible rest state so the UI element remains visible
      // Entrance: locked at rest destination (channel.to)
      // Exit: locked at rest initial position (channel.from)
      const restValue = track.phase === "exit" ? channel.from : channel.to
      values[channel.id] = restValue
      // Sibling does not block track completion
      continue
    }

    const evalResult = evaluateChannelAtTime(channel, elapsedMs, {
      isReducedMotion,
      protectOpacityOvershoot,
      interruption: interruptions?.[channel.id],
    })

    values[channel.id] = evalResult.value
    if (!evalResult.isComplete) {
      isComplete = false
    }
  }

  return {
    values,
    isComplete,
    elapsedMs,
  }
}

/** Options provided to evaluate an individual Compare contender tile frame. */
export interface EvaluateCompareTileOptions {
  itemCurve: EaseCurve
  track: Pick<TransitionTrackPlugin, "phase" | "channels">
  targetChannelId: string | "all"
  elapsedMs: number
  soloChannelId?: string | null
  isReducedMotion?: boolean
  interruptions?: Record<string, ChannelInterruptSnapshot>
}

/**
 * Evaluates an entire choreographed track frame for a Compare Mode contender tile,
 * substituting the contender's custom/preset curve onto the targeted channel(s).
 *
 * @param options - Contender tile curve, track, channel targeting, elapsed time, and interruptions.
 * @returns TrackFrameResult with computed property values.
 */
export function evaluateCompareTileFrame(
  options: EvaluateCompareTileOptions
): TrackFrameResult {
  const {
    itemCurve,
    track,
    targetChannelId,
    elapsedMs,
    soloChannelId,
    isReducedMotion,
    interruptions,
  } = options

  const substitutedChannels = track.channels.map((channel) => {
    if (targetChannelId === "all" || channel.id === targetChannelId) {
      return {
        ...channel,
        curve: itemCurve,
      }
    }
    return channel
  })

  return evaluateTrackFrame({
    track: {
      phase: track.phase,
      channels: substitutedChannels,
    },
    elapsedMs,
    soloChannelId,
    isReducedMotion,
    interruptions,
  })
}
