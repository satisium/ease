/**
 * @file __tests__/core/ui-readiness-b.test.ts
 * @description Comprehensive test suite for UI-Readiness Polish Pass B (Store ergonomics & zero 120fps re-render).
 */

import { describe, expect, it, vi } from "vitest"
import {
  bounceAndDurationToSpring,
  ClockDriver,
  createEaseStore,
  EaseCurve,
  evaluateCompareTileFrame,
  getCanonicalPresetById,
  getPairedTrackId,
  isPopularPreset,
  listComponents,
  nudgeBezierHandle,
  POPULAR_PRESET_IDS,
  springToBounceAndDuration,
  TrackConductor,
} from "../../core/index"

function createMockClockDriver(): {
  driver: ClockDriver
  advance: (dt: number) => void
  now: () => number
} {
  let currentTime = 1000
  const callbacks = new Map<number, (timestamp: number) => void>()
  let nextId = 1

  return {
    driver: {
      now: () => currentTime,
      requestFrame: (cb) => {
        const id = nextId++
        callbacks.set(id, cb)
        return id
      },
      cancelFrame: (id) => {
        callbacks.delete(id)
      },
    },
    advance: (dt: number) => {
      currentTime += dt
      const cbs = Array.from(callbacks.values())
      callbacks.clear()
      for (const cb of cbs) {
        cb(currentTime)
      }
    },
    now: () => currentTime,
  }
}

