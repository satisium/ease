/**
 * @file core/registry/solvers.ts
 * @description Motion engine solver plugin registry.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Extensible open/closed architecture for future physics engines (e.g. friction, gravity).
 * - Pre-registered with canonical "bezier" and "spring" solvers.
 */

import { EaseCurve, MotionEngine } from "../schema"
import { computeBezierExtremes, solveBezierAtTime } from "../math/bezier"
import { computeSpringExtremes, solveSpringAtTime } from "../math/spring-ode"
import { PluginRegistry } from "./plugin-registry"

/**
 * Contract for a mathematical motion engine solver plugin.
 */
export interface SolverPlugin {
  /** Unique engine identifier ("bezier" | "spring"). */
  id: MotionEngine
  /** Display label for the solver. */
  label: string
  /**
   * Evaluates the motion curve at a given millisecond timestamp.
   *
   * @param curve - Curve definition containing parameters.
   * @param elapsedMs - Wall-clock elapsed time in milliseconds.
   * @param durationMs - Choreographed duration in milliseconds.
   * @param x0 - Initial normalized displacement at handoff (default 0).
   * @param v0 - Initial normalized velocity in units/second at handoff (default 0).
   * @returns Evaluated normalized value and velocity.
   */
  evaluate: (
    curve: EaseCurve,
    elapsedMs: number,
    durationMs: number,
    x0?: number,
    v0?: number
  ) => { value: number; velocity: number }
  /**
   * Computes overshoot, undershoot, and peak bounds for the curve.
   *
   * @param curve - Curve definition.
   * @param durationMs - Optional evaluation window.
   * @returns Extremes and overshoot/undershoot percentages.
   */
  getExtremes: (
    curve: EaseCurve,
    durationMs?: number
  ) => {
    minY: number
    maxY: number
    overshootPercent: number
    undershootPercent: number
  }
}

/** Pre-registered solver registry instance. */
export const solverRegistry = new PluginRegistry<SolverPlugin>()

// Register canonical Bézier solver
solverRegistry.register({
  id: "bezier",
  label: "Cubic Bézier",
  evaluate(curve, elapsedMs, durationMs, x0 = 0) {
    const dur = Math.max(1, durationMs)
    const tNorm = Math.min(1, Math.max(0, elapsedMs / dur))
    const solved = solveBezierAtTime(curve.bezier, tNorm)
    const value = x0 + (1 - x0) * solved.value
    const velocity = (solved.velocity * (1 - x0)) / (dur / 1000)
    return { value, velocity }
  },
  getExtremes(curve) {
    return computeBezierExtremes(curve.bezier)
  },
})

// Register canonical Spring ODE solver
solverRegistry.register({
  id: "spring",
  label: "Analytical ODE Spring",
  evaluate(curve, elapsedMs, _durationMs, x0 = 0, v0 = curve.spring.velocity) {
    return solveSpringAtTime(curve.spring, elapsedMs, x0, v0)
  },
  getExtremes(curve, durationMs) {
    return computeSpringExtremes(curve.spring, durationMs)
  },
})
