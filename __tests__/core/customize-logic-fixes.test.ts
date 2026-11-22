/**
 * @file __tests__/core/customize-logic-fixes.test.ts
 * @description Comprehensive test suite verifying Mode 2 (Customize) logic fixes:
 * 1. enterCustomize() channel promotion (fixing backdrop & blast overwrite)
 * 2. Primitives X-Ray duration synchronization & natural tempo
 * 3. Bidirectional component/primitives stash & restore
 * 4. Mode 2 & Primitives state persistence & hydration
 */

import { describe, expect, it } from "vitest"
import {
  createEaseStore,
  deserializeEaseStorage,
  serializeEaseStorage,
  type StorageAdapter,
} from "@/core"

function createMemoryStorage(
  initialData?: Record<string, string>
): StorageAdapter {
  const store = new Map<string, string>(Object.entries(initialData ?? {}))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  }
}

describe("Mode 2 (Customize) Core Logic Fixes", () => {
  it("promotes focusedChannelId to primary spatial channel on enterCustomize() and modifies ONLY target channel on updateDraft()", () => {
    const store = createEaseStore()

    // 1. Focus dialog:open and set focusedChannelId === 'all'
    store.getState().focusTrack("dialog:open")
    store.getState().focusChannel("all")
    expect(store.getState().focusedChannelId).toBe("all")

    const initialBindings = store.getState().trackBindings["dialog:open"]
    const backdropBefore = initialBindings.find((c) => c.id === "backdrop")!
    const translateYBefore = initialBindings.find((c) => c.id === "translateY")!
    const scaleBefore = initialBindings.find((c) => c.id === "scale")!

    // 2. Enter customize mode
    store.getState().enterCustomize()

    // Focused channel should be automatically promoted to translateY (primary non-opacity channel)
    expect(store.getState().focusedChannelId).toBe("translateY")
    expect(store.getState().mode).toBe("customize")
    expect(store.getState().draftCurve).not.toBeNull()

    // 3. Update the draft curve
    store.getState().updateDraft({
      bezier: {
        p1: { x: 0.12, y: 0.34 },
        p2: { x: 0.56, y: 0.78 },
      },
    })

    const updatedBindings = store.getState().trackBindings["dialog:open"]
    const backdropAfter = updatedBindings.find((c) => c.id === "backdrop")!
    const translateYAfter = updatedBindings.find((c) => c.id === "translateY")!
    const scaleAfter = updatedBindings.find((c) => c.id === "scale")!

    // translateY curve MUST be updated
    expect(translateYAfter.curve).not.toEqual(translateYBefore.curve)
    expect(translateYAfter.curve.bezier.p1).toEqual({ x: 0.12, y: 0.34 })
    expect(translateYAfter.curve.bezier.p2).toEqual({ x: 0.56, y: 0.78 })

    // backdrop and scale curves MUST remain UNTOUCHED (zero blast-overwrite!)
    expect(backdropAfter.curve).toEqual(backdropBefore.curve)
    expect(scaleAfter.curve).toEqual(scaleBefore.curve)
  })

  it("updates state.totalDurationMs cleanly in Primitives mode, honoring natural tempo while preserving real component duration", () => {
    const store = createEaseStore()

    // 1. Focus dialog:close which has a 280ms total compound duration
    store.getState().focusTrack("dialog:close")
    expect(store.getState().totalDurationMs).toBe(280)

    store.getState().enterCustomize()
    expect(store.getState().totalDurationMs).toBe(280)

    // 2. Switch to primitives
    store.getState().setCustomizePreviewMode("primitives")
    expect(store.getState().customizePreviewMode).toBe("primitives")
    expect(store.getState().focusedTrackId).toBe("primitives:all")

    // Duration must NOT be frozen at 280ms
    const activeCurve = store.getState().getActiveCurve()
    expect(store.getState().totalDurationMs).toBe(
      activeCurve.suggestedDurationMs
    )

    // 3. Select 'linear' (suggestedDurationMs: 300)
    store.getState().selectCurveForFocused("linear")
    expect(store.getState().totalDurationMs).toBe(300)

    // 4. Select 'cinematic-slow' (suggestedDurationMs: 500)
    store.getState().selectCurveForFocused("cinematic-slow")
    expect(store.getState().totalDurationMs).toBe(500)

    // 5. Switch back to component mode
    store.getState().setCustomizePreviewMode("component")
    expect(store.getState().focusedTrackId).toBe("dialog:close")
    expect(store.getState().totalDurationMs).toBe(280)

    // On dialog:close, selecting presets preserves the Duration Integrity Law (locked at 280ms)
    store.getState().selectCurveForFocused("linear")
    expect(store.getState().totalDurationMs).toBe(280)
  })

  it("stashes and restores component track and channel cleanly across Primitives toggle", () => {
    const store = createEaseStore()

    store.getState().focusTrack("dialog:open")
    store.getState().focusChannel("translateY")
    store.getState().enterCustomize()

    expect(store.getState().focusedTrackId).toBe("dialog:open")
    expect(store.getState().focusedChannelId).toBe("translateY")

    // Switch to primitives
    store.getState().setCustomizePreviewMode("primitives")
    expect(store.getState().focusedTrackId).toBe("primitives:all")
    expect(store.getState().stashedComponentTrackId).toBe("dialog:open")
    expect(store.getState().stashedComponentChannelId).toBe("translateY")

    // Switch back to component
    store.getState().setCustomizePreviewMode("component")
    expect(store.getState().focusedTrackId).toBe("dialog:open")
    expect(store.getState().focusedChannelId).toBe("translateY")
    expect(store.getState().stashedComponentTrackId).toBeNull()
    expect(store.getState().stashedComponentChannelId).toBeNull()
  })

  it("persists in customize + primitives and hydrates fresh store with mode, previewMode, and draft intact", () => {
    const storage = createMemoryStorage()
    const storageKey = "ease:test:persist"

    const store1 = createEaseStore({ storage, storageKey })
    store1.getState().focusTrack("dialog:open")
    store1.getState().focusChannel("translateY")
    store1.getState().enterCustomize()
    store1.getState().setCustomizePreviewMode("primitives")

    store1.getState().updateDraft({
      bezier: {
        p1: { x: 0.22, y: 0.88 },
        p2: { x: 0.44, y: 0.99 },
      },
    })
    store1.getState().persist()

    const raw = storage.getItem(storageKey)
    expect(raw).not.toBeNull()

    const parsed = deserializeEaseStorage(raw)
    expect(parsed.mode).toBe("customize")
    expect(parsed.customizePreviewMode).toBe("primitives")
    expect(parsed.activeTrackId).toBe("dialog:open")
    expect(parsed.activeChannelId).toBe("translateY")

    // Create a fresh store from the persisted storage
    const store2 = createEaseStore({ storage, storageKey })
    expect(store2.getState().mode).toBe("customize")
    expect(store2.getState().customizePreviewMode).toBe("primitives")
    expect(store2.getState().focusedTrackId).toBe("primitives:all")
    expect(store2.getState().stashedComponentTrackId).toBe("dialog:open")
    expect(store2.getState().stashedComponentChannelId).toBe("translateY")
    expect(store2.getState().draftCurve).not.toBeNull()
    expect(store2.getState().draftCurve?.workingCurve).toBeDefined()
  })

  it("handles serializeEaseStorage and deserializeEaseStorage edge cases safely", () => {
    // 1. null / invalid json fallback
    const fallback = deserializeEaseStorage(null)
    expect(fallback.mode).toBe("preview")
    expect(fallback.customizePreviewMode).toBe("primitives")
    expect(fallback.navStack).toEqual({ level: 0 })

    // 2. compare mode guards back to preview
    const serializedCompare = serializeEaseStorage({
      customCurves: fallback.customCurves,
      activeTrackId: "dialog:open",
      activeChannelId: "scale",
      preferredExporter: "css",
      loopDelayMs: 400,
      mode: "compare",
    })
    const deserializedCompare = deserializeEaseStorage(serializedCompare)
    expect(deserializedCompare.mode).toBe("preview")

    // 3. navStack roundtripping
    const serializedNav = serializeEaseStorage({
      customCurves: fallback.customCurves,
      activeTrackId: "dialog:open",
      activeChannelId: "scale",
      preferredExporter: "tailwind",
      loopDelayMs: 300,
      mode: "preview",
      navStack: { level: 1, curveId: "snappy-spring" },
    })
    const deserializedNav = deserializeEaseStorage(serializedNav)
    expect(deserializedNav.navStack).toEqual({
      level: 1,
      curveId: "snappy-spring",
    })
  })

  it("evaluates honest isDirty in updateDraftMath() and automatically clears Draft * when math matches parent baseline", () => {
    const store = createEaseStore()
    store.getState().focusTrack("dialog:open")
    store.getState().enterCustomize()

    const initialDraft = store.getState().draftCurve
    expect(initialDraft).not.toBeNull()
    expect(initialDraft?.isDirty).toBe(false)

    const parentP1 = { ...initialDraft!.parentCurve.bezier.p1 }

    // 1. Modifying P1 marks isDirty = true
    store.getState().updateDraft({
      bezier: {
        p1: { x: parentP1.x + 0.05, y: parentP1.y + 0.05 },
        p2: initialDraft!.parentCurve.bezier.p2,
      },
    })
    expect(store.getState().draftCurve?.isDirty).toBe(true)

    // 2. Restoring P1 back to exact parent values automatically resets isDirty = false!
    store.getState().updateDraft({
      bezier: {
        p1: parentP1,
        p2: initialDraft!.parentCurve.bezier.p2,
      },
    })
    expect(store.getState().draftCurve?.isDirty).toBe(false)
  })

  it("clamps elapsedMs when totalDurationMs shrinks via setTotalDurationMs(), eliminating timing overflows", () => {
    const store = createEaseStore()
    const conductor = store.conductor

    // Start with 400ms duration and seek to 305ms
    conductor.setTotalDurationMs(400)
    conductor.seek(305)
    expect(conductor.getSnapshot().elapsedMs).toBe(305)

    // Duration shrinks to 280ms (e.g. switching to shorter Primitives or channel)
    conductor.setTotalDurationMs(280)

    const snap = conductor.getSnapshot()
    expect(snap.totalDurationMs).toBe(280)
    expect(snap.elapsedMs).toBe(280)
  })
})
