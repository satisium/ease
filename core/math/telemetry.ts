/**
 * @file core/math/telemetry.ts
 * @description Real-time physical diagnostics, Git diff calculations, and Duel ranker.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Normalized peak velocities share the exact same dimensionless (1.0x = linear) scale
 *   across both Bézier and Spring curves.
 * - High precision time-to-95% (t95) arrival time calculation (< 0.5ms resolution).
 * - Deterministic, human-readable diff bullets for Customize Mode's Right Flank.
 */

import {
  CurveDiffTelemetry,
  CurveTelemetry,
  DuelEvaluation,
  DuelTileTelemetry,
  EaseCurve,
  SpringDurationMode,
} from "../schema"
import { computeBezierExtremes, solveBezierAtTime } from "./bezier"
import {
  computeSpringConstants,
  computeSpringExtremes,
  computeSpringSettleTimeMs,
  fitSpringToDurationMs,
  solveSpringAtTime,
} from "./spring-ode"

/**
 * Computes comprehensive physical and kinetic telemetry for any EaseCurve.
 *
 * @param curve - The curve to analyze (Bezier or Spring).
 * @param channelDurationMs - Duration window from the component channel.
 * @param springMode - "fit" (Perceptual duration fit) or "natural" (unconstrained ODE).
 * @returns Complete CurveTelemetry diagnostics.
 */
export function computeCurveTelemetry(
  curve: EaseCurve,
  channelDurationMs?: number,
  springMode: SpringDurationMode = "fit"
): CurveTelemetry {
  // --------------------------------------------------------------------------
  // 1. Bézier Engine Diagnostics
  // --------------------------------------------------------------------------
  if (curve.engine === "bezier") {
    const durationMs = Math.max(
      1,
      channelDurationMs ?? curve.suggestedDurationMs ?? 300
    )
    const extremes = computeBezierExtremes(curve.bezier)

    // Sample across 100 points to find peak velocity multiplier
    let maxVelocity = 0
    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const { velocity } = solveBezierAtTime(curve.bezier, t)
      const absV = Math.abs(velocity)
      if (absV > maxVelocity) {
        maxVelocity = absV
      }
    }

    // High precision search for timeTo95Ms (earliest t where value >= 0.95)
    let t95 = 1.0
    const scanSteps = 200
    for (let i = 0; i <= scanSteps; i++) {
      const t = i / scanSteps
      const { value } = solveBezierAtTime(curve.bezier, t)
      if (value >= 0.95) {
        // Refine with binary search between [(i-1)/steps, i/steps]
        let lo = Math.max(0, (i - 1) / scanSteps)
        let hi = t
        for (let iter = 0; iter < 12; iter++) {
          const mid = (lo + hi) / 2
          if (solveBezierAtTime(curve.bezier, mid).value >= 0.95) {
            hi = mid
          } else {
            lo = mid
          }
        }
        t95 = hi
        break
      }
    }

    const timeTo95Ms = Math.round(t95 * durationMs * 10) / 10

    // Classification based on initial vs final velocity derivative slopes
    const vStart = solveBezierAtTime(curve.bezier, 0).velocity
    const vEnd = solveBezierAtTime(curve.bezier, 1).velocity

    let classification: CurveTelemetry["classification"]
    if (
      Math.abs(vStart - 1) < 0.05 &&
      Math.abs(vEnd - 1) < 0.05 &&
      extremes.overshootPercent === 0 &&
      extremes.undershootPercent === 0
    ) {
      classification = "Linear"
    } else if (vStart > vEnd + 0.1) {
      classification = "Decelerating"
    } else if (vEnd > vStart + 0.1) {
      classification = "Accelerating"
    } else {
      classification = "S-Curve"
    }

    return {
      dampingRatio: null,
      naturalFrequency: null,
      settlingTimeMs: durationMs,
      timeTo95Ms,
      peakVelocity: Math.round(maxVelocity * 10) / 10,
      overshootPercent: Math.round(extremes.overshootPercent * 10) / 10,
      classification,
    }
  }

  // --------------------------------------------------------------------------
  // 2. Analytical Spring Engine Diagnostics
  // --------------------------------------------------------------------------
  const effectiveSpring =
    springMode === "fit" && channelDurationMs !== undefined
      ? fitSpringToDurationMs(curve.spring, channelDurationMs)
      : curve.spring

  const constants = computeSpringConstants(effectiveSpring)
  const settlingTimeMs = computeSpringSettleTimeMs(effectiveSpring, 0.005)
  const extremes = computeSpringExtremes(effectiveSpring, settlingTimeMs)

  // Peak normalized velocity: scale physical units/sec by (settlingTimeMs / 1000)
  // so linear baseline = 1.0x, directly comparable to Bézier velocity multipliers
  let maxPhysicalVelocity = 0
  const springSteps = 120
  for (let i = 0; i <= springSteps; i++) {
    const ms = (i / springSteps) * settlingTimeMs
    const { velocity } = solveSpringAtTime(effectiveSpring, ms)
    const absV = Math.abs(velocity)
    if (absV > maxPhysicalVelocity) {
      maxPhysicalVelocity = absV
    }
  }

  const durationSec = settlingTimeMs / 1000
  const normalizedPeakVelocity = maxPhysicalVelocity * durationSec

  // Find timeTo95Ms: earliest ms where spring reaches 0.95
  let t95Ms = settlingTimeMs
  const dtScan = 0.5 // 0.5ms precision scan
  for (let ms = 0; ms <= settlingTimeMs; ms += dtScan) {
    const { value } = solveSpringAtTime(effectiveSpring, ms)
    if (value >= 0.95) {
      t95Ms = ms
      break
    }
  }

  // Map spring regime cleanly to canonical classifications
  let classification: CurveTelemetry["classification"]
  if (constants.regime === "underdamped") {
    classification = "Underdamped"
  } else if (constants.regime === "critically-damped") {
    classification = "Critically Damped"
  } else {
    classification = "Overdamped"
  }

  return {
    dampingRatio: Math.round(constants.zeta * 1000) / 1000,
    naturalFrequency: Math.round(constants.omegaN * 10) / 10,
    settlingTimeMs,
    timeTo95Ms: Math.round(t95Ms * 10) / 10,
    peakVelocity: Math.round(normalizedPeakVelocity * 10) / 10,
    overshootPercent: Math.round(extremes.overshootPercent * 10) / 10,
    classification,
  }
}

