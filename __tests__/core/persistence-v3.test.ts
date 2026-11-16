/**
 * @file __tests__/core/persistence-v3.test.ts
 * @description Comprehensive unit & integration tests for Ease v3 Persistence Contract.
 *
 * Invariants tested:
 * 1. Automatic persistence without manual persist() calls when modifying creative work,
 *    channel durations, curve selections, compareQueue, globalCompareTarget, mode, and stack preferences.
 * 2. Fresh store rehydrating from storage restores all creative work, trackBindings,
 *    and stays in "compare" mode, while diagnostic lenses reset to calm defaults.
 * 3. Ignored diagnostic/clock ticks (seek, speed, solo, pin, search) never write to storage.
 * 4. Hydration with initialHash updates targeted track/channel without wiping custom curves or compare queue.
 * 5. Legacy v2 migration gracefully populates defaults without throwing.
 * 6. Empty compareQueue prevents restored "compare" mode (falls back to "preview").
 * 7. Forward-compatible trackBindings overlay user edits over fresh defaults.
 */

import { describe, expect, it, vi } from "vitest"
import {
  createEaseStore,
  deserializeEaseStorage,
  encodeEaseHash,
  mergeTrackBindings,
  trackRegistry,
  type EaseCurve,
  type StorageAdapter,
  type TrackChannelMap,
} from "@/core"

function createMemoryStorage(): {
  storage: StorageAdapter
  map: Map<string, string>
} {
  const map = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
  }
  return { storage, map }
}

