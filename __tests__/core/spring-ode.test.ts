import { describe, it, expect } from "vitest"
import {
  computeSpringConstants,
  solveSpringAtTime,
  computeSpringSettleTimeMs,
  fitSpringToDurationMs,
  computeSpringExtremes,
  sampleSpringCurve,
} from "../../core/math/spring-ode"
import type { SpringParams } from "../../core/schema"
import * as fs from "fs"
import * as path from "path"

describe("Analytical Spring ODE Solver (core/math/spring-ode.ts)", () => {
  // Benchmark Spring: Snappy UI Spring (Apple / Modern Frontend standard)
  const snappySpring: SpringParams = {
    mass: 1,
    stiffness: 860,
    damping: 46,
    velocity: 0,
  }

  // Critically Damped: k = 400, m = 1 -> c = 2 * sqrt(400) = 40
  const criticallyDamped: SpringParams = {
    mass: 1,
    stiffness: 400,
    damping: 40,
    velocity: 0,
  }

  // Overdamped: k = 200, m = 1 -> c_crit = 28.28 -> c = 45 (zeta > 1.5)
  const overdamped: SpringParams = {
    mass: 1,
    stiffness: 200,
    damping: 45,
    velocity: 0,
  }

  describe("Regime Classification & Physical Constants", () => {
    it("accurately classifies underdamped regime and calculates constants", () => {
      const constants = computeSpringConstants(snappySpring)
      expect(constants.regime).toBe("underdamped")
      expect(constants.omegaN).toBeCloseTo(Math.sqrt(860), 4)
      expect(constants.zeta).toBeCloseTo(0.7843, 3)
      expect(constants.omegaD).toBeGreaterThan(0)
    })

    it("accurately classifies critically damped regime", () => {
      const constants = computeSpringConstants(criticallyDamped)
      expect(constants.regime).toBe("critically-damped")
      expect(constants.zeta).toBeCloseTo(1.0, 4)
    })

    it("accurately classifies overdamped regime", () => {
      const constants = computeSpringConstants(overdamped)
      expect(constants.regime).toBe("overdamped")
      expect(constants.zeta).toBeGreaterThan(1.5)
    })
  })

  describe("Initial Conditions and Convergence Across All Regimes", () => {
    const testCases = [
      { name: "Underdamped", spring: snappySpring },
      { name: "Critically Damped", spring: criticallyDamped },
      { name: "Overdamped", spring: overdamped },
    ]

    for (const { name, spring } of testCases) {
      it(`[${name}] starts at x(0) = 0 and v(0) = 0`, () => {
        const atZero = solveSpringAtTime(spring, 0)
        expect(atZero.value).toBe(0)
        expect(atZero.velocity).toBe(0)
      })

      it(`[${name}] converges within 0.005 of target 1.0 at computed settle time`, () => {
        const settleMs = computeSpringSettleTimeMs(spring, 0.005)
        expect(settleMs).toBeGreaterThan(50)
        expect(settleMs).toBeLessThan(10000)

        const atSettle = solveSpringAtTime(spring, settleMs)
        expect(Math.abs(atSettle.value - 1)).toBeLessThanOrEqual(0.005)

        // Beyond settle time, it remains stably settled
        const atLater = solveSpringAtTime(spring, settleMs + 100)
        expect(Math.abs(atLater.value - 1)).toBeLessThanOrEqual(0.005)
      })
    }
  })

  describe("Benchmark Verification (m=1, k=860, c=46)", () => {
    it("matches expected physical metrics: zeta ≈ 0.784, overshoot ≈ 1.88%, settleMs ∈ [220, 260]", () => {
      const constants = computeSpringConstants(snappySpring)
      expect(constants.zeta).toBeCloseTo(0.784, 2)

      const extremes = computeSpringExtremes(snappySpring)
      // Analytical overshoot for zeta=0.784 is exp(-pi*zeta/sqrt(1-zeta^2)) ≈ 1.88%
      expect(extremes.overshootPercent).toBeGreaterThan(1.7)
      expect(extremes.overshootPercent).toBeLessThan(2.1)
      expect(extremes.undershootPercent).toBe(0)

      const settleMs = computeSpringSettleTimeMs(snappySpring, 0.005)
      expect(settleMs).toBeGreaterThanOrEqual(220)
      expect(settleMs).toBeLessThanOrEqual(260)
    })
  })

  describe("Mid-Flight Velocity-Preserving Interrupt (C1 Continuity)", () => {
    it("preserves position and instantaneous velocity seamlessly on mid-flight reversal", () => {
      // 1. Evaluate forward animation at mid-flight: elapsedMs = 60ms
      const tInterruptMs = 60
      const forwardSnap = solveSpringAtTime(snappySpring, tInterruptMs)

      expect(forwardSnap.value).toBeGreaterThan(0.3)
      expect(forwardSnap.value).toBeLessThan(0.9)
      expect(forwardSnap.velocity).toBeGreaterThan(1.0) // Moving fast forward

      const xNow = forwardSnap.value
      const vNow = forwardSnap.velocity

      // 2. Spawn return trajectory toward 0 using exact inverted formula:
      // x_return(t) = 1 - solveSpringAtTime(spring, t, 1 - xNow, -vNow).value
      const returnAtZero =
        1 - solveSpringAtTime(snappySpring, 0, 1 - xNow, -vNow).value

      // C0 continuity: position matches exactly at handoff
      expect(returnAtZero).toBeCloseTo(xNow, 5)

      // C1 continuity: analytical velocity matches exactly at handoff
      const returnVelocityAtZero = -solveSpringAtTime(
        snappySpring,
        0,
        1 - xNow,
        -vNow
      ).velocity
      expect(returnVelocityAtZero).toBeCloseTo(vNow, 5)

      // Numerical finite difference on return trajectory with dt = 0.01ms (1e-5s)
      const dtMs = 0.01
      const xReturnPlus =
        1 - solveSpringAtTime(snappySpring, dtMs, 1 - xNow, -vNow).value
      const numReturnVelocity = (xReturnPlus - returnAtZero) / (dtMs / 1000)

      expect(numReturnVelocity).toBeCloseTo(vNow, 1)
    })
  })

  describe("Analytical Derivative vs Finite-Difference Check", () => {
    it("confirms analytical velocity matches numerical derivative across all 3 regimes", () => {
      const testCases = [snappySpring, criticallyDamped, overdamped]
      const dt = 1e-5 // seconds

      for (const spring of testCases) {
        for (const testSec of [0.05, 0.1, 0.18, 0.28]) {
          const ms = testSec * 1000
          const analytical = solveSpringAtTime(spring, ms)

          const posPlus = solveSpringAtTime(spring, (testSec + dt) * 1000).value
          const posMinus = solveSpringAtTime(
            spring,
            (testSec - dt) * 1000
          ).value
          const numericalVelocity = (posPlus - posMinus) / (2 * dt)

          expect(analytical.velocity).toBeCloseTo(numericalVelocity, 2)
        }
      }
    })
  })

  describe("Perceptual Duration Fitting (Apple WWDC23 Model)", () => {
    it("preserves damping ratio ζ while adapting stiffness for target durations", () => {
      const origConstants = computeSpringConstants(snappySpring)

      const fit280 = fitSpringToDurationMs(snappySpring, 280)
      const fit500 = fitSpringToDurationMs(snappySpring, 500)

      const const280 = computeSpringConstants(fit280)
      const const500 = computeSpringConstants(fit500)

      // Damping ratio must remain identical to preserve bounce feel
      expect(const280.zeta).toBeCloseTo(origConstants.zeta, 4)
      expect(const500.zeta).toBeCloseTo(origConstants.zeta, 4)

      // Shorter duration must have higher stiffness
      expect(const280.stiffness).toBeGreaterThan(const500.stiffness)

      // Both must complete smoothly within their respective windows
      const val280 = solveSpringAtTime(fit280, 280).value
      const val500 = solveSpringAtTime(fit500, 500).value

      expect(Math.abs(val280 - 1)).toBeLessThanOrEqual(0.015)
      expect(Math.abs(val500 - 1)).toBeLessThanOrEqual(0.015)
    })
  })

  describe("Sampling & Trajectory Plotting", () => {
    it("samples monotonic progress and timestamps", () => {
      const samples = sampleSpringCurve(snappySpring, 300, 60)
      expect(samples.length).toBe(61)
      expect(samples[0].elapsedMs).toBe(0)
      expect(samples[60].elapsedMs).toBe(300)

      for (let i = 1; i < samples.length; i++) {
        expect(samples[i].elapsedMs).toBeGreaterThan(samples[i - 1].elapsedMs)
        expect(Number.isFinite(samples[i].value)).toBe(true)
        expect(Number.isFinite(samples[i].velocity)).toBe(true)
      }
    })
  })

  describe("Purity & Headless Isolation", () => {
    it("contains zero React or DOM references in source code", () => {
      const filePath = path.resolve(__dirname, "../../core/math/spring-ode.ts")
      const source = fs.readFileSync(filePath, "utf-8")

      expect(source).not.toMatch(/from\s+['"]react['"]/)
      expect(source).not.toMatch(/from\s+['"]react-dom['"]/)

      const codeWithoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")
      expect(codeWithoutComments).not.toMatch(/\bwindow\b/)
      expect(codeWithoutComments).not.toMatch(/\bdocument\b/)
    })
  })
})
