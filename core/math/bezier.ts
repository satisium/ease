/**
 * @file core/math/bezier.ts
 * @description Pure, deterministic cubic-Bézier solver and velocity derivative engine.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Newton-Raphson solver with automatic binary bisection fallback.
 * - High precision numerical convergence with guarded derivative denominators.
 * - Exact quadratic analytical extrema detection for SVG viewbox auto-zooming.
 */

import { BezierParams } from "../schema"

/** Maximum allowed normalized velocity to guard against vertical tangent division by zero. */
export const MAX_VELOCITY = 20

/**
 * Solves cubic-Bézier progress p = Y(u) and instantaneous normalized velocity v = dY/dX
 * at normalized time t ∈ [0, 1].
 *
 * @param bezier - The Bézier parameters with control handles p1 and p2.
 * @param tNormalized - Normalized timestamp (0.0 = start, 1.0 = end).
 * @returns Object with evaluated value (progress) and instantaneous velocity.
 */
export function solveBezierAtTime(
  bezier: BezierParams,
  tNormalized: number
): { value: number; velocity: number } {
  // Clamp X control handles defensively to [0, 1] per CSS/SVG specifications.
  // Y coordinates remain unconstrained to allow overshoot and anticipation.
  const x1 = Math.min(Math.max(bezier.p1.x, 0), 1)
  const x2 = Math.min(Math.max(bezier.p2.x, 0), 1)
  const y1 = bezier.p1.y
  const y2 = bezier.p2.y

  // Polynomial coefficients for X(u) and Y(u)
  // X(u) = ((a_x * u + b_x) * u + c_x) * u
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx

  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  // --- Boundary Condition: t <= 0 ---
  if (tNormalized <= 0) {
    let v0: number
    if (x1 > 1e-6) {
      v0 = y1 / x1
    } else if (x2 > 1e-6) {
      v0 = y1 !== 0 ? Math.sign(y1) * MAX_VELOCITY : y2 / x2
    } else {
      v0 = y1 !== 0 ? Math.sign(y1) * MAX_VELOCITY : 1
    }
    return {
      value: 0,
      velocity: Math.min(Math.max(v0, -MAX_VELOCITY), MAX_VELOCITY),
    }
  }

  // --- Boundary Condition: t >= 1 ---
  if (tNormalized >= 1) {
    let v1: number
    const dxEnd = 1 - x2
    const dyEnd = 1 - y2
    if (dxEnd > 1e-6) {
      v1 = dyEnd / dxEnd
    } else if (1 - x1 > 1e-6) {
      v1 = dyEnd !== 0 ? Math.sign(dyEnd) * MAX_VELOCITY : (1 - y1) / (1 - x1)
    } else {
      v1 = dyEnd !== 0 ? Math.sign(dyEnd) * MAX_VELOCITY : 1
    }
    return {
      value: 1,
      velocity: Math.min(Math.max(v1, -MAX_VELOCITY), MAX_VELOCITY),
    }
  }

  // --- Root Finding: Solve X(u) = tNormalized for u ∈ [0, 1] ---
  let lo = 0
  let hi = 1
  let u = tNormalized // Standard initial guess

  // 1. Newton-Raphson Iteration (up to 8 steps)
  for (let i = 0; i < 8; i++) {
    const currentX = ((ax * u + bx) * u + cx) * u
    const err = currentX - tNormalized
    if (Math.abs(err) < 1e-7) {
      break
    }

    const dxdt = (3 * ax * u + 2 * bx) * u + cx
    if (Math.abs(dxdt) < 1e-6) {
      // Slope too flat for safe Newton step; fall back to bisection
      break
    }

    const uNext = u - err / dxdt
    if (uNext <= lo || uNext >= hi) {
      // Stepped outside monotonic bracket; fall back to bisection
      break
    }

    if (err > 0) {
      hi = u
    } else {
      lo = u
    }
    u = uNext
  }

  // 2. Binary Bisection Fallback (up to 40 iterations if not yet converged)
  let currentX = ((ax * u + bx) * u + cx) * u
  let err = currentX - tNormalized
  if (Math.abs(err) >= 1e-7) {
    for (let i = 0; i < 40; i++) {
      u = (lo + hi) / 2
      currentX = ((ax * u + bx) * u + cx) * u
      err = currentX - tNormalized
      if (Math.abs(err) < 1e-7) {
        break
      }
      if (err > 0) {
        hi = u
      } else {
        lo = u
      }
    }
  }

  // Evaluate final progress value Y(u)
  const value = ((ay * u + by) * u + cy) * u

  // Evaluate instantaneous velocity v = Y'(u) / X'(u)
  const dxdt = (3 * ax * u + 2 * bx) * u + cx
  const dydt = (3 * ay * u + 2 * by) * u + cy

  let velocity: number
  if (Math.abs(dxdt) < 1e-6) {
    velocity = dydt >= 0 ? MAX_VELOCITY : -MAX_VELOCITY
  } else {
    velocity = Math.min(Math.max(dydt / dxdt, -MAX_VELOCITY), MAX_VELOCITY)
  }

  return { value, velocity }
}

