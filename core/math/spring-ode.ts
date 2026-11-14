/**
 * @file core/math/spring-ode.ts
 * @description Pure, deterministic closed-form analytical ODE solver for second-order spring physics:
 * m * d²x/dt² + c * dx/dt + k * (x - 1) = 0
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Exact closed-form calculus across underdamped, critically damped, and overdamped regimes.
 * - Exact analytical velocity derivative (dx/dt in units/sec) for mid-flight momentum preservation (v0).
 * - Apple WWDC23 perceptual duration fitting.
 * - Stable settling time scanner with zero risk of infinite loops.
 */

import { SpringParams } from "../schema"

/** Physical regime classification for a second-order spring system. */
export type SpringRegime = "underdamped" | "critically-damped" | "overdamped"

/** Computed kinetic constants derived from mass, stiffness, and damping. */
export interface SpringConstants {
  mass: number
  stiffness: number
  damping: number
  /** Undamped natural angular frequency ω_n = sqrt(k / m) in rad/s. */
  omegaN: number
  /** Damping ratio ζ = c / (2 * sqrt(k * m)). */
  zeta: number
  /** Damped angular frequency ω_d = ω_n * sqrt(|1 - ζ²|) in rad/s. */
  omegaD: number
  /** Physical regime classification. */
  regime: SpringRegime
}

/**
 * Computes fundamental kinetic constants and classifies the system regime.
 * Defensively clamps mass and stiffness to strictly positive values.
 *
 * @param spring - Spring physical parameters (m, k, c).
 * @returns SpringConstants containing ω_n, ζ, ω_d, and regime.
 */
export function computeSpringConstants(spring: SpringParams): SpringConstants {
  const mass = Math.max(1e-4, spring.mass)
  const stiffness = Math.max(1e-4, spring.stiffness)
  const damping = Math.max(0, spring.damping)

  const omegaN = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))

  let regime: SpringRegime
  if (Math.abs(zeta - 1) <= 1e-5) {
    regime = "critically-damped"
  } else if (zeta < 1 - 1e-5) {
    regime = "underdamped"
  } else {
    regime = "overdamped"
  }

  const omegaD = omegaN * Math.sqrt(Math.abs(1 - zeta * zeta))

  return {
    mass,
    stiffness,
    damping,
    omegaN,
    zeta,
    omegaD,
    regime,
  }
}

/**
 * Solves the closed-form analytical position and instantaneous velocity at elapsedMs.
 * Target resting position is normalized to 1.0.
 *
 * @param spring - Spring parameters.
 * @param elapsedMs - Elapsed time in milliseconds.
 * @param x0 - Initial starting position at t = 0 (default = 0).
 * @param v0 - Initial velocity at t = 0 in units/sec (default = spring.velocity).
 * @returns Object with evaluated position `value` and instantaneous `velocity` (units/sec).
 */
export function solveSpringAtTime(
  spring: SpringParams,
  elapsedMs: number,
  x0 = 0,
  v0 = spring.velocity
): { value: number; velocity: number } {
  // Boundary Condition: t <= 0
  if (elapsedMs <= 0) {
    return { value: x0, velocity: v0 }
  }

  const t = elapsedMs / 1000 // Convert to seconds
  const { omegaN, zeta, omegaD, regime } = computeSpringConstants(spring)
  const A = 1 - x0

  // 1. Underdamped (ζ < 1): Oscillatory decay with overshoot
  if (regime === "underdamped") {
    const safeOmegaD = Math.max(1e-6, omegaD)
    const B = (zeta * omegaN * A - v0) / safeOmegaD

    const decay = Math.exp(-zeta * omegaN * t)
    const cosVal = Math.cos(safeOmegaD * t)
    const sinVal = Math.sin(safeOmegaD * t)

    const displacement = decay * (A * cosVal + B * sinVal)
    const value = 1 - displacement

    // Exact analytical derivative dx/dt:
    const velocity =
      decay *
      ((zeta * omegaN * A - B * safeOmegaD) * cosVal +
        (zeta * omegaN * B + A * safeOmegaD) * sinVal)

    return { value, velocity }
  }

  // 2. Critically Damped (|ζ - 1| <= 1e-5): Fastest non-oscillatory decay
  if (regime === "critically-damped") {
    const decay = Math.exp(-omegaN * t)
    const slopeTerm = omegaN * A - v0

    const displacement = decay * (A + slopeTerm * t)
    const value = 1 - displacement

    // Exact analytical derivative dx/dt:
    const velocity = decay * (v0 + omegaN * slopeTerm * t)

    return { value, velocity }
  }

  // 3. Overdamped (ζ > 1): Sluggish dual-exponential decay
  // Roots: r1 = -ζω_n + ω_d, r2 = -ζω_n - ω_d (both strictly negative)
  const safeOmegaD = Math.max(1e-6, omegaD)
  const r1 = -zeta * omegaN + safeOmegaD
  const r2 = -zeta * omegaN - safeOmegaD

  // Initial conditions:
  // c1 + c2 = -A
  // c1 * r1 + c2 * r2 = v0
  const c1 = (v0 + A * r2) / (2 * safeOmegaD)
  const c2 = (-v0 - A * r1) / (2 * safeOmegaD)

  const exp1 = Math.exp(r1 * t)
  const exp2 = Math.exp(r2 * t)

  const displacement = c1 * exp1 + c2 * exp2
  const value = 1 + displacement

  // Exact analytical derivative dx/dt:
  const velocity = c1 * r1 * exp1 + c2 * r2 * exp2

  return { value, velocity }
}

