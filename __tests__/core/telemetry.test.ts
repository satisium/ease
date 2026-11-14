import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { EaseCurve } from "../../core/schema"
import {
  computeCurveDiff,
  computeCurveTelemetry,
  evaluateDuel,
} from "../../core/math/telemetry"

describe("core/math/telemetry", () => {
  const easeOutQuart: EaseCurve = {
    id: "ease-out-quart",
    name: "Ease Out Quart",
    engine: "bezier",
    bezier: { p1: { x: 0.25, y: 1 }, p2: { x: 0.5, y: 1 } },
    spring: { mass: 1, stiffness: 100, damping: 10, velocity: 0 },
    suggestedDurationMs: 280,
  }

  const expoOut: EaseCurve = {
    id: "expo-out",
    name: "Expo Out",
    engine: "bezier",
    bezier: { p1: { x: 0.16, y: 1 }, p2: { x: 0.3, y: 1 } },
    spring: { mass: 1, stiffness: 100, damping: 10, velocity: 0 },
    suggestedDurationMs: 280,
  }

  const snappySpring: EaseCurve = {
    id: "snappy-spring",
    name: "Snappy Spring",
    engine: "spring",
    bezier: { p1: { x: 0.25, y: 1 }, p2: { x: 0.5, y: 1 } },
    spring: { mass: 1, stiffness: 860, damping: 46, velocity: 0 },
    suggestedDurationMs: 240,
  }

  describe("computeCurveTelemetry - Bézier Curves", () => {
    it("computes physical kinetics for Ease Out Quart at 280ms", () => {
      const tel = computeCurveTelemetry(easeOutQuart, 280)

      expect(tel.settlingTimeMs).toBe(280)
      expect(tel.dampingRatio).toBeNull()
      expect(tel.naturalFrequency).toBeNull()
      expect(tel.overshootPercent).toBe(0)
      expect(tel.classification).toBe("Decelerating")

      // t95 arrival time should be around 149ms (±3ms)
      expect(tel.timeTo95Ms).toBeGreaterThanOrEqual(146)
      expect(tel.timeTo95Ms).toBeLessThanOrEqual(152)

      // Peak velocity for Quart should be decelerating with high initial slope
      expect(tel.peakVelocity).toBeGreaterThan(1.0)
    })

    it("classifies Linear Bézier correctly", () => {
      const linearCurve: EaseCurve = {
        id: "linear",
        name: "Linear",
        engine: "bezier",
        bezier: { p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
        spring: { mass: 1, stiffness: 100, damping: 10, velocity: 0 },
        suggestedDurationMs: 300,
      }
      const tel = computeCurveTelemetry(linearCurve, 300)
      expect(tel.classification).toBe("Linear")
      expect(tel.overshootPercent).toBe(0)
      expect(tel.timeTo95Ms).toBeCloseTo(285, 0)
    })
  })

  describe("computeCurveTelemetry - Spring Curves", () => {
    it("computes physical kinetics for Snappy Spring in natural mode", () => {
      const tel = computeCurveTelemetry(snappySpring, undefined, "natural")

      // Underdamped regime
      expect(tel.classification).toBe("Underdamped")

      // Damping ratio zeta = 46 / (2 * sqrt(860)) ≈ 0.784
      expect(tel.dampingRatio).toBeCloseTo(0.784, 2)

      // Natural frequency omega_n = sqrt(860) ≈ 29.3 rad/s
      expect(tel.naturalFrequency).toBeCloseTo(29.3, 1)

      // Overshoot for zeta ~ 0.784 is approx 1.9%
      expect(tel.overshootPercent).toBeGreaterThanOrEqual(1.5)
      expect(tel.overshootPercent).toBeLessThanOrEqual(2.5)

      // Time to 95% arrival around 112ms (±5ms)
      expect(tel.timeTo95Ms).toBeGreaterThanOrEqual(107)
      expect(tel.timeTo95Ms).toBeLessThanOrEqual(117)

      // Settling time around 220–260ms
      expect(tel.settlingTimeMs).toBeGreaterThanOrEqual(220)
      expect(tel.settlingTimeMs).toBeLessThanOrEqual(260)

      // Normalized peak velocity should be a positive finite multiplier
      expect(tel.peakVelocity).toBeGreaterThan(0)
    })

    it("fits spring duration when mode is 'fit'", () => {
      const tel = computeCurveTelemetry(snappySpring, 400, "fit")
      // In fit mode with duration 400ms, stiffness and damping are scaled
      // preserving damping ratio
      expect(tel.dampingRatio).toBeCloseTo(0.784, 2)
      expect(tel.settlingTimeMs).toBeGreaterThanOrEqual(400)
      expect(tel.settlingTimeMs).toBeLessThanOrEqual(480)
    })
  })

  describe("computeCurveDiff - Working vs Baseline", () => {
    it("returns 'Matches parent baseline' for identical curves", () => {
      const diff = computeCurveDiff(easeOutQuart, easeOutQuart, 280)
      expect(diff.t95DeltaMs).toBe(0)
      expect(diff.overshootDeltaPercent).toBe(0)
      expect(diff.peakVelocityDelta).toBe(0)
      expect(diff.summaryBullets).toContain("Matches parent baseline")
    })

    it("detects faster t95 arrival when comparing Expo Out to Ease Out Quart", () => {
      const diff = computeCurveDiff(expoOut, easeOutQuart, 280)
      expect(diff.t95DeltaMs).toBeLessThan(0) // Faster arrival
      expect(diff.summaryBullets.length).toBeGreaterThan(0)
      expect(
        diff.summaryBullets.some((b) => b.includes("faster t95 arrival"))
      ).toBe(true)
    })

    it("detects stiffness delta when comparing two spring curves", () => {
      const stifferSpring: EaseCurve = {
        ...snappySpring,
        spring: { ...snappySpring.spring, stiffness: 1000 },
      }
      const diff = computeCurveDiff(
        stifferSpring,
        snappySpring,
        undefined,
        "natural"
      )
      expect(diff.summaryBullets.some((b) => b.includes("stiffness"))).toBe(
        true
      )
    })
  })

  describe("evaluateDuel - Compare Mode Tile Ranker", () => {
    it("evaluates and ranks tiles with fastest arrival as rank 1 winner", () => {
      const duel = evaluateDuel([
        {
          tileId: "snappy-tile",
          curve: snappySpring,
          durationMs: 240,
          springMode: "natural",
        },
        {
          tileId: "quart-tile",
          curve: easeOutQuart,
          durationMs: 280,
          springMode: "fit",
        },
      ])

      expect(duel.tiles).toHaveLength(2)
      // Snappy Spring reaches 95% at ~112ms, Ease Out Quart at ~149ms
      expect(duel.fastestTileId).toBe("snappy-tile")

      const snappyResult = duel.tiles.find((t) => t.tileId === "snappy-tile")
      const quartResult = duel.tiles.find((t) => t.tileId === "quart-tile")

      expect(snappyResult?.rank).toBe(1)
      expect(snappyResult?.isWinner).toBe(true)
      expect(quartResult?.rank).toBe(2)
      expect(quartResult?.isWinner).toBe(false)

      expect(duel.settleDeltaMs).toBeGreaterThan(0)
    })

    it("handles empty tile array gracefully", () => {
      const duel = evaluateDuel([])
      expect(duel.tiles).toHaveLength(0)
      expect(duel.fastestTileId).toBe("")
      expect(duel.settleDeltaMs).toBe(0)
    })
  })

  describe("Architectural Purity", () => {
    it("has zero React, DOM, or browser global references in telemetry.ts", () => {
      const filePath = resolve(process.cwd(), "core/math/telemetry.ts")
      const rawContent = readFileSync(filePath, "utf-8")

      // Strip comments before purity check to avoid matching English words
      const codeOnly = rawContent
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")

      expect(codeOnly).not.toMatch(/\bwindow\b/)
      expect(codeOnly).not.toMatch(/\bdocument\b/)
      expect(codeOnly).not.toMatch(/\bHTMLElement\b/)
      expect(codeOnly).not.toMatch(/from\s+["']react["']/)
      expect(codeOnly).not.toMatch(/from\s+["']react-dom["']/)
    })
  })
})