describe("UI-Readiness Pass B: Store Ergonomics & 120fps Invariants", () => {
  it("guarantees Zero 120fps Re-renders: Zustand store never updates on conductor time ticks", () => {
    const clock = createMockClockDriver()
    const conductor = new TrackConductor(clock.driver)
    const store = createEaseStore({ conductor })

    const storeListener = vi.fn()
    const unsubscribe = store.subscribe(storeListener)

    // Trigger live animation (300ms)
    store.getState().triggerLive("dialog:open")

    // The live trigger itself updates focusedTrackId/mode/etc and starts playback
    const callsAfterTrigger = storeListener.mock.calls.length
    expect(callsAfterTrigger).toBeGreaterThan(0)

    // Clear listener call history to isolate ticking behavior
    storeListener.mockClear()

    // Step the clock through 10 distinct animation frames (16ms each)
    for (let i = 0; i < 10; i++) {
      clock.advance(16)
    }

    // Verify clock is advancing
    expect(conductor.getSnapshot().elapsedMs).toBe(160)
    expect(conductor.getSnapshot().playbackState).toBe("playing")

    // CRITICAL INVARIANT: The Zustand store must NOT have notified listeners on these ticks!
    expect(storeListener).toHaveBeenCalledTimes(0)

    // Now change a low-frequency field: looping
    store.getState().setLooping(true)
    expect(storeListener).toHaveBeenCalledTimes(1)
    expect(store.getState().isLooping).toBe(true)

    // Change speed
    store.getState().setSpeed(0.5)
    expect(store.getState().speed).toBe(0.5)

    // Finish animation
    clock.advance(500)
    // When playback transitions to "resting" (breather delay), playbackState updates
    expect(store.getState().playbackState).toBe("resting")
    // Scrubber isolation invariant: triggerLive interactionMode is "live", so isPlaying is false
    expect(store.getState().isPlaying).toBe(false)

    // When scrub playback is started via playScoped, isPlaying becomes true
    store.getState().playScoped()
    expect(store.getState().isPlaying).toBe(true)

    // When explicitly paused, playback transitions to "idle" and isPlaying becomes false
    store.getState().pauseScoped()
    expect(store.getState().playbackState).toBe("idle")
    expect(store.getState().isPlaying).toBe(false)

    unsubscribe()
  })

  it("isolates live interaction from scrubber isPlaying: triggerLive keeps isPlaying false while playScoped sets isPlaying true", () => {
    const clock = createMockClockDriver()
    const conductor = new TrackConductor(clock.driver)
    const store = createEaseStore({ conductor })

    // 1. Direct live trigger (e.g. clicking Open Dialog in Habitat)
    store.getState().triggerLive("dialog:open")
    expect(store.getState().playbackState).toBe("playing")
    expect(store.getState().isPlaying).toBe(false)

    // 2. Playback started from TimelineConsole transport (playScoped)
    store.getState().playScoped()
    expect(store.getState().playbackState).toBe("playing")
    expect(store.getState().isPlaying).toBe(true)

    // 3. Paused
    store.getState().pauseScoped()
    expect(store.getState().playbackState).toBe("idle")
    expect(store.getState().isPlaying).toBe(false)
  })

  it("handles playback actions: playScoped, pauseScoped, togglePlayback, seekScoped, setLoopDelayMs", () => {
    const clock = createMockClockDriver()
    const conductor = new TrackConductor(clock.driver)
    const store = createEaseStore({ conductor })

    expect(store.getState().isPlaying).toBe(false)
    expect(store.getState().playbackState).toBe("idle")

    // Play
    store.getState().playScoped()
    expect(store.getState().isPlaying).toBe(true)
    expect(store.getState().playbackState).toBe("playing")

    // Toggle (should pause)
    store.getState().togglePlayback()
    expect(store.getState().isPlaying).toBe(false)
    expect(store.getState().playbackState).toBe("idle")

    // Toggle (should play)
    store.getState().togglePlayback()
    expect(store.getState().isPlaying).toBe(true)

    // Pause
    store.getState().pauseScoped()
    expect(store.getState().isPlaying).toBe(false)

    // Seek
    store.getState().seekScoped(120)
    expect(conductor.getSnapshot().elapsedMs).toBe(120)
    expect(store.getState().playbackState).toBe("scrubbing")

    // Loop delay
    store.getState().setLoopDelayMs(650)
    expect(store.getState().loopDelayMs).toBe(650)
    expect(conductor.getSnapshot().loopDelayMs).toBe(650)
  })

  it("supports Direct Level-0 fork and Level-1 variant addition without active draft", () => {
    const store = createEaseStore()
    expect(store.getState().mode).toBe("preview")
    expect(store.getState().draftCurve).toBeNull()

    // 1. Direct fork from preset
    const createdRoot = store
      .getState()
      .forkPresetToCustom("ease-out-quart", "My Branded Quart")
    expect(createdRoot).not.toBeNull()
    expect(createdRoot?.name).toBe("My Branded Quart")
    expect(createdRoot?.isCustom).toBe(true)
    expect(store.getState().customCurves[0].id).toBe(createdRoot?.id)
    // Crucially: mode and draft remain unaffected
    expect(store.getState().mode).toBe("preview")
    expect(store.getState().draftCurve).toBeNull()

    // 2. Direct variant addition under root
    const createdVariant = store
      .getState()
      .addVariantToRoot(createdRoot!.id, undefined, "Bouncy Alt")
    expect(createdVariant).not.toBeNull()
    expect(createdVariant?.name).toBe("Bouncy Alt")
    expect(createdVariant?.parentId).toBe(createdRoot!.id)

    const updatedRoot = store
      .getState()
      .customCurves.find((c) => c.id === createdRoot!.id)
    expect(updatedRoot?.variants).toHaveLength(1)
    expect(updatedRoot?.variants?.[0].id).toBe(createdVariant?.id)
  })

  it("stashes and restores component track when toggling customizePreviewMode", () => {
    const store = createEaseStore()

    // Focus a non-default component track
    store.getState().focusTrack("drawer:open")
    expect(store.getState().focusedTrackId).toBe("drawer:open")
    expect(store.getState().stashedComponentTrackId).toBeNull()

    // Switch to primitives
    store.getState().setCustomizePreviewMode("primitives")
    expect(store.getState().customizePreviewMode).toBe("primitives")
    expect(store.getState().focusedTrackId).toBe("primitives:all")
    expect(store.getState().stashedComponentTrackId).toBe("drawer:open")

    // Switch back to component
    store.getState().setCustomizePreviewMode("component")
    expect(store.getState().customizePreviewMode).toBe("component")
    expect(store.getState().focusedTrackId).toBe("drawer:open")
    expect(store.getState().stashedComponentTrackId).toBeNull()
  })

  it("evaluates individual Compare contender tile frames with evaluateCompareItemFrame", () => {
    const store = createEaseStore()
    const curve1 = getCanonicalPresetById("expo-out")!
    const curve2 = getCanonicalPresetById("snappy-spring")!

    store.getState().selectCurveForFocused(curve1.id)
    store.getState().stageActiveCurveToCompare()
    store.getState().selectCurveForFocused(curve2.id)
    store.getState().stageActiveCurveToCompare()

    const queue = store.getState().compareQueue
    expect(queue).toHaveLength(2)

    // Evaluate tile 0 at 100ms
    const frame0 = store.getState().evaluateCompareItemFrame(queue[0].id, 100)
    expect(frame0).not.toBeNull()
    expect(frame0?.elapsedMs).toBe(100)
    expect(typeof frame0?.values.backdrop).toBe("number")
    expect(typeof frame0?.values.translateY).toBe("number")
    expect(typeof frame0?.values.scale).toBe("number")

    // Evaluate tile 1 at 100ms
    const frame1 = store.getState().evaluateCompareItemFrame(queue[1].id, 100)
    expect(frame1).not.toBeNull()
    // Different curves should produce different intermediate values
    expect(frame0?.values.scale).not.toBe(frame1?.values.scale)

    // Missing item returns null
    expect(
      store.getState().evaluateCompareItemFrame("non-existent-id")
    ).toBeNull()
  })

  it("executes seamless mid-flight retargeting in Compare Mode", () => {
    const clock = createMockClockDriver()
    const conductor = new TrackConductor(clock.driver)
    const store = createEaseStore({ conductor })

    const curve1 = getCanonicalPresetById("expo-out")!
    store.getState().selectCurveForFocused(curve1.id)
    store.getState().stageActiveCurveToCompare()
    store.getState().enterCompare()

    expect(store.getState().globalCompareTarget.trackId).toBe("dialog:open")

    // Start playback and advance mid-flight
    store.getState().playScoped()
    clock.advance(100)

    // Trigger reversal interruption in Compare Mode
    store.getState().interruptActive()

    // Target track should have flipped to inverse pair "dialog:close"
    expect(store.getState().globalCompareTarget.trackId).toBe("dialog:close")

    // Conductor interruptions should contain contender-scoped interruption snapshots
    const interruptions = conductor.getSnapshot().interruptions
    const queueItemId = store.getState().compareQueue[0].id
    expect(interruptions[`${queueItemId}:translateY`]).toBeDefined()
    expect(interruptions[`${queueItemId}:translateY`].x0).toBeGreaterThan(0)
  })

  it("supports curve override in getActiveExportCode", () => {
    const store = createEaseStore()
    const defaultCode = store
      .getState()
      .getActiveExportCode("tailwind", "channel")
    expect(defaultCode).toContain("transition-")

    const testCurve: EaseCurve = {
      id: "override-curve",
      name: "Override Curve",
      engine: "bezier",
      bezier: { p1: { x: 0.1, y: 0.9 }, p2: { x: 0.2, y: 1 } },
      spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
      suggestedDurationMs: 450,
    }

    const overrideCode = store
      .getState()
      .getActiveExportCode("tailwind", "channel", testCurve)
    expect(overrideCode).toContain("cubic-bezier(0.1,0.9,0.2,1)")

    const trackOverrideCode = store
      .getState()
      .getActiveExportCode("tailwind", "track", testCurve)
    expect(trackOverrideCode).toContain("cubic-bezier(0.1,0.9,0.2,1)")
  })

  it("cleanly exports all Pass A and Pass B symbols from core/index with zero collisions", () => {
    // Pass A symbols
    expect(typeof nudgeBezierHandle).toBe("function")
    expect(typeof bounceAndDurationToSpring).toBe("function")
    expect(typeof springToBounceAndDuration).toBe("function")
    expect(Array.isArray(POPULAR_PRESET_IDS)).toBe(true)
    expect(POPULAR_PRESET_IDS.length).toBeGreaterThan(0)
    expect(typeof isPopularPreset).toBe("function")
    expect(isPopularPreset("expo-out")).toBe(true)
    expect(typeof listComponents).toBe("function")
    expect(listComponents().length).toBeGreaterThan(0)
    expect(typeof getPairedTrackId).toBe("function")
    expect(getPairedTrackId("dialog:open")).toBe("dialog:close")

    // Pass B symbols
    expect(typeof evaluateCompareTileFrame).toBe("function")
    expect(typeof createEaseStore).toBe("function")
  })
})