/**
 * Computes the exact settling time in milliseconds when the spring has arrived within
 * threshold of 1.0 (default 0.5% = 0.005) and remains within that envelope indefinitely.
 *
 * @param spring - Spring parameters.
 * @param threshold - Settlement distance threshold from target (default = 0.005).
 * @param x0 - Initial starting position (default = 0).
 * @param v0 - Initial velocity (default = spring.velocity).
 * @returns Settling time in milliseconds, clamped to [0, 10000].
 */
export function computeSpringSettleTimeMs(
  spring: SpringParams,
  threshold = 0.005,
  x0 = 0,
  v0 = spring.velocity
): number {
  const { omegaN, zeta, omegaD, regime } = computeSpringConstants(spring)

  // Determine slowest decay rate α to set a safe upper horizon
  let alpha: number
  if (regime === "overdamped") {
    alpha = Math.max(1e-4, zeta * omegaN - omegaD)
  } else {
    alpha = Math.max(1e-4, zeta * omegaN)
  }

  // Estimated upper bound horizon where envelope decays to threshold / 10
  const estSeconds = Math.log(10 / Math.max(1e-5, threshold)) / alpha
  const maxHorizonMs = Math.min(
    10000,
    Math.max(100, Math.ceil(estSeconds * 1000 * 1.5))
  )

  // Scan backward from maxHorizonMs to find the last millisecond outside threshold
  for (let ms = maxHorizonMs; ms >= 1; ms--) {
    const { value, velocity } = solveSpringAtTime(spring, ms, x0, v0)
    // Both position and velocity must be settled
    if (
      Math.abs(value - 1) > threshold ||
      Math.abs(velocity) > threshold * omegaN * 1.5
    ) {
      return Math.min(maxHorizonMs, ms + 1)
    }
  }

  return 0
}

/**
 * Maps a spring's damping ratio ζ (its perceptual bounce/settle character) to a target
 * duration interval in milliseconds, following Apple's WWDC23 perceptual spring model.
 *
 * Allows auditioning any spring preset inside an existing component track (e.g. 280ms)
 * without breaking choreographed timing.
 *
 * @param spring - Spring parameters whose damping ratio ζ will be preserved.
 * @param targetDurationMs - Desired duration interval in milliseconds (min 20ms).
 * @returns New SpringParams scaled to fit targetDurationMs.
 */
export function fitSpringToDurationMs(
  spring: SpringParams,
  targetDurationMs: number
): SpringParams {
  const { zeta, mass } = computeSpringConstants(spring)
  const T = Math.max(20, targetDurationMs) / 1000 // In seconds

  // Natural frequency needed to complete in period T:
  // ω_n = 2π / T
  // k = m * ω_n²
  // c = 2 * ζ * sqrt(k * m)
  const omegaN = (2 * Math.PI) / T
  const stiffness = mass * omegaN * omegaN
  const damping = 2 * zeta * Math.sqrt(stiffness * mass)

  return {
    mass,
    stiffness,
    damping,
    velocity: 0,
  }
}

/**
 * Computes exact overshoot, undershoot, and peak bounds of the spring trajectory.
 *
 * @param spring - Spring parameters.
 * @param settleMs - Optional custom evaluation interval (defaults to settleTime).
 * @param x0 - Initial starting position (default = 0).
 * @param v0 - Initial velocity (default = spring.velocity).
 * @returns Object with minY, maxY, overshootPercent, and undershootPercent.
 */
