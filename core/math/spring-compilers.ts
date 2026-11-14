/**
 * @file core/math/spring-compilers.ts
 * @description Compiles analytical spring ODE trajectories into standardized web formats:
 * 1. CSS linear(...) easing function with extrema-preserving Ramer–Douglas–Peucker reduction.
 * 2. C1-continuous normalized SVG cubic-Bézier path (M0,0 C... 1,1) for GSAP CustomEase.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Overshoot peaks and valleys are strictly preserved as mandatory anchors.
 * - Zero divide-by-zero or NaN output.
 */

import { SpringParams } from "../schema"
import { computeSpringSettleTimeMs, sampleSpringCurve } from "./spring-ode"

/** A 2D point with normalized time and displacement value. */
export interface SimplifiedPoint {
  t: number
  value: number
  velocity?: number
}

/**
 * Simplifies sampled spring trajectory using Ramer–Douglas–Peucker (RDP) while
 * locking all local extrema (peaks and valleys) as mandatory anchors.
 *
 * @param samples - Raw sampled points from sampleSpringCurve.
 * @param tolerance - Maximum allowed perpendicular deviation (default = 0.002).
 * @returns Array of simplified anchor points including exact endpoints and extrema.
 */
export function simplifySpringSamples(
  samples: Array<{
    t: number
    elapsedMs: number
    value: number
    velocity: number
  }>,
  tolerance = 0.002
): SimplifiedPoint[] {
  if (samples.length <= 2) {
    return samples.map((s) => ({
      t: s.t,
      value: s.value,
      velocity: s.velocity,
    }))
  }

  // 1. Identify all local extrema indices to protect bounce peaks from being smoothed out
  const anchorIndices: number[] = [0]

  for (let i = 1; i < samples.length - 1; i++) {
    const prev = samples[i - 1].value
    const curr = samples[i].value
    const next = samples[i + 1].value

    // Extrema: slope sign change
    const isPeak = curr > prev && curr >= next
    const isValley = curr < prev && curr <= next

    if (isPeak || isValley) {
      anchorIndices.push(i)
    }
  }

  anchorIndices.push(samples.length - 1)

  // 2. Recursive RDP reduction between consecutive anchor points
  function rdpSegment(startIdx: number, endIdx: number): number[] {
    if (endIdx - startIdx <= 1) {
      return [startIdx]
    }

    const pStart = samples[startIdx]
    const pEnd = samples[endIdx]

    const dt = pEnd.t - pStart.t
    const dy = pEnd.value - pStart.value
    const lineLenSq = dt * dt + dy * dy

    let maxDist = 0
    let maxIdx = startIdx

    for (let i = startIdx + 1; i < endIdx; i++) {
      const p = samples[i]
      let dist: number

      if (lineLenSq < 1e-12) {
        dist = Math.hypot(p.t - pStart.t, p.value - pStart.value)
      } else {
        // Perpendicular distance from point p to line (pStart -> pEnd)
        const cross = Math.abs(
          dy * p.t -
            dt * p.value +
            pEnd.t * pStart.value -
            pEnd.value * pStart.t
        )
        dist = cross / Math.sqrt(lineLenSq)
      }

      if (dist > maxDist) {
        maxDist = dist
        maxIdx = i
      }
    }

    if (maxDist > tolerance) {
      const left = rdpSegment(startIdx, maxIdx)
      const right = rdpSegment(maxIdx, endIdx)
      return [...left, ...right]
    }

    return [startIdx]
  }

  const selectedIndices: number[] = []
  for (let a = 0; a < anchorIndices.length - 1; a++) {
    const segment = rdpSegment(anchorIndices[a], anchorIndices[a + 1])
    selectedIndices.push(...segment)
  }
  selectedIndices.push(samples.length - 1)

  // Remove duplicates and sort
  const uniqueIndices = Array.from(new Set(selectedIndices)).sort(
    (x, y) => x - y
  )

  return uniqueIndices.map((idx) => ({
    t: samples[idx].t,
    value: samples[idx].value,
    velocity: samples[idx].velocity,
  }))
}

/** Options for compiling springs into CSS / SVG strings. */
export interface SpringCompileOptions {
  /** Target duration window in milliseconds (defaults to computeSpringSettleTimeMs). */
  durationMs?: number
  /** RDP reduction tolerance (defaults to 0.002). */
  tolerance?: number
}

