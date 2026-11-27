/**
 * @file __tests__/core/primitives-duration-sync.test.ts
 * @description Regression test suite verifying Primitives multi-channel duration synchronization
 * and updateDraft duration integrity across position, scale, opacity, and rotate channels.
 */

import { describe, expect, it } from "vitest"
import {
  createEaseStore,
  evaluateTrackFrame,
  setChannelDelayMs,
  setChannelDurationMs,
  setChannelSpringMode,
} from "@/core"

describe("Primitives Multi-Channel Duration Synchronization & Duration Integrity", () => {
  it("updates all channels when setChannelDurationMs, setChannelDelayMs, and setChannelSpringMode receive 'all'", () => {
    const store = createEaseStore()
    const initialBindings = store.getState().trackBindings

    // 1. setChannelDurationMs with 'all'
    const updatedDur = setChannelDurationMs(
      initialBindings,
      "primitives:all",
      "all",
      650
    )
    for (const ch of updatedDur["primitives:all"]) {
      expect(ch.durationMs).toBe(650)
      expect(ch.savedBezierDurationMs).toBe(650)
    }

    // 2. setChannelDelayMs with 'all'
    const updatedDelay = setChannelDelayMs(
      updatedDur,
      "primitives:all",
      "all",
      50
    )
    for (const ch of updatedDelay["primitives:all"]) {
      expect(ch.delayMs).toBe(50)
    }

    // 3. setChannelSpringMode with 'all'
    const updatedSpring = setChannelSpringMode(
      updatedDelay,
      "primitives:all",
      "all",
      "natural"
    )
    for (const ch of updatedSpring["primitives:all"]) {
      expect(ch.springMode).toBe("natural")
    }
  })

  it("sets all 4 channels to 700ms when calling setFocusedDurationMs(700) on primitives:all and updates totalDurationMs", () => {
    const store = createEaseStore()
    store.getState().setCustomizePreviewMode("primitives")
    expect(store.getState().focusedTrackId).toBe("primitives:all")
    expect(store.getState().focusedChannelId).toBe("position")

    // Set duration to 700ms
    store.getState().setFocusedDurationMs(700)

    const channels = store.getState().trackBindings["primitives:all"]
    expect(channels).toHaveLength(4)

    const channelIds = channels.map((c) => c.id)
    expect(channelIds).toEqual(["position", "scale", "opacity", "rotate"])

    for (const ch of channels) {
      expect(ch.durationMs).toBe(700)
      expect(ch.savedBezierDurationMs).toBe(700)
    }

    expect(store.getState().totalDurationMs).toBe(700)
    expect(store.conductor.getSnapshot().totalDurationMs).toBe(700)
  })

  it("preserves 700ms across all 4 channels on updateDraft() without snapping back to 300ms", () => {
    const store = createEaseStore()
    store.getState().focusTrack("primitives:all")
    store.getState().setFocusedDurationMs(700)

    // Enter customize mode with primitives active
    store.getState().enterCustomize()
    expect(store.getState().mode).toBe("customize")
    expect(store.getState().draftCurve).not.toBeNull()

    // Update draft with custom bezier coordinates (simulating handle drag)
    store.getState().updateDraft({
      bezier: { p1: { x: 0.1, y: 1.2 }, p2: { x: 0.4, y: 1 } },
    })

    const channels = store.getState().trackBindings["primitives:all"]
    expect(channels).toHaveLength(4)

    for (const ch of channels) {
      // Must preserve 700ms and NEVER snap back to 300ms!
      expect(ch.durationMs).toBe(700)
      expect(ch.savedBezierDurationMs).toBe(700)
      expect(ch.curve.bezier).toEqual({
        p1: { x: 0.1, y: 1.2 },
        p2: { x: 0.4, y: 1 },
      })
    }

    expect(store.getState().totalDurationMs).toBe(700)
  })

  it("updates springMode across all 4 channels when calling setFocusedSpringMode('natural')", () => {
    const store = createEaseStore()
    store.getState().focusTrack("primitives:all")

    store.getState().setFocusedSpringMode("natural")

    const channels = store.getState().trackBindings["primitives:all"]
    expect(channels).toHaveLength(4)
    for (const ch of channels) {
      expect(ch.springMode).toBe("natural")
    }

    // Switch back to 'fit'
    store.getState().setFocusedSpringMode("fit")
    const channelsFit = store.getState().trackBindings["primitives:all"]
    for (const ch of channelsFit) {
      expect(ch.springMode).toBe("fit")
    }
  })

  it("advances all 4 primitives symmetrically with zero desync when evaluated at 50% (350ms of 700ms)", () => {
    const store = createEaseStore()
    store.getState().focusTrack("primitives:all")
    store.getState().setFocusedDurationMs(700)

    // Standardize all 4 channels with the same custom curve
    store.getState().enterCustomize()
    store.getState().updateDraft({
      bezier: { p1: { x: 0.2, y: 0.8 }, p2: { x: 0.3, y: 1.0 } },
    })

    const channels = store.getState().trackBindings["primitives:all"]

    // Evaluate at exactly 350ms (half-time)
    const frameAtHalf = evaluateTrackFrame({
      track: {
        phase: "state",
        channels: [...channels],
      },
      elapsedMs: 350,
    })

    expect(frameAtHalf.isComplete).toBe(false)

    // Compute normalized progress for each property: (val - from) / (to - from)
    const posProgress = (frameAtHalf.values.position - 0) / (100 - 0)
    const scaleProgress = (frameAtHalf.values.scale - 0.5) / (1.0 - 0.5)
    const opacityProgress = (frameAtHalf.values.opacity - 0) / (1.0 - 0)
    const rotateProgress = (frameAtHalf.values.rotate - 0) / (180 - 0)

    // All channels must have identical progress at 350ms
    expect(posProgress).toBeCloseTo(scaleProgress, 5)
    expect(posProgress).toBeCloseTo(opacityProgress, 5)
    expect(posProgress).toBeCloseTo(rotateProgress, 5)

    // Evaluate at 700ms (completion)
    const frameAtEnd = evaluateTrackFrame({
      track: {
        phase: "state",
        channels: [...channels],
      },
      elapsedMs: 700,
    })

    expect(frameAtEnd.isComplete).toBe(true)
    expect(frameAtEnd.values.position).toBe(100)
    expect(frameAtEnd.values.scale).toBe(1.0)
    expect(frameAtEnd.values.opacity).toBe(1.0)
    expect(frameAtEnd.values.rotate).toBe(180)
  })
})
