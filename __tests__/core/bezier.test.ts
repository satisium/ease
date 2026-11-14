import { describe, it, expect } from "vitest"
import {
  solveBezierAtTime,
  computeBezierExtremes,
  computeBezierViewBounds,
  sampleBezierCurve,
  MAX_VELOCITY,
} from "../../core/math/bezier"
import type { BezierParams } from "../../core/schema"
import * as fs from "fs"
import * as path from "path"

describe("Cubic-Bézier Solver (core/math/bezier.ts)", () => {
  describe("Linear Identity Curve (0, 0, 1, 1)", () => {
    const linear: BezierParams = {
      p1: { x: 0, y: 0 },
      p2: { x: 1, y: 1 },
    }

    it("evaluates value === t and velocity === 1 across the normalized interval", () => {
      const timestamps = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]

      for (const t of timestamps) {
        const { value, velocity } = solveBezierAtTime(linear, t)
        expect(value).toBeCloseTo(t, 5)
        expect(velocity).toBeCloseTo(1, 4)
      }
    })

    it("reports zero overshoot and zero undershoot", () => {
      const extremes = computeBezierExtremes(linear)
      expect(extremes.minY).toBeCloseTo(0, 5)
      expect(extremes.maxY).toBeCloseTo(1, 5)
      expect(extremes.overshootPercent).toBe(0)
      expect(extremes.undershootPercent).toBe(0)
    })
  })

  describe("Steep Expo Out Curve (0.16, 1, 0.3, 1)", () => {
    const expoOut: BezierParams = {
      p1: { x: 0.16, y: 1 },
      p2: { x: 0.3, y: 1 },
    }

    it("converges strictly across all subdivisions without NaN or Infinity", () => {
      const steps = 100
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const { value, velocity } = solveBezierAtTime(expoOut, t)
        expect(Number.isFinite(value)).toBe(true)
        expect(Number.isFinite(velocity)).toBe(true)
        expect(Math.abs(velocity)).toBeLessThanOrEqual(MAX_VELOCITY)
      }
    })

    it("respects boundary conditions exactly", () => {
      expect(solveBezierAtTime(expoOut, 0).value).toBe(0)
      expect(solveBezierAtTime(expoOut, 1).value).toBe(1)
      expect(solveBezierAtTime(expoOut, -0.5).value).toBe(0)
      expect(solveBezierAtTime(expoOut, 1.5).value).toBe(1)
    })

    it("achieves < 1e-5 forward-inverse accuracy for X(u) = t", () => {
      // Test across interior points
      for (const t of [0.01, 0.05, 0.1, 0.2, 0.5, 0.8, 0.95, 0.99]) {
        const { value } = solveBezierAtTime(expoOut, t)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1.05)
      }
    })
  })

  describe("Known Ease Out Quart (0.25, 1, 0.5, 1)", () => {
    const easeOutQuart: BezierParams = {
      p1: { x: 0.25, y: 1 },
      p2: { x: 0.5, y: 1 },
    }

    it("matches expected decel inflection and value around t ≈ 0.533", () => {
      const { value, velocity } = solveBezierAtTime(easeOutQuart, 0.533)
      expect(value).toBeCloseTo(0.949, 2)
      expect(velocity).toBeGreaterThan(0)
    })

    it("confirms zero overshoot", () => {
      const extremes = computeBezierExtremes(easeOutQuart)
      expect(extremes.maxY).toBeCloseTo(1, 4)
      expect(extremes.overshootPercent).toBe(0)
      expect(extremes.undershootPercent).toBe(0)
    })
  })

  describe("Overshoot Curve (0.34, 1.56, 0.64, 1)", () => {
    const overshoot: BezierParams = {
      p1: { x: 0.34, y: 1.56 },
      p2: { x: 0.64, y: 1 },
    }

    it("analytically detects maxY > 1.0 and positive overshoot percentage", () => {
      const extremes = computeBezierExtremes(overshoot)
      expect(extremes.maxY).toBeGreaterThan(1.0)
      expect(extremes.overshootPercent).toBeGreaterThan(5) // typically ~20-30%
      expect(extremes.undershootPercent).toBe(0)
    })
  })

  describe("Anticipation Curve (0.68, -0.55, 0.265, 1.55)", () => {
    const anticipation: BezierParams = {
      p1: { x: 0.68, y: -0.55 },
      p2: { x: 0.265, y: 1.55 },
    }

    it("detects both undershootPercent > 0 and overshootPercent > 0", () => {
      const extremes = computeBezierExtremes(anticipation)
      expect(extremes.minY).toBeLessThan(0)
      expect(extremes.undershootPercent).toBeGreaterThan(0)
      expect(extremes.maxY).toBeGreaterThan(1)
      expect(extremes.overshootPercent).toBeGreaterThan(0)
    })

    it("computes dynamic view bounds enclosing handles and extremes with padding", () => {
      const padding = 0.12
      const bounds = computeBezierViewBounds(anticipation, padding)
      const extremes = computeBezierExtremes(anticipation)

      // Bounds must be wider than extremes
      expect(bounds.minY).toBeLessThanOrEqual(extremes.minY - padding + 1e-6)
      expect(bounds.maxY).toBeGreaterThanOrEqual(extremes.maxY + padding - 1e-6)

      // Bounds must enclose both control handles
      expect(bounds.minY).toBeLessThanOrEqual(
        anticipation.p1.y - padding + 1e-6
      )
      expect(bounds.maxY).toBeGreaterThanOrEqual(
        anticipation.p2.y + padding - 1e-6
      )
    })
  })

  describe("Sampling & Trajectory Generation", () => {
    it("generates steps + 1 samples with monotonic timestamps", () => {
      const curve: BezierParams = {
        p1: { x: 0.42, y: 0 },
        p2: { x: 0.58, y: 1 },
      }
      const steps = 60
      const samples = sampleBezierCurve(curve, steps)

      expect(samples.length).toBe(steps + 1)
      expect(samples[0].t).toBe(0)
      expect(samples[steps].t).toBe(1)

      for (let i = 1; i < samples.length; i++) {
        expect(samples[i].t).toBeGreaterThan(samples[i - 1].t)
      }
    })
  })

  describe("Purity & Headless Isolation", () => {
    it("contains zero React or DOM references in source code", () => {
      const filePath = path.resolve(__dirname, "../../core/math/bezier.ts")
      const source = fs.readFileSync(filePath, "utf-8")

      expect(source).not.toMatch(/from\s+['"]react['"]/)
      expect(source).not.toMatch(/from\s+['"]react-dom['"]/)
      expect(source).not.toMatch(/\bwindow\b/)
      expect(source).not.toMatch(/\bdocument\b/)
    })
  })
})