/**
 * Computes exact deltas and human-readable summary bullets between a live mutated
 * working curve and its saved baseline parent.
 *
 * @param workingCurve - The live mutated draft curve (*).
 * @param parentCurve - The saved baseline parent.
 * @param channelDurationMs - Duration window from the channel.
 * @param springMode - Reconciliation mode for springs.
 * @returns Real-time CurveDiffTelemetry for Customize Mode's Right Flank.
 */
export function computeCurveDiff(
  workingCurve: EaseCurve,
  parentCurve: EaseCurve,
  channelDurationMs?: number,
  springMode: SpringDurationMode = "fit"
): CurveDiffTelemetry {
  const workingTel = computeCurveTelemetry(
    workingCurve,
    channelDurationMs,
    springMode
  )
  const parentTel = computeCurveTelemetry(
    parentCurve,
    channelDurationMs,
    springMode
  )

  const t95DeltaMs =
    Math.round((workingTel.timeTo95Ms - parentTel.timeTo95Ms) * 10) / 10
  const overshootDeltaPercent =
    Math.round(
      (workingTel.overshootPercent - parentTel.overshootPercent) * 10
    ) / 10
  const peakVelocityDelta =
    Math.round((workingTel.peakVelocity - parentTel.peakVelocity) * 10) / 10

  const summaryBullets: string[] = []

  // Check if identical
  const isIdentical =
    Math.abs(t95DeltaMs) < 0.5 &&
    Math.abs(overshootDeltaPercent) < 0.1 &&
    Math.abs(peakVelocityDelta) < 0.05

  if (isIdentical) {
    summaryBullets.push("Matches parent baseline")
  } else {
    // Arrival time delta
    if (Math.abs(t95DeltaMs) >= 1) {
      if (t95DeltaMs < 0) {
        summaryBullets.push(`${Math.abs(t95DeltaMs)}ms faster t95 arrival`)
      } else {
        summaryBullets.push(`${t95DeltaMs}ms slower t95 arrival`)
      }
    }

    // Overshoot delta
    if (Math.abs(overshootDeltaPercent) >= 0.2) {
      if (overshootDeltaPercent > 0) {
        summaryBullets.push(`+${overshootDeltaPercent}% overshoot`)
      } else {
        summaryBullets.push(`${overshootDeltaPercent}% reduced overshoot`)
      }
    }

    // Peak velocity delta
    if (Math.abs(peakVelocityDelta) >= 0.1) {
      const sign = peakVelocityDelta > 0 ? "+" : ""
      summaryBullets.push(`${sign}${peakVelocityDelta}x peak velocity`)
    }

    // Bézier-specific handle pull delta
    if (workingCurve.engine === "bezier" && parentCurve.engine === "bezier") {
      const p1Dist = Math.hypot(
        workingCurve.bezier.p1.x - parentCurve.bezier.p1.x,
        workingCurve.bezier.p1.y - parentCurve.bezier.p1.y
      )
      if (p1Dist >= 0.05) {
        const sign =
          workingCurve.bezier.p1.x < parentCurve.bezier.p1.x ? "+" : "-"
        summaryBullets.push(`${sign}${p1Dist.toFixed(2)} initial pull change`)
      }
    }

    // Spring-specific stiffness delta
    if (workingCurve.engine === "spring" && parentCurve.engine === "spring") {
      const kDelta =
        workingCurve.spring.stiffness - parentCurve.spring.stiffness
      if (Math.abs(kDelta) >= 10) {
        const sign = kDelta > 0 ? "+" : ""
        summaryBullets.push(`${sign}${Math.round(kDelta)} stiffness`)
      }
    }
  }

  return {
    t95DeltaMs,
    overshootDeltaPercent,
    peakVelocityDelta,
    summaryBullets,
  }
}