export function computeSpringExtremes(
  spring: SpringParams,
  settleMs?: number,
  x0 = 0,
  v0 = spring.velocity
): {
  minY: number
  maxY: number
  overshootPercent: number
  undershootPercent: number
} {
  const duration = settleMs ?? computeSpringSettleTimeMs(spring, 0.005, x0, v0)
  const safeDuration = Math.max(10, duration)

  let minY = Math.min(x0, 1)
  let maxY = Math.max(x0, 1)

  // Sample at fine resolution across the duration
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const ms = (i / steps) * safeDuration
    const { value } = solveSpringAtTime(spring, ms, x0, v0)
    if (value < minY) minY = value
    if (value > maxY) maxY = value
  }

  // Analytical extrema check for underdamped oscillations
  const { omegaN, zeta, omegaD, regime } = computeSpringConstants(spring)
  if (regime === "underdamped" && omegaD > 1e-6) {
    const A = 1 - x0
    const B = (zeta * omegaN * A - v0) / omegaD

    // Extrema occur where velocity = 0:
    // (ζω_n A - B ω_d) cos(ω_d t) + (ζω_n B + A ω_d) sin(ω_d t) = 0
    // tan(ω_d t) = -(ζω_n A - B ω_d) / (ζω_n B + A ω_d)
    const num = B * omegaD - zeta * omegaN * A
    const den = zeta * omegaN * B + A * omegaD

    let t0 = Math.atan2(num, den) / omegaD
    while (t0 < 0) t0 += Math.PI / omegaD

    // Check first 3 extrema
    for (let k = 0; k < 3; k++) {
      const tPeak = t0 + (k * Math.PI) / omegaD
      const ms = tPeak * 1000
      if (ms > 0 && ms <= safeDuration) {
        const { value } = solveSpringAtTime(spring, ms, x0, v0)
        if (value < minY) minY = value
        if (value > maxY) maxY = value
      }
    }
  }

  const overshootPercent = Math.max(0, (maxY - 1) * 100)
  const undershootPercent = Math.max(0, (0 - minY) * 100)

  return {
    minY,
    maxY,
    overshootPercent,
    undershootPercent,
  }
}

/**
 * Evenly samples the spring trajectory across steps + 1 points for SVG rendering
 * and velocity derivative wave plotting.
 *
 * @param spring - Spring parameters.
 * @param durationMs - Evaluation duration (defaults to settleTime).
 * @param steps - Number of subdivision intervals (default = 60).
 * @param x0 - Initial starting position (default = 0).
 * @param v0 - Initial velocity (default = spring.velocity).
 * @returns Array of sampled t, elapsedMs, value, and velocity.
 */
export function sampleSpringCurve(
  spring: SpringParams,
  durationMs?: number,
  steps = 60,
  x0 = 0,
  v0 = spring.velocity
): Array<{ t: number; elapsedMs: number; value: number; velocity: number }> {
  const totalMs = durationMs ?? computeSpringSettleTimeMs(spring, 0.005, x0, v0)
  const safeTotalMs = Math.max(10, totalMs)
  const safeSteps = Math.max(1, steps)

  const result: Array<{
    t: number
    elapsedMs: number
    value: number
    velocity: number
  }> = []

  for (let i = 0; i <= safeSteps; i++) {
    const progress = i / safeSteps
    const elapsedMs = progress * safeTotalMs
    const { value, velocity } = solveSpringAtTime(spring, elapsedMs, x0, v0)
    result.push({
      t: progress,
      elapsedMs,
      value,
      velocity,
    })
  }

  return result
}

/**
 * Converts Apple / Motion perceptual spring parameters (durationMs, bounce)
 * to exact physical second-order differential equation parameters (mass, stiffness, damping).
 *
 * Physics Model:
 * - Undamped natural frequency: ω_n = 2π / (durationMs / 1000)
 * - Damping ratio: ζ = 1 - bounce
 * - Stiffness: k = mass * ω_n²
 * - Damping: c = 2 * ζ * √(k * mass)
 *
 * Clamps:
 * - mass >= 1e-4
 * - durationMs >= 20
 * - bounce in [-0.5, 0.85] (yielding ζ in [0.15, 1.5])
 *
 * @param durationMs - Undamped period in milliseconds (>= 20ms).
 * @param bounce - Perceptual bounciness factor [-0.5, 0.85].
 * @param mass - System mass (default = 1).
 * @returns Physical SpringParams ready for solveSpringAtTime.
 */
export function bounceAndDurationToSpring(
  durationMs: number,
  bounce: number,
  mass = 1
): SpringParams {
  const safeMass = Math.max(1e-4, mass)
  const safeDurationMs = Math.max(20, durationMs)
  const safeBounce = Math.max(-0.5, Math.min(0.85, bounce))

  const zeta = 1 - safeBounce
  const periodSec = safeDurationMs / 1000
  const omegaN = (2 * Math.PI) / periodSec

  const rawK = safeMass * omegaN * omegaN
  const rawC = 2 * zeta * Math.sqrt(rawK * safeMass)

  return {
    mass: safeMass,
    stiffness: Math.round(rawK * 1000) / 1000,
    damping: Math.round(rawC * 1000) / 1000,
    velocity: 0,
  }
}

/**
 * Converts physical second-order spring parameters (mass, stiffness, damping)
 * into perceptual durationMs and bounce parameters.
 *
 * Invariants:
 * - durationMs = round((2π / ω_n) * 1000)
 * - bounce = round((1 - ζ) * 1000) / 1000
 *
 * @param spring - Physical spring parameters.
 * @returns Perceptual durationMs and bounce.
 */
export function springToBounceAndDuration(spring: SpringParams): {
  durationMs: number
  bounce: number
} {
  const { omegaN, zeta } = computeSpringConstants(spring)
  const durationMs = Math.round(((2 * Math.PI) / omegaN) * 1000)
  const bounce = Math.round((1 - zeta) * 1000) / 1000

  return {
    durationMs,
    bounce,
  }
}