describe("Ease v3 Persistence Contract", () => {
  it("automatically persists creative work and preferences on change without manual persist()", () => {
    const { storage, map } = createMemoryStorage()
    const store = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    // 1. Mutate track channel duration
    store.getState().focusTrack("dialog:open")
    store.getState().focusChannel("scale")
    store.getState().setFocusedDurationMs(360)

    // 2. Select curve for channel
    store.getState().selectCurveForFocused("gentle")

    // 3. Stage 3 items to compare queue
    store.getState().stageActiveCurveToCompare()
    store.getState().selectCurveForFocused("snappy-spring")
    store.getState().stageActiveCurveToCompare()
    store.getState().selectCurveForFocused("button")
    store.getState().stageActiveCurveToCompare()

    expect(store.getState().compareQueue.length).toBe(3)

    // 4. Mutate global compare target
    store.getState().setGlobalCompareTarget({
      trackId: "primitives:all",
      channelId: "all",
    })

    // 5. Enter compare mode
    store.getState().enterCompare()
    expect(store.getState().mode).toBe("compare")

    // 6. Mutate viewport & exporter
    store.getState().setViewport("tablet")
    store.getState().setPreferredExporter("gsap")

    // Verify storage was automatically populated
    const raw = map.get("satisium-ease-v3")
    expect(raw).toBeTruthy()

    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(3)
    expect(parsed.mode).toBe("compare")
    expect(parsed.viewport).toBe("tablet")
    expect(parsed.preferredExporter).toBe("gsap")
    expect(parsed.compareQueue.length).toBe(3)
    expect(parsed.globalCompareTarget.trackId).toBe("primitives:all")
    expect(parsed.globalCompareTarget.channelId).toBe("all")

    const dialogScale = parsed.trackBindings["dialog:open"].find(
      (c: { id: string }) => c.id === "scale"
    )
    expect(dialogScale).toBeDefined()
    expect(dialogScale.durationMs).toBe(360)
  })

  it("restores all creative work and remains in compare mode while resetting diagnostic lenses to calm defaults", () => {
    const { storage } = createMemoryStorage()
    const store1 = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    // Setup creative work & location
    store1.getState().focusTrack("dialog:open")
    store1.getState().focusChannel("scale")
    store1.getState().setFocusedDurationMs(360)
    store1.getState().selectCurveForFocused("gentle")
    store1.getState().stageActiveCurveToCompare()
    store1.getState().selectCurveForFocused("snappy-spring")
    store1.getState().stageActiveCurveToCompare()
    store1.getState().setGlobalCompareTarget({
      trackId: "primitives:all",
      channelId: "all",
    })
    store1.getState().enterCompare()
    store1.getState().setViewport("tablet")
    store1.getState().setPreferredExporter("gsap")

    // Dirty diagnostic lenses
    store1.getState().setSpeed(0.5)
    store1.getState().setReducedMotion(true)
    store1.getState().setPinned(true)
    store1.getState().setSearchQuery("gentle")

    // Create fresh store simulating page refresh
    const store2 = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    // Creative work & workspace preserved
    expect(store2.getState().mode).toBe("compare")
    expect(store2.getState().viewport).toBe("tablet")
    expect(store2.getState().preferredExporter).toBe("gsap")
    expect(store2.getState().compareQueue.length).toBe(2)
    expect(store2.getState().globalCompareTarget.trackId).toBe("primitives:all")

    const scaleCh = store2
      .getState()
      .trackBindings["dialog:open"].find((c) => c.id === "scale")
    expect(scaleCh?.durationMs).toBe(360)

    // Diagnostic lenses calm defaults
    expect(store2.getState().isPlaying).toBe(false)
    expect(store2.getState().playbackState).toBe("idle")
    expect(store2.getState().isSolo).toBe(false)
    expect(store2.getState().isPinned).toBe(false)
    expect(store2.getState().speed).toBe(1)
    expect(store2.getState().isReducedMotion).toBe(false)
    expect(store2.getState().isLooping).toBe(false)
    expect(store2.getState().isExportOpen).toBe(false)
    expect(store2.getState().searchQuery).toBe("")
  })

  it("ignores diagnostic and clock ticks so they never trigger storage writes", () => {
    const { storage } = createMemoryStorage()
    const store = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    const setItemSpy = vi.spyOn(storage, "setItem")
    setItemSpy.mockClear()

    // Diagnostic actions
    store.getState().seekScoped(120)
    store.getState().setSpeed(0.5)
    store.getState().toggleSolo()
    store.getState().setSearchQuery("spring")
    store.getState().setPinned(true)
    store.getState().setExportOpen(true)

    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it("applies initialHash without wiping custom curves or compare queue", () => {
    const { storage } = createMemoryStorage()
    const store1 = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    store1.getState().stageActiveCurveToCompare()
    expect(store1.getState().compareQueue.length).toBe(1)

    const customCurve = store1
      .getState()
      .forkPresetToCustom("gentle", "My Brand Spring")
    expect(customCurve).not.toBeNull()

    const hash = encodeEaseHash({
      trackId: "button:press",
      channelId: "scale",
      curveId: "linear",
      engine: "bezier",
      bezier: { p1: { x: 0.25, y: 0.1 }, p2: { x: 0.25, y: 1 } },
      spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
      durationMs: 220,
      springMode: "fit",
    })

    const store2 = createEaseStore({
      storage,
      storageKey: "satisium-ease-v3",
      initialHash: hash,
    })

    // Hash applied
    expect(store2.getState().focusedTrackId).toBe("button:press")
    expect(store2.getState().focusedChannelId).toBe("scale")

    // Creative work preserved
    expect(store2.getState().compareQueue.length).toBe(1)
    expect(
      store2.getState().customCurves.some((c) => c.name === "My Brand Spring")
    ).toBe(true)
  })

  it("migrates legacy v2 storage smoothly with defaults", () => {
    const { storage, map } = createMemoryStorage()

    const legacyV2Payload = JSON.stringify({
      version: 2,
      customCurves: [
        {
          id: "v2-custom-1",
          name: "V2 Brand Spring",
          engine: "bezier",
          bezier: { p1: { x: 0.15, y: 0.85 }, p2: { x: 0.35, y: 1 } },
          suggestedDurationMs: 450,
          isCustom: true,
        },
      ],
      activeTrackId: "drawer:open",
      activeChannelId: "translateY",
      preferredExporter: "motion",
      loopDelayMs: 650,
      mode: "preview",
    })

    // Set under legacy key
    map.set("satisium-ease-v2", legacyV2Payload)

    const store = createEaseStore({ storage, storageKey: "satisium-ease-v3" })

    expect(store.getState().focusedTrackId).toBe("drawer:open")
    expect(store.getState().focusedChannelId).toBe("translateY")
    expect(store.getState().preferredExporter).toBe("motion")
    expect(store.getState().loopDelayMs).toBe(650)
    expect(
      store.getState().customCurves.some((c) => c.name === "V2 Brand Spring")
    ).toBe(true)

    // Compare queue cleanly defaults to empty
    expect(store.getState().compareQueue).toEqual([])
    expect(store.getState().globalCompareTarget.trackId).toBe("dialog:open")
  })

  it("falls back from mode 'compare' to 'preview' if compareQueue is empty on deserialize", () => {
    const emptyCompareJson = JSON.stringify({
      version: 3,
      mode: "compare",
      compareQueue: [],
    })

    const deserialized = deserializeEaseStorage(emptyCompareJson)
    expect(deserialized.mode).toBe("preview")
  })

  it("mergeTrackBindings overlays user edits over fresh defaults", () => {
    const freshDefaults = trackRegistry.list().reduce((acc, track) => {
      acc[track.id] = [...track.channels]
      return acc
    }, {} as TrackChannelMap)

    const customCurve: EaseCurve = {
      id: "custom-test",
      name: "Test",
      engine: "bezier",
      bezier: { p1: { x: 0.2, y: 0.8 }, p2: { x: 0.3, y: 1 } },
      spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
      suggestedDurationMs: 500,
      isCustom: true,
    }

    const savedBindings = {
      "dialog:open": [
        {
          id: "scale",
          curve: customCurve,
          durationMs: 440,
          delayMs: 20,
        },
      ],
    }

    const merged = mergeTrackBindings(savedBindings, freshDefaults)
    const scale = merged["dialog:open"].find((c) => c.id === "scale")
    expect(scale?.durationMs).toBe(440)
    expect(scale?.delayMs).toBe(20)
    expect(scale?.curve.id).toBe("custom-test")

    // Other channels in dialog:open remain with fresh defaults
    const opacity = merged["dialog:open"].find((c) => c.id === "opacity")
    expect(opacity).toBeDefined()
    expect(opacity?.property).toBe("opacity")
  })

  it("migrates legacy exportScope ('channel' -> 'ease', 'track' -> 'snippet')", () => {
    const legacyChannel = deserializeEaseStorage(
      JSON.stringify({ version: 3, exportScope: "channel" })
    )
    expect(legacyChannel.exportScope).toBe("ease")

    const legacyTrack = deserializeEaseStorage(
      JSON.stringify({ version: 3, exportScope: "track" })
    )
    expect(legacyTrack.exportScope).toBe("snippet")

    const modernEase = deserializeEaseStorage(
      JSON.stringify({ version: 3, exportScope: "ease" })
    )
    expect(modernEase.exportScope).toBe("ease")

    const modernSnippet = deserializeEaseStorage(
      JSON.stringify({ version: 3, exportScope: "snippet" })
    )
    expect(modernSnippet.exportScope).toBe("snippet")
  })
})