/**
 * Analytically computes the extreme bounds of the Bézier curve by solving
 * the quadratic derivative equation Y'(u) = 0 for u ∈ (0, 1).
 *
 * @param bezier - The Bézier parameters.
 * @returns Object with minY, maxY, overshootPercent, and undershootPercent.
 */
export function computeBezierExtremes(bezier: BezierParams): {
  minY: number
  maxY: number
  overshootPercent: number
  undershootPercent: number
} {
  const y1 = bezier.p1.y
  const y2 = bezier.p2.y

  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  // Candidate roots for extrema: endpoints u=0 (Y=0) and u=1 (Y=1)
  const candidateUs: number[] = [0, 1]

  // Y'(u) = 3 * ay * u² + 2 * by * u + cy = 0
  const A = 3 * ay
  const B = 2 * by
  const C = cy

  if (Math.abs(A) < 1e-9) {
    // Linear derivative: B * u + C = 0
    if (Math.abs(B) > 1e-9) {
      const root = -C / B
      if (root > 0 && root < 1) {
        candidateUs.push(root)
      }
    }
  } else {
    // Quadratic equation
    const discriminant = B * B - 4 * A * C
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant)
      const r1 = (-B - sqrtDisc) / (2 * A)
      const r2 = (-B + sqrtDisc) / (2 * A)
      if (r1 > 0 && r1 < 1) candidateUs.push(r1)
      if (r2 > 0 && r2 < 1) candidateUs.push(r2)
    }
  }

  let minY = 0
  let maxY = 1

  for (const u of candidateUs) {
    const y = ((ay * u + by) * u + cy) * u
    if (y < minY) minY = y
    if (y > maxY) maxY = y
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
 * Computes dynamic SVG auto-zoom viewbox bounds to guarantee that both the curve
 * itself and the draggable control handles (p1, p2) remain fully visible without clipping.
 *
 * @param bezier - The Bézier parameters.
 * @param padding - Normalized margin buffer (default = 0.12).
 * @returns Object with minY and maxY coordinates for the SVG viewBox.
 */
export function computeBezierViewBounds(
  bezier: BezierParams,
  padding = 0.12
): { minY: number; maxY: number } {
  const extremes = computeBezierExtremes(bezier)
  const minY = Math.min(0, 1, extremes.minY, bezier.p1.y, bezier.p2.y) - padding
  const maxY = Math.max(0, 1, extremes.maxY, bezier.p1.y, bezier.p2.y) + padding

  return { minY, maxY }
}

/**
 * Evenly samples the Bézier curve across steps + 1 points for SVG path generation
 * and velocity derivative (dx/dt) graph plotting.
 *
 * @param bezier - The Bézier parameters.
 * @param steps - Number of subdivision intervals (default = 60).
 * @returns Array of sampled time, value, and velocity points.
 */
export function sampleBezierCurve(
  bezier: BezierParams,
  steps = 60
): Array<{ t: number; value: number; velocity: number }> {
  const result: Array<{ t: number; value: number; velocity: number }> = []
  const safeSteps = Math.max(1, steps)

  for (let i = 0; i <= safeSteps; i++) {
    const t = i / safeSteps
    const sample = solveBezierAtTime(bezier, t)
    result.push({
      t,
      value: sample.value,
      velocity: sample.velocity,
    })
  }

  return result
}