/** Result of CSS linear() compilation. */
export interface LinearCssResult {
  /** Valid CSS linear(...) function string. */
  linearCss: string
  /** Duration in milliseconds that accompanies this linear easing. */
  durationMs: number
  /** The reduced set of simplified points. */
  points: SimplifiedPoint[]
}

/**
 * Formats a number cleanly, stripping superfluous trailing zeros.
 * @param num - Floating point number.
 * @param precision - Maximum decimal digits.
 */
function formatNumber(num: number, precision = 4): string {
  const rounded = Number(num.toFixed(precision))
  return rounded.toString()
}

/**
 * Compiles an analytical spring into an optimized CSS `linear(...)` easing string.
 *
 * Output format:
 * `linear(0, 0.36 12%, 0.89 30%, 1.019 52.5%, 1)`
 *
 * @param spring - Spring physical parameters.
 * @param options - Compilation options (durationMs, tolerance).
 * @returns Object with linearCss, durationMs, and simplified points.
 */
export function compileSpringToLinearCss(
  spring: SpringParams,
  options?: SpringCompileOptions
): LinearCssResult {
  const durationMs =
    options?.durationMs ?? computeSpringSettleTimeMs(spring, 0.005)
  const safeDurationMs = Math.max(20, durationMs)
  const tolerance = options?.tolerance ?? 0.002

  // Sample 120 points for high initial fidelity
  const rawSamples = sampleSpringCurve(spring, safeDurationMs, 120)
  const simplified = simplifySpringSamples(rawSamples, tolerance)

  const pointStrings: string[] = []

  for (let i = 0; i < simplified.length; i++) {
    const pt = simplified[i]

    if (i === 0) {
      // First point is always exact 0
      pointStrings.push("0")
    } else if (i === simplified.length - 1) {
      // Final point is always exact 1
      pointStrings.push("1")
    } else {
      const valStr = formatNumber(pt.value, 3)
      const pctStr = formatNumber(pt.t * 100, 1) + "%"
      pointStrings.push(`${valStr} ${pctStr}`)
    }
  }

  return {
    linearCss: `linear(${pointStrings.join(", ")})`,
    durationMs: safeDurationMs,
    points: simplified,
  }
}

/**
 * Compiles an analytical spring into a C1-continuous normalized SVG cubic-Bézier path:
 * `M0,0 C<cx1>,<cy1> <cx2>,<cy2> <x>,<y> ... 1,1`
 *
 * Ready for GSAP `CustomEase.create(...)`.
 *
 * @param spring - Spring physical parameters.
 * @param options - Compilation options (durationMs, tolerance).
 * @returns SVG path string starting at M0,0 and ending at 1,1.
 */
export function compileSpringToSvgPath(
  spring: SpringParams,
  options?: SpringCompileOptions
): string {
  const durationMs =
    options?.durationMs ?? computeSpringSettleTimeMs(spring, 0.005)
  const safeDurationMs = Math.max(20, durationMs)
  const tolerance = options?.tolerance ?? 0.002

  // Sample 100 points
  const rawSamples = sampleSpringCurve(spring, safeDurationMs, 100)
  const simplified = simplifySpringSamples(rawSamples, tolerance)

  if (simplified.length <= 1) {
    return "M0,0 C0.25,0.1 0.25,1 1,1"
  }

  // Velocity units/sec must be scaled by duration in seconds to yield dy/dt on normalized [0, 1] x [0, 1]
  const durationSec = safeDurationMs / 1000

  let pathString = "M0,0"

  for (let i = 0; i < simplified.length - 1; i++) {
    const p0 = simplified[i]
    const p1 = simplified[i + 1]

    const dt = p1.t - p0.t
    const slope0 = (p0.velocity ?? 0) * durationSec
    const slope1 = (p1.velocity ?? 0) * durationSec

    // Hermite-to-Bezier control points
    const cx1 = p0.t + dt / 3
    const cy1 = p0.value + slope0 * (dt / 3)

    const cx2 = p1.t - dt / 3
    const cy2 = p1.value - slope1 * (dt / 3)

    const endX = i === simplified.length - 2 ? "1" : formatNumber(p1.t, 4)
    const endY = i === simplified.length - 2 ? "1" : formatNumber(p1.value, 4)

    pathString += ` C${formatNumber(cx1, 4)},${formatNumber(cy1, 4)} ${formatNumber(cx2, 4)},${formatNumber(cy2, 4)} ${endX},${endY}`
  }

  return pathString
}
