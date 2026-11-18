/**
 * @file __tests__/core/ui-readiness-a.test.ts
 * @description Unit tests for UI-Readiness Polish Pass A exports.
 *
 * Verifies:
 * - nudgeBezierHandle clamping, precision rounding, and immutability.
 * - Apple perceptual spring (duration + bounce) <-> physical ODE round-trip precision.
 * - POPULAR_PRESET_IDS integrity against canonical catalogs and isPopularPreset lookup.
 * - listComponents grouping (excluding primitives) and deterministic getPairedTrackId lookup.
 */

import { describe, expect, it } from "vitest"

import {
  bounceAndDurationToSpring,
  computeSpringConstants,
  getCanonicalPresetById,
  getPairedTrackId,
  isPopularPreset,
  listComponents,
  nudgeBezierHandle,
  POPULAR_PRESET_IDS,
  springToBounceAndDuration,
} from "@/core"

describe("UI-Readiness Pass A: Mathematical Helpers & Catalog Polish", () => {
  describe("nudgeBezierHandle (core/math/bezier.ts)", () => {
    const baseline = {
      p1: { x: 0.16, y: 1.0 },
      p2: { x: 0.3, y: 1.0 },
    }

    it("nudges p1 cleanly and clamps x strictly to [0, 1]", () => {
      // Nudging X below 0 clamps to 0
      const clampedLow = nudgeBezierHandle(baseline, "p1", -0.5, 0)
      expect(clampedLow.p1.x).toBe(0)
      expect(clampedLow.p1.y).toBe(1.0)
      expect(clampedLow.p2).toEqual(baseline.p2)

      // Nudging X above 1 clamps to 1
      const clampedHigh = nudgeBezierHandle(baseline, "p1", 1.2, 0)
      expect(clampedHigh.p1.x).toBe(1)
    })

    it("permits y coordinates to exceed [0, 1] for overshoot and anticipation", () => {
      // Overshoot (y > 1)
      const overshoot = nudgeBezierHandle(baseline, "p2", 0, 0.4)
      expect(overshoot.p2.y).toBe(1.4)
      expect(overshoot.p2.x).toBe(0.3)

      // Anticipation (y < 0)
      const anticipation = nudgeBezierHandle(baseline, "p1", 0, -1.2)
      expect(anticipation.p1.y).toBe(-0.2)
    })

    it("avoids floating point noise (0.1 + 0.2 === 0.3) via 3-decimal rounding", () => {
      const starting = {
        p1: { x: 0.1, y: 0.1 },
        p2: { x: 0.5, y: 0.5 },
      }
      const nudged = nudgeBezierHandle(starting, "p1", 0.2, 0.2)
      expect(nudged.p1.x).toBe(0.3)
      expect(nudged.p1.y).toBe(0.3)
      // Exact float equality without IEEE 754 epsilon noise
      expect(nudged.p1.x.toString()).toBe("0.3")
    })

    it("returns a new immutable object without mutating the input", () => {
      const original = { p1: { x: 0.2, y: 0.8 }, p2: { x: 0.4, y: 1 } }
      const copy = { ...original }
      const nudged = nudgeBezierHandle(original, "p2", 0.05, 0.05)

      expect(original).toEqual(copy)
      expect(nudged).not.toBe(original)
      expect(nudged.p2.x).toBe(0.45)
    })
  })

  describe("Perceptual Spring <-> ODE Round-Trip (core/math/spring-ode.ts)", () => {
    it("converts (durationMs, bounce) to SpringParams and accurately round-trips back", () => {
      // 1. Underdamped bouncy spring (bounce = 0.15)
      const spring1 = bounceAndDurationToSpring(300, 0.15)
      expect(spring1.mass).toBe(1)
      expect(spring1.stiffness).toBeGreaterThan(0)
      expect(spring1.damping).toBeGreaterThan(0)
      expect(spring1.velocity).toBe(0)

      const roundTrip1 = springToBounceAndDuration(spring1)
      expect(Math.abs(roundTrip1.durationMs - 300)).toBeLessThanOrEqual(1)
      expect(Math.abs(roundTrip1.bounce - 0.15)).toBeLessThanOrEqual(0.002)

      // 2. Critically damped spring (bounce = 0)
      const springCrit = bounceAndDurationToSpring(400, 0)
      const constants = computeSpringConstants(springCrit)
      expect(constants.regime).toBe("critically-damped")
      expect(Math.abs(constants.zeta - 1)).toBeLessThan(1e-4)

      const roundTripCrit = springToBounceAndDuration(springCrit)
      expect(Math.abs(roundTripCrit.durationMs - 400)).toBeLessThanOrEqual(1)
      expect(Math.abs(roundTripCrit.bounce - 0)).toBeLessThanOrEqual(0.002)

      // 3. Overdamped sluggish spring (bounce = -0.2)
      const springOver = bounceAndDurationToSpring(250, -0.2)
      const constsOver = computeSpringConstants(springOver)
      expect(constsOver.regime).toBe("overdamped")
      expect(constsOver.zeta).toBeGreaterThan(1.1)

      const roundTripOver = springToBounceAndDuration(springOver)
      expect(Math.abs(roundTripOver.durationMs - 250)).toBeLessThanOrEqual(1)
      expect(Math.abs(roundTripOver.bounce - -0.2)).toBeLessThanOrEqual(0.002)
    })

    it("defensively clamps extreme input values", () => {
      // Bounce clamped to [-0.5, 0.85]
      const highBounce = bounceAndDurationToSpring(300, 1.5)
      const highBounceParsed = springToBounceAndDuration(highBounce)
      expect(highBounceParsed.bounce).toBe(0.85)

      const lowBounce = bounceAndDurationToSpring(300, -2.0)
      const lowBounceParsed = springToBounceAndDuration(lowBounce)
      expect(lowBounceParsed.bounce).toBe(-0.5)

      // Duration clamped to >= 20ms
      const shortDuration = bounceAndDurationToSpring(5, 0.2)
      const shortParsed = springToBounceAndDuration(shortDuration)
      expect(shortParsed.durationMs).toBe(20)

      // Mass clamped to >= 1e-4
      const tinyMass = bounceAndDurationToSpring(300, 0.1, -5)
      expect(tinyMass.mass).toBe(1e-4)
    })
  })

  describe("Popular Presets Catalog (core/presets/index.ts)", () => {
    it("contains 17 curated IDs that all exist in canonical presets", () => {
      expect(POPULAR_PRESET_IDS.length).toBe(17)

      for (const id of POPULAR_PRESET_IDS) {
        const found = getCanonicalPresetById(id)
        expect(
          found,
          `Expected preset "${id}" to exist in canonical catalog`
        ).toBeDefined()
        expect(isPopularPreset(id)).toBe(true)
      }
    })

    it("accurately identifies non-popular IDs", () => {
      expect(isPopularPreset("non-existent-preset")).toBe(false)
      expect(isPopularPreset("")).toBe(false)
      expect(isPopularPreset("random-curve")).toBe(false)
    })
  })

  describe("Component Groups & Phase Pairing (core/registry/tracks.ts)", () => {
    it("listComponents groups all 21 real UI components excluding primitives", () => {
      const components = listComponents()
      expect(components).toHaveLength(21)

      const componentIds = components.map((c) => c.componentId)
      expect(componentIds).toEqual([
        "dialog",
        "drawer",
        "sheet",
        "dropdown",
        "spotlight",
        "hovercard",
        "button",
        "pill",
        "toast",
        "tabs",
        "cta",
        "sidebar",
        "toggles",
        "input",
        "otp",
        "carousel",
        "accordion",
        "wizard",
        "progress",
        "hero",
        "flipwords",
      ])

      // Strictly excludes primitives X-ray
      expect(componentIds).not.toContain("primitives")

      // Each component has descriptive label and registered tracks
      for (const group of components) {
        expect(group.componentId).toBeTruthy()
        expect(group.componentLabel).toBeTruthy()
        expect(group.tracks.length).toBeGreaterThanOrEqual(1)
        for (const track of group.tracks) {
          expect(track.componentId).toBe(group.componentId)
        }
      }
    })

    it("getPairedTrackId pairs interactive open <-> close tracks and returns null for singles", () => {
      // Dialog pairing
      expect(getPairedTrackId("dialog:open")).toBe("dialog:close")
      expect(getPairedTrackId("dialog:close")).toBe("dialog:open")

      // Drawer pairing
      expect(getPairedTrackId("drawer:open")).toBe("drawer:close")
      expect(getPairedTrackId("drawer:close")).toBe("drawer:open")

      // Dropdown pairing
      expect(getPairedTrackId("dropdown:open")).toBe("dropdown:close")
      expect(getPairedTrackId("dropdown:close")).toBe("dropdown:open")

      // Pill pairing
      expect(getPairedTrackId("pill:expand")).toBe("pill:collapse")
      expect(getPairedTrackId("pill:collapse")).toBe("pill:expand")

      // Sidebar pairing
      expect(getPairedTrackId("sidebar:expand")).toBe("sidebar:collapse")
      expect(getPairedTrackId("sidebar:collapse")).toBe("sidebar:expand")

      // Input pairing
      expect(getPairedTrackId("input:focus")).toBe("input:blur")
      expect(getPairedTrackId("input:blur")).toBe("input:focus")

      // Accordion pairing
      expect(getPairedTrackId("accordion:open")).toBe("accordion:close")
      expect(getPairedTrackId("accordion:close")).toBe("accordion:open")

      // Single-phase tracks return null
      expect(getPairedTrackId("toast:fire")).toBeNull()
      expect(getPairedTrackId("button:press")).toBeNull()
      expect(getPairedTrackId("tabs:switch")).toBeNull()
      expect(getPairedTrackId("cta:press")).toBeNull()
      expect(getPairedTrackId("toggles:press")).toBeNull()
      expect(getPairedTrackId("otp:verify")).toBeNull()
      expect(getPairedTrackId("carousel:slide")).toBeNull()
      expect(getPairedTrackId("wizard:step")).toBeNull()
      expect(getPairedTrackId("progress:run")).toBeNull()
      expect(getPairedTrackId("hero:reveal")).toBeNull()
      expect(getPairedTrackId("flipwords:cycle")).toBeNull()

      // Invalid or empty tracks return null
      expect(getPairedTrackId("")).toBeNull()
      expect(getPairedTrackId("unknown")).toBeNull()
      expect(getPairedTrackId("invalid:open")).toBeNull()
    })
  })
})