/**
 * Benchmarks and ranks all visible contender tiles in Compare (Duel) Mode.
 *
 * @param tiles - Array of contender curve tiles.
 * @returns DuelEvaluation with ranked arrival orders and settle deltas.
 */
export function evaluateDuel(
  tiles: Array<{
    tileId: string
    curve: EaseCurve
    durationMs: number
    springMode?: SpringDurationMode
  }>
): DuelEvaluation {
  if (tiles.length === 0) {
    return {
      tiles: [],
      fastestTileId: "",
      settleDeltaMs: 0,
    }
  }

  // 1. Evaluate telemetry for each contender
  const evaluated = tiles.map((tile) => {
    const sMode = tile.springMode ?? "fit"
    const telemetry = computeCurveTelemetry(tile.curve, tile.durationMs, sMode)
    const effectiveDuration =
      tile.curve.engine === "spring" && sMode === "natural"
        ? telemetry.settlingTimeMs
        : tile.durationMs

    return {
      tileId: tile.tileId,
      curve: tile.curve,
      durationMs: effectiveDuration,
      telemetry,
    }
  })

  // 2. Rank by timeTo95Ms ascending (fastest arrival = rank 1)
  const sorted = [...evaluated].sort((a, b) => {
    if (Math.abs(a.telemetry.timeTo95Ms - b.telemetry.timeTo95Ms) >= 0.5) {
      return a.telemetry.timeTo95Ms - b.telemetry.timeTo95Ms
    }
    // Tie breaker: overall settle time
    return a.telemetry.settlingTimeMs - b.telemetry.settlingTimeMs
  })

  const fastestTileId = sorted[0].tileId

  // Assign ranks and winner status
  const rankedTiles: DuelTileTelemetry[] = evaluated.map((tile) => {
    const rankIndex = sorted.findIndex((s) => s.tileId === tile.tileId)
    const rank = rankIndex + 1
    return {
      tileId: tile.tileId,
      curve: tile.curve,
      durationMs: tile.durationMs,
      telemetry: tile.telemetry,
      rank,
      isWinner: rank === 1,
    }
  })

  // Settle delta: between slowest settling and fastest settling tile
  const settleTimes = evaluated.map((t) => t.durationMs)
  const minSettle = Math.min(...settleTimes)
  const maxSettle = Math.max(...settleTimes)
  const settleDeltaMs = Math.round(maxSettle - minSettle)

  return {
    tiles: rankedTiles,
    fastestTileId,
    settleDeltaMs,
  }
}
