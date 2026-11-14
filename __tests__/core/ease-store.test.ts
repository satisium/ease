/**
 * @file __tests__/core/ease-store.test.ts
 * @description Comprehensive end-to-end integration tests for framework-agnostic headless store and master barrel exports.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import * as EaseCore from "@/core"
import { createEaseStore, StorageAdapter } from "@/core/store/create-ease-store"
import { ClockDriver, TrackConductor } from "@/core/clock/track-conductor"

class MockClockDriver implements ClockDriver {
  time = 0
  callbacks = new Map<number, (now: number) => void>()
  private nextId = 1

  now = () => this.time

  requestFrame = (callback: (now: number) => void): number => {
    const id = this.nextId++
    this.callbacks.set(id, callback)
    return id
  }

  cancelFrame = (id: number): void => {
    this.callbacks.delete(id)
  }

  tick = (dtMs: number): void => {
    this.time += dtMs
    const current = Array.from(this.callbacks.values())
    this.callbacks.clear()
    for (const cb of current) {
      cb(this.time)
    }
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  clear(): void {
    this.store.clear()
  }
}

describe("Headless EaseStore Integration (core/store/create-ease-store)", () => {
  it("executes Sam's Fast Flow: focus track, apply curve with Duration Integrity, verify all 4 exports", () => {
    const store = createEaseStore()

    // 1. Focus "drawer:open"
    store.getState().focusTrack("drawer:open")
    expect(store.getState().focusedTrackId).toBe("drawer:open")

    // 2. Focus "translateX" channel and record baseline duration
    store.getState().focusChannel("translateX")
    const channelBefore = store.getState().getFocusedChannel()!
    expect(channelBefore.id).toBe("translateX")
    const baselineDuration = channelBefore.durationMs
    const baselineSaved = channelBefore.savedBezierDurationMs

    // 3. Select "expo-out" preset
    store.getState().selectCurveForFocused("expo-out")
    const channelAfter = store.getState().getFocusedChannel()!
    expect(channelAfter.curve.id).toBe("expo-out")

    // Duration Integrity Law: channel.durationMs and savedBezierDurationMs MUST NOT CHANGE!
    expect(channelAfter.durationMs).toBe(baselineDuration)
    expect(channelAfter.savedBezierDurationMs).toBe(baselineSaved)

    // 4. Verify all 4 code generator exports compile valid snippets
    const tailwindExport = store
      .getState()
      .getActiveExportCode("tailwind", "channel")
    expect(tailwindExport).toContain("transition")

    const cssExport = store.getState().getActiveExportCode("css", "channel")
    expect(cssExport).toContain("transition:")
    expect(cssExport).toContain("cubic-bezier")

    const motionExport = store
      .getState()
      .getActiveExportCode("motion", "channel")
    expect(motionExport).toContain("transition={{")

    const gsapExport = store.getState().getActiveExportCode("gsap", "channel")
    expect(gsapExport).toContain("gsap.to")

    // Track-wide export compilation
    const trackCss = store.getState().getActiveExportCode("css", "track")
    expect(trackCss).toContain("Drawer Sheet (Entrance)")
    expect(trackCss).toContain(".drawer-backdrop")
  })

  it("handles Scoped Track & Auto-Capture: unpinned auto-captures focus; pinned prevents focus theft", () => {
    const driver = new MockClockDriver()
    const conductor = new TrackConductor(driver)
    const store = createEaseStore({ conductor })

    // Unpinned: triggering "dropdown:open" auto-captures focus
    expect(store.getState().isPinned).toBe(false)
    store.getState().triggerLive("dropdown:open")

    expect(store.getState().focusedTrackId).toBe("dropdown:open")
    expect(conductor.getSnapshot().focusedTrackId).toBe("dropdown:open")

    // Pin on "dialog:open"
    store.getState().focusTrack("dialog:open")
    store.getState().setPinned(true)
    expect(store.getState().isPinned).toBe(true)

    // Triggering "dropdown:open" now MUST NOT steal focus
    store.getState().triggerLive("dropdown:open")
    expect(store.getState().focusedTrackId).toBe("dialog:open")
    expect(conductor.getSnapshot().focusedTrackId).toBe("dialog:open")
  })

  it("executes 2-Tier Git Customize Flow: enter, edit, revert, edit, fork to root, fork as variant, promote, delete", () => {
    const store = createEaseStore()

    // 1. Enter customize mode
    store.getState().enterCustomize()
    expect(store.getState().mode).toBe("customize")
    expect(store.getState().draftCurve).not.toBeNull()
    expect(store.getState().draftCurve!.isDirty).toBe(false)

    // 2. Mutate draft and check dirty flag
    store.getState().updateDraft({ suggestedDurationMs: 450 })
    expect(store.getState().draftCurve!.isDirty).toBe(true)

    // 3. Revert draft
    store.getState().revertActiveDraft()
    expect(store.getState().draftCurve!.isDirty).toBe(false)

    // 4. Update draft and fork to custom root
    store.getState().updateDraft({
      bezier: {
        p1: { x: 0.1, y: 1.2 },
        p2: { x: 0.2, y: 1.0 },
      },
    })
    const root = store.getState().forkActiveDraftToRoot("My Sheet")!
    expect(root).not.toBeNull()
    expect(root.name).toBe("My Sheet")
    expect(root.isCustom).toBe(true)
    expect(store.getState().customCurves[0].id).toBe(root.id)

    // 5. Fork as variant under root
    const variant = store
      .getState()
      .forkActiveDraftAsVariant(root.id, "My Sheet Snappy")!
    expect(variant).not.toBeNull()
    expect(variant.parentId).toBe(root.id)
    expect(variant.variants).toBeUndefined() // Max 2-tier invariant!

    const rootAfterVariant = store
      .getState()
      .customCurves.find((c) => c.id === root.id)!
    expect(rootAfterVariant.variants).toHaveLength(1)

    // 6. Promote variant to root (clean move, zero duplicate)
    const promoted = store
      .getState()
      .promoteVariant(root.id, variant.id, "Promoted Sheet")!
    expect(promoted).not.toBeNull()
    expect(promoted.name).toBe("Promoted Sheet")
    expect(promoted.parentId).toBeUndefined()

    const rootAfterPromotion = store
      .getState()
      .customCurves.find((c) => c.id === root.id)!
    expect(rootAfterPromotion.variants).toHaveLength(0)

    // 7. Delete curve safe fallback
    store.getState().deleteCurve(promoted.id)
    expect(
      store.getState().customCurves.some((c) => c.id === promoted.id)
    ).toBe(false)
  })

  it("handles Compare Duel & Wall-Clock Duration synchronization", () => {
    const store = createEaseStore()
    const root = store.getState().customCurves[0]

    // Stage root and variants for comparison duel
    store.getState().stageVariantsToCompare(root.id)
    expect(store.getState().mode).toBe("compare")
    expect(store.getState().compareQueue.length).toBeGreaterThanOrEqual(1)

    // Conductor duration is synchronized with the duel
    const conductorDuration = store.conductor.getSnapshot().totalDurationMs
    expect(conductorDuration).toBeGreaterThan(0)

    // Apply compare winner to stage
    const winner = store.getState().compareQueue[0]
    store.getState().applyCompareWinner(winner.id)

    expect(store.getState().mode).toBe("preview")
    expect(store.getState().getActiveCurve().id).toBe(winner.curve.id)
  })

  it("roundtrips URL Hash and persists state to StorageAdapter", () => {
    const storage = new MemoryStorageAdapter()
    const store = createEaseStore({ storage, storageKey: "ease_app_storage" })

    // 1. Focus track, select preset, change exporter
    store.getState().focusTrack("button:press")
    store.getState().focusChannel("scale")
    store.getState().selectCurveForFocused("material-emphasized")
    store.getState().setPreferredExporter("gsap")

    // 2. Generate share URL hash
    const hash = store.getState().getShareUrlHash()
    expect(decodeURIComponent(hash)).toContain("#t=button:press")
    expect(hash).toContain("ch=scale")
    expect(hash).toContain("e=bezier")

    // 3. New store hydrates from URL hash
    const freshStore = createEaseStore({ initialHash: hash })
    expect(freshStore.getState().focusedTrackId).toBe("button:press")
    expect(freshStore.getState().focusedChannelId).toBe("scale")
    expect(freshStore.getState().getActiveCurve().id).toBe(
      "material-emphasized"
    )

    // 4. Persistence to StorageAdapter
    const saved = storage.getItem("ease_app_storage")
    expect(saved).not.toBeNull()
    expect(saved).toContain('"preferredExporter":"gsap"')

    // 5. Restoring from StorageAdapter
    const hydratedStore = createEaseStore({
      storage,
      storageKey: "ease_app_storage",
    })
    expect(hydratedStore.getState().preferredExporter).toBe("gsap")
  })

  it("executes mid-flight interruption pairing without errors", () => {
    const driver = new MockClockDriver()
    const conductor = new TrackConductor(driver)
    const store = createEaseStore({ conductor })

    // Start live playback on "dialog:open"
    store.getState().triggerLive("dialog:open")
    expect(conductor.getSnapshot().playbackState).toBe("playing")

    // Advance 100ms
    driver.tick(100)

    // Interrupt mid-flight: should automatically retarget to paired "dialog:close"
    store.getState().interruptActive()
    expect(store.getState().focusedTrackId).toBe("dialog:close")
    expect(conductor.getSnapshot().focusedTrackId).toBe("dialog:close")
    expect(conductor.getSnapshot().playbackState).toBe("playing")
  })

  it("imports raw curve string and selects it", () => {
    const store = createEaseStore()
    const imported = store
      .getState()
      .importCurveString("0.25, 0.10, 0.25, 1.00")

    expect(imported).not.toBeNull()
    expect(imported!.engine).toBe("bezier")
    expect(store.getState().getActiveCurve().id).toBe(imported!.id)
  })

  it("computes compare mode duration across all channels and respects tile overrideTrackId", () => {
    const store = createEaseStore()
    store.getState().enterCompare()
    expect(store.getState().globalCompareTarget.channelId).toBe("all")

    // Stage custom root and its variants
    const root = store.getState().customCurves[0]
    store.getState().stageVariantsToCompare(root.id)

    // With dialog:open and channelId="all", duration must be >= 280ms
    // (channels: backdrop 180ms, translateY 40+240=280ms, scale 40+240=280ms)
    // and not 180ms (which was the bug that erroneously took channels[0])
    const compareDuration = store.conductor.getSnapshot().totalDurationMs
    expect(compareDuration).toBeGreaterThanOrEqual(280)

    // Now override the first compare item's track to "drawer:open"
    const firstItemId = store.getState().compareQueue[0].id
    store
      .getState()
      .setCompareTileOverride(firstItemId, { trackId: "drawer:open" })

    // In "drawer:open", translateX duration is 340ms (delay 0ms + 340ms)
    const overriddenDuration = store.conductor.getSnapshot().totalDurationMs
    expect(overriddenDuration).toBeGreaterThanOrEqual(340)

    // Overriding specific channel ID
    store.getState().setCompareTileOverride(firstItemId, {
      trackId: "drawer:open",
      channelId: "backdrop",
    })
    expect(
      store.conductor.getSnapshot().totalDurationMs
    ).toBeGreaterThanOrEqual(280)

    // If global target is set to backdrop on dialog:open, and first item has channelId backdrop on drawer:open
    store
      .getState()
      .setGlobalCompareTarget({ trackId: "dialog:open", channelId: "backdrop" })
    // dialog:open backdrop is 180ms, first item drawer:open backdrop is 240ms -> max is 240ms
    expect(store.conductor.getSnapshot().totalDurationMs).toBe(240)
  })

  it("handles interruptActive with continuous velocity on paired and unpaired tracks", () => {
    const driver = new MockClockDriver()
    const conductor = new TrackConductor(driver)
    const store = createEaseStore({ conductor })

    // Paired track test: dialog:open -> dialog:close
    store.getState().focusTrack("dialog:open")
    store.getState().triggerLive("dialog:open")
    driver.tick(80)

    store.getState().interruptActive()
    expect(store.getState().focusedTrackId).toBe("dialog:close")
    expect(conductor.getSnapshot().focusedTrackId).toBe("dialog:close")
    const pairedInterruptions = conductor.getSnapshot().interruptions
    expect(pairedInterruptions).toBeDefined()
    expect(Object.keys(pairedInterruptions).length).toBeGreaterThan(0)
    for (const snap of Object.values(pairedInterruptions)) {
      expect(typeof snap.x0).toBe("number")
      expect(typeof snap.v0).toBe("number")
    }

    // Unpaired track test: toast:fire has no paired inverse track
    store.getState().focusTrack("toast:fire")
    store.getState().triggerLive("toast:fire")
    driver.tick(60)

    store.getState().interruptActive()
    // Stays on toast:fire (unpaired)
    expect(store.getState().focusedTrackId).toBe("toast:fire")
    const unpairedInterruptions = conductor.getSnapshot().interruptions
    for (const snap of Object.values(unpairedInterruptions)) {
      // Forward continuity on unpaired track preserves forward progress
      expect(snap.x0).toBeGreaterThanOrEqual(0)
      expect(typeof snap.v0).toBe("number")
    }
  })

  it("mutates channel duration, delay, spring mode and resets track bindings", () => {
    const store = createEaseStore()
    store.getState().focusTrack("dialog:open")
    store.getState().focusChannel("translateY")

    // Set duration
    store.getState().setFocusedDurationMs(500)
    expect(store.getState().getFocusedChannel()!.durationMs).toBe(500)

    // Set delay
    store.getState().setFocusedDelayMs(100)
    expect(store.getState().getFocusedChannel()!.delayMs).toBe(100)

    // Set spring mode
    store.getState().setFocusedSpringMode("natural")
    expect(store.getState().getFocusedChannel()!.springMode).toBe("natural")

    // Also test when focusedChannelId is "all"
    store.getState().focusChannel("all")
    store.getState().setFocusedDurationMs(400)
    store.getState().setFocusedDelayMs(50)
    store.getState().setFocusedSpringMode("fit")
    expect(store.getState().trackBindings["dialog:open"][0].durationMs).toBe(
      400
    )
    expect(store.getState().trackBindings["dialog:open"][0].delayMs).toBe(50)
    expect(store.getState().trackBindings["dialog:open"][0].springMode).toBe(
      "fit"
    )

    // Reset focused track
    store.getState().resetFocusedTrack()
    const resetBackdrop = store.getState().trackBindings["dialog:open"][0]
    expect(resetBackdrop.durationMs).toBe(180)
    expect(resetBackdrop.delayMs).toBe(0)
  })

  it("exercises compare queue operations (visibility, remove, reorder, stage active)", () => {
    const store = createEaseStore()
    const root = store.getState().customCurves[0]
    store.getState().stageVariantsToCompare(root.id)

    expect(store.getState().compareQueue.length).toBeGreaterThanOrEqual(1)
    const item0 = store.getState().compareQueue[0]

    // Toggle visibility
    store.getState().toggleCompareItemVisibility(item0.id)
    expect(store.getState().compareQueue[0].visible).toBe(false)
    store.getState().toggleCompareItemVisibility(item0.id)
    expect(store.getState().compareQueue[0].visible).toBe(true)

    // Stage active curve to compare
    store.getState().stageActiveCurveToCompare()
    expect(store.getState().compareQueue.length).toBeGreaterThan(1)

    // Reorder queue
    const len = store.getState().compareQueue.length
    const firstId = store.getState().compareQueue[0].id
    store.getState().reorderCompareItems(0, len - 1)
    expect(store.getState().compareQueue[len - 1].id).toBe(firstId)

    // Remove single item
    store.getState().removeCompareItem(item0.id)
    expect(store.getState().compareQueue.some((i) => i.id === item0.id)).toBe(
      false
    )
  })

  it("exercises workspace UI state, nav stack, search, solo toggle and custom curve mutations", () => {
    const store = createEaseStore()

    // Workspace UI setters
    store.getState().setCustomizePreviewMode("primitives")
    expect(store.getState().customizePreviewMode).toBe("primitives")

    store.getState().setViewport("mobile")
    expect(store.getState().viewport).toBe("mobile")

    store.getState().setExportOpen(true)
    expect(store.getState().isExportOpen).toBe(true)

    store.getState().setExportScope("track")
    expect(store.getState().exportScope).toBe("track")

    store.getState().setReducedMotion(true)
    expect(store.getState().isReducedMotion).toBe(true)
    store.getState().setReducedMotion(false)

    store.getState().setSearchQuery("smooth")
    expect(store.getState().searchQuery).toBe("smooth")

    // Nav stack & drill down
    store.getState().drillIntoCurve("curve-123")
    expect(store.getState().navStack).toEqual({
      level: 1,
      curveId: "curve-123",
    })
    store.getState().backToPresets()
    expect(store.getState().navStack).toEqual({ level: 0 })
    store.getState().setNavStack({ level: 1, curveId: "custom-abc" })
    expect(store.getState().navStack).toEqual({
      level: 1,
      curveId: "custom-abc",
    })

    // Solo channel toggle
    store.getState().focusTrack("dialog:open")
    store.getState().focusChannel("translateY")
    expect(store.getState().isSolo).toBe(false)
    store.getState().toggleSolo()
    expect(store.getState().isSolo).toBe(true)
    store.getState().toggleSolo()
    expect(store.getState().isSolo).toBe(false)

    // Rename curve
    const root = store.getState().customCurves[0]
    store.getState().renameCurve(root.id, "Renamed Curve")
    expect(store.getState().customCurves[0].name).toBe("Renamed Curve")
  })
})

describe("Master Barrel Export Integrity (core/index.ts)", () => {
  it("exports all mathematical solvers and compilers", () => {
    expect(typeof EaseCore.solveBezierAtTime).toBe("function")
    expect(typeof EaseCore.solveSpringAtTime).toBe("function")
    expect(typeof EaseCore.compileSpringToLinearCss).toBe("function")
    expect(typeof EaseCore.compileSpringToSvgPath).toBe("function")
    expect(typeof EaseCore.parseCurveString).toBe("function")
    expect(typeof EaseCore.computeCurveTelemetry).toBe("function")
    expect(typeof EaseCore.evaluateChannelAtTime).toBe("function")
    expect(typeof EaseCore.evaluateTrackFrame).toBe("function")
  })

  it("exports all canonical presets, registries, conductor, and store creator", () => {
    expect(EaseCore.CANONICAL_BEZIER_PRESETS.length).toBeGreaterThan(0)
    expect(EaseCore.CANONICAL_SPRING_PRESETS.length).toBeGreaterThan(0)
    expect(EaseCore.DEFAULT_CUSTOM_CURVES.length).toBeGreaterThan(0)
    expect(EaseCore.trackRegistry).toBeDefined()
    expect(EaseCore.solverRegistry).toBeDefined()
    expect(EaseCore.exporterRegistry).toBeDefined()
    expect(typeof EaseCore.TrackConductor).toBe("function")
    expect(typeof EaseCore.createEaseStore).toBe("function")
  })

  it("guarantees 100% pure TypeScript (zero React/DOM imports) across core", () => {
    const filesToCheck = [
      "core/index.ts",
      "core/schema.ts",
      "core/store/create-ease-store.ts",
      "core/clock/track-conductor.ts",
      "core/codec/url-hash.ts",
      "core/codec/storage.ts",
      "core/codec/search.ts",
    ]

    const stripComments = (str: string) =>
      str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")

    for (const relativePath of filesToCheck) {
      const fullPath = resolve(process.cwd(), relativePath)
      const rawContent = readFileSync(fullPath, "utf8")
      const cleanContent = stripComments(rawContent)

      expect(cleanContent).not.toMatch(/from\s+["']react["']/)
      expect(cleanContent).not.toMatch(/from\s+["']react-dom["']/)
      expect(cleanContent).not.toMatch(/\bwindow\./)
      expect(cleanContent).not.toMatch(/\bdocument\./)
      expect(cleanContent).not.toMatch(/\blocalStorage\./)
    }
  })
})
