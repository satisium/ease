import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../../core/presets/index"
import { trackRegistry } from "../../core/registry/tracks"
import { EaseCurve } from "../../core/schema"
import {
  reorderCompareQueue,
  removeFromCompare,
  setTileOverride,
  stageCurveToCompare,
  stageVariantsForCompare,
  toggleCompareVisibility,
} from "../../core/state/compare-reducers"
import {
  commitDraft,
  deleteCurveNode,
  findCurveInCustomTree,
  forkAsVariant,
  forkPresetToRoot,
  getVariantsForDuel,
  promoteVariantToRoot,
  renameCurveNode,
  revertDraft,
  startDraft,
  updateDraftMath,
} from "../../core/state/curve-tree-reducers"
import {
  applyCurveToChannel,
  createInitialTrackBindings,
  resetTrackChannels,
  setChannelDelayMs,
  setChannelDurationMs,
  setChannelSpringMode,
} from "../../core/state/track-reducers"

describe("core/state", () => {
  const expoOut = getCanonicalPresetById("expo-out") ?? DEFAULT_FALLBACK_CURVE
  const snappySpring =
    getCanonicalPresetById("snappy-spring") ?? DEFAULT_FALLBACK_CURVE
  const bounceSpring =
    getCanonicalPresetById("super-bouncy") ?? DEFAULT_FALLBACK_CURVE
  const cinematicSlow =
    getCanonicalPresetById("cinematic-slow") ?? DEFAULT_FALLBACK_CURVE

  // ==========================================================================
  // 1. Curve Tree & Git Draft Reducers
  // ==========================================================================
  describe("curve-tree-reducers", () => {
    it("manages Git working tree: startDraft -> updateDraftMath -> revertDraft", () => {
      const draft0 = startDraft(expoOut, "preset")
      expect(draft0.sourceCurveId).toBe("expo-out")
      expect(draft0.sourceScope).toBe("preset")
      expect(draft0.isDirty).toBe(false)
      expect(draft0.workingCurve.bezier.p1.y).toBe(expoOut.bezier.p1.y)

      // Mutate handle
      const draft1 = updateDraftMath(draft0, {
        bezier: { p1: { x: 0.16, y: 1.45 }, p2: expoOut.bezier.p2 },
      })
      expect(draft1.isDirty).toBe(true)
      expect(draft1.workingCurve.bezier.p1.y).toBe(1.45)
      expect(draft1.parentCurve.bezier.p1.y).toBe(expoOut.bezier.p1.y)

      // Reverting restores exact baseline and clears dirty flag
      const draft2 = revertDraft(draft1)
      expect(draft2.isDirty).toBe(false)
      expect(draft2.workingCurve.bezier.p1.y).toBe(expoOut.bezier.p1.y)
    })

    it("commitDraft preserves read-only presets but writes to custom curves", () => {
      // 1. Presets are read-only
      const presetDraft = startDraft(expoOut, "preset")
      const dirtyPresetDraft = updateDraftMath(presetDraft, {
        name: "Hacked Preset",
      })
      const presetCommitRes = commitDraft([], dirtyPresetDraft)
      expect(presetCommitRes.customCurves).toHaveLength(0)
      expect(presetCommitRes.nextDraft.isDirty).toBe(true)

      // 2. Custom curves are commit-enabled
      const { customCurves: custom0, created: customRoot } = forkPresetToRoot(
        [],
        expoOut,
        "Custom Modal Curve",
        "custom-modal-1"
      )
      expect(custom0).toHaveLength(1)
      expect(customRoot.isCustom).toBe(true)
      expect(customRoot.parentId).toBe("expo-out")

      const customDraft = startDraft(customRoot, "custom-root")
      const dirtyCustomDraft = updateDraftMath(customDraft, {
        suggestedDurationMs: 420,
      })
      expect(dirtyCustomDraft.isDirty).toBe(true)

      const commitRes = commitDraft(custom0, dirtyCustomDraft)
      expect(commitRes.customCurves[0]?.suggestedDurationMs).toBe(420)
      expect(commitRes.nextDraft.isDirty).toBe(false)
      expect(commitRes.nextDraft.parentCurve.suggestedDurationMs).toBe(420)
    })

    it("forkAsVariant creates clean variant without ghost sub-variants", () => {
      const { customCurves: custom0, created: root } = forkPresetToRoot(
        [],
        expoOut,
        "Parent Dialog",
        "root-dialog"
      )
      const { customCurves: custom1, created: variant } = forkAsVariant(
        custom0,
        "root-dialog",
        root,
        "Dialog Quick Exit",
        "var-dialog-exit"
      )

      expect(variant).not.toBeNull()
      expect(variant?.id).toBe("var-dialog-exit")
      expect(variant?.parentId).toBe("root-dialog")
      expect(variant?.variants).toBeUndefined() // Variants cannot have variants!

      expect(custom1[0]?.variants).toHaveLength(1)
      expect(custom1[0]?.variants?.[0]?.name).toBe("Dialog Quick Exit")
    })

    it("promoteVariantToRoot cleanly moves variant to Level 0 with ZERO ghost duplicates", () => {
      const { customCurves: custom0, created: root } = forkPresetToRoot(
        [],
        expoOut,
        "Parent Drawer",
        "root-drawer"
      )
      const { customCurves: custom1 } = forkAsVariant(
        custom0,
        "root-drawer",
        root,
        "Drawer Spring Rebound",
        "var-drawer-spring"
      )

      expect(custom1[0]?.variants).toHaveLength(1)

      // Clean move: promote variant to Level 0
      const { customCurves: custom2, promoted } = promoteVariantToRoot(
        custom1,
        "root-drawer",
        "var-drawer-spring"
      )

      expect(promoted).not.toBeNull()
      expect(promoted?.id).toBe("var-drawer-spring")
      expect(promoted?.parentId).toBeUndefined()
      expect(promoted?.variants).toEqual([])

      // Level 0 now has 2 curves, and the promoted curve was prepended
      expect(custom2).toHaveLength(2)
      expect(custom2[0]?.id).toBe("var-drawer-spring")

      // Parent root no longer contains the promoted variant! (ZERO ghost duplicate!)
      const parentRoot = custom2.find((c) => c.id === "root-drawer")
      expect(parentRoot?.variants).toHaveLength(0)
    })

    it("renameCurveNode renames roots and variants cleanly, ignoring empty inputs", () => {
      const { customCurves: custom0, created: root } = forkPresetToRoot(
        [],
        expoOut,
        "Initial Name",
        "root-node"
      )
      const { customCurves: custom1 } = forkAsVariant(
        custom0,
        "root-node",
        root,
        "Variant Name",
        "var-node"
      )

      // Rename root
      let updated = renameCurveNode(custom1, "root-node", "Renamed Root")
      expect(updated[0]?.name).toBe("Renamed Root")

      // Rename variant
      updated = renameCurveNode(updated, "var-node", "Renamed Variant")
      expect(updated[0]?.variants?.[0]?.name).toBe("Renamed Variant")

      // Empty name no-ops safely
      const noOp = renameCurveNode(updated, "root-node", "   ")
      expect(noOp[0]?.name).toBe("Renamed Root")
    })

    it("deleteCurveNode handles active root deletion, variant deletion, and navStack fallback", () => {
      const { customCurves: custom0, created: root1 } = forkPresetToRoot(
        [],
        expoOut,
        "Root 1",
        "root-1"
      )
      const { customCurves: custom1, created: root2 } = forkPresetToRoot(
        custom0,
        expoOut,
        "Root 2",
        "root-2"
      )
      const { customCurves: custom2 } = forkAsVariant(
        custom1,
        "root-1",
        root1,
        "Variant 1-A",
        "var-1a"
      )

      // 1. Deleting an active variant falls back to its parent root
      const varDelRes = deleteCurveNode(custom2, "var-1a", "var-1a", {
        level: 1,
        curveId: "var-1a",
      })
      expect(varDelRes.fallbackCurveId).toBe("root-1")
      expect(varDelRes.nextNavStack).toEqual({ level: 1, curveId: "root-1" })
      const foundRoot1 = varDelRes.customCurves.find((c) => c.id === "root-1")
      expect(foundRoot1?.variants).toHaveLength(0)

      // 2. Deleting an active root falls back to remaining root and resets navStack to { level: 0 }
      const rootDelRes = deleteCurveNode(
        varDelRes.customCurves,
        "root-1",
        "root-1",
        { level: 1, curveId: "root-1" }
      )
      expect(rootDelRes.fallbackCurveId).toBe(root2.id)
      expect(rootDelRes.nextNavStack).toEqual({ level: 0 })
      expect(rootDelRes.customCurves).toHaveLength(1)

      // 3. Deleting last remaining root falls back to DEFAULT_FALLBACK_CURVE
      const lastDelRes = deleteCurveNode(
        rootDelRes.customCurves,
        root2.id,
        root2.id,
        { level: 0 }
      )
      expect(lastDelRes.fallbackCurveId).toBe(DEFAULT_FALLBACK_CURVE.id)
      expect(lastDelRes.nextNavStack).toEqual({ level: 0 })
      expect(lastDelRes.customCurves).toHaveLength(0)
    })

    it("getVariantsForDuel returns root and all its child variants", () => {
      const { customCurves: custom0, created: root } = forkPresetToRoot(
        [],
        expoOut,
        "Modal Root",
        "modal-root"
      )
      const { customCurves: custom1 } = forkAsVariant(
        custom0,
        "modal-root",
        root,
        "Var 1",
        "v1"
      )
      const { customCurves: custom2 } = forkAsVariant(
        custom1,
        "modal-root",
        root,
        "Var 2",
        "v2"
      )

      const duelVariants = getVariantsForDuel(custom2, "modal-root")
      expect(duelVariants).toHaveLength(3)
      expect(duelVariants[0]?.id).toBe("modal-root")
      expect(duelVariants[1]?.id).toBe("v1")
      expect(duelVariants[2]?.id).toBe("v2")

      expect(getVariantsForDuel(custom2, "non-existent")).toEqual([])
    })

    it("findCurveInCustomTree accurately resolves roots and variants", () => {
      const { customCurves: custom0, created: root } = forkPresetToRoot(
        [],
        expoOut,
        "Search Root",
        "root-s"
      )
      const { customCurves: custom1 } = forkAsVariant(
        custom0,
        "root-s",
        root,
        "Search Variant",
        "var-s"
      )

      const rootRes = findCurveInCustomTree(custom1, "root-s")
      expect(rootRes?.scope).toBe("custom-root")
      expect(rootRes?.node.id).toBe("root-s")

      const varRes = findCurveInCustomTree(custom1, "var-s")
      expect(varRes?.scope).toBe("custom-variant")
      expect(varRes?.node.id).toBe("var-s")
      expect(varRes?.parentRoot?.id).toBe("root-s")

      expect(findCurveInCustomTree(custom1, "missing")).toBeNull()
    })
  })

  // ==========================================================================
  // 2. Track & Property Channel Reducers
  // ==========================================================================
  describe("track-reducers", () => {
    it("Duration Integrity Law: applyCurveToChannel replaces ONLY curve, NEVER durationMs or savedBezierDurationMs", () => {
      const tracks = trackRegistry.list()
      const bindings0 = createInitialTrackBindings(tracks)

      const dialogChannels0 = bindings0["dialog:open"]!
      const scaleChannel0 = dialogChannels0.find((c) => c.id === "scale")!
      expect(scaleChannel0.durationMs).toBe(380)
      expect(scaleChannel0.savedBezierDurationMs).toBe(380)

      // Preset or curve with a 600ms suggested duration
      const longCurve: EaseCurve = {
        ...cinematicSlow,
        id: "long-curve",
        suggestedDurationMs: 600,
      }
      expect(longCurve.suggestedDurationMs).toBe(600)

      // Apply 600ms curve to the 380ms scale channel
      const bindings1 = applyCurveToChannel(
        bindings0,
        "dialog:open",
        "scale",
        longCurve
      )

      const dialogChannels1 = bindings1["dialog:open"]!
      const scaleChannel1 = dialogChannels1.find((c) => c.id === "scale")!

      // Curve replaced cleanly
      expect(scaleChannel1.curve.id).toBe("long-curve")
      // DURATION INTEGRITY LAW: durationMs and savedBezierDurationMs MUST remain exactly 380ms!
      expect(scaleChannel1.durationMs).toBe(380)
      expect(scaleChannel1.savedBezierDurationMs).toBe(380)
    })

    it("applyCurveToChannel with channelIdOrAll='all' updates all channels in the track", () => {
      const tracks = trackRegistry.list()
      const bindings0 = createInitialTrackBindings(tracks)

      const bindings1 = applyCurveToChannel(
        bindings0,
        "dialog:open",
        "all",
        expoOut
      )

      const dialogChannels = bindings1["dialog:open"]!
      for (const channel of dialogChannels) {
        expect(channel.curve.id).toBe("expo-out")
      }
    })

    it("setChannelDurationMs and setChannelDelayMs clamp safely", () => {
      const tracks = trackRegistry.list()
      let bindings = createInitialTrackBindings(tracks)

      bindings = setChannelDurationMs(bindings, "dialog:open", "scale", 360)
      const scaleChannel = bindings["dialog:open"]!.find(
        (c) => c.id === "scale"
      )!
      expect(scaleChannel.durationMs).toBe(360)
      expect(scaleChannel.savedBezierDurationMs).toBe(360)

      // Clamps to at least 1ms
      bindings = setChannelDurationMs(bindings, "dialog:open", "scale", -10)
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "scale")!.durationMs
      ).toBe(1)

      // Delay clamps to at least 0ms
      bindings = setChannelDelayMs(bindings, "dialog:open", "scale", 50)
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "scale")!.delayMs
      ).toBe(50)

      bindings = setChannelDelayMs(bindings, "dialog:open", "scale", -5)
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "scale")!.delayMs
      ).toBe(0)
    })

    it("setChannelSpringMode restores durationMs = savedBezierDurationMs cleanly", () => {
      const tracks = trackRegistry.list()
      let bindings = createInitialTrackBindings(tracks)

      // Set custom duration 320ms on translateY
      bindings = setChannelDurationMs(
        bindings,
        "dialog:open",
        "translateY",
        320
      )
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "translateY")!.durationMs
      ).toBe(320)

      // Switch to spring mode
      bindings = setChannelSpringMode(
        bindings,
        "dialog:open",
        "translateY",
        "fit"
      )
      const channel = bindings["dialog:open"]!.find(
        (c) => c.id === "translateY"
      )!
      expect(channel.springMode).toBe("fit")
      expect(channel.durationMs).toBe(320)
    })

    it("resetTrackChannels cleanly restores original baseline channels", () => {
      const dialogTrack = trackRegistry.get("dialog:open")!
      let bindings = createInitialTrackBindings([dialogTrack])

      // Mutate
      bindings = setChannelDurationMs(bindings, "dialog:open", "scale", 999)
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "scale")!.durationMs
      ).toBe(999)

      // Reset
      bindings = resetTrackChannels(bindings, "dialog:open", dialogTrack)
      expect(
        bindings["dialog:open"]!.find((c) => c.id === "scale")!.durationMs
      ).toBe(380)
    })
  })

  // ==========================================================================
  // 3. Compare & Duel Contenders Reducers
  // ==========================================================================
  describe("compare-reducers", () => {
    it("stageCurveToCompare stages curves, deduplicates, and caps initial visibility to < 4", () => {
      let queue = stageCurveToCompare([], expoOut, "tile-1")
      expect(queue).toHaveLength(1)
      expect(queue[0]?.curve.id).toBe("expo-out")
      expect(queue[0]?.visible).toBe(true)

      // Deduplication: adding identical curve ID returns queue unchanged
      queue = stageCurveToCompare(queue, expoOut)
      expect(queue).toHaveLength(1)

      // Add 2nd, 3rd, 4th contenders (all visible: true)
      queue = stageCurveToCompare(queue, snappySpring, "tile-2")
      queue = stageCurveToCompare(queue, bounceSpring, "tile-3")
      queue = stageCurveToCompare(queue, cinematicSlow, "tile-4")
      expect(queue).toHaveLength(4)
      expect(queue.filter((q) => q.visible)).toHaveLength(4)

      // 5th contender: queue length is 5, but visible is false (ideal 2-4 tile grid preservation!)
      const easeInOut =
        getCanonicalPresetById("ease-in-out") ?? DEFAULT_FALLBACK_CURVE
      queue = stageCurveToCompare(queue, easeInOut, "tile-5")
      expect(queue).toHaveLength(5)
      expect(queue[4]?.visible).toBe(false)
    })

    it("removeFromCompare and toggleCompareVisibility operate cleanly", () => {
      let queue = stageCurveToCompare([], expoOut, "tile-1")
      queue = stageCurveToCompare(queue, snappySpring, "tile-2")

      // Toggle visibility
      queue = toggleCompareVisibility(queue, "tile-1")
      expect(queue[0]?.visible).toBe(false)
      queue = toggleCompareVisibility(queue, "tile-1")
      expect(queue[0]?.visible).toBe(true)

      // Remove by item ID
      queue = removeFromCompare(queue, "tile-1")
      expect(queue).toHaveLength(1)
      expect(queue[0]?.id).toBe("tile-2")

      // Remove by curve ID
      queue = removeFromCompare(queue, "snappy-spring")
      expect(queue).toHaveLength(0)
    })

    it("setTileOverride sets and resets per-tile overrides", () => {
      let queue = stageCurveToCompare([], expoOut, "tile-1")

      // Set override
      queue = setTileOverride(queue, "tile-1", {
        trackId: "drawer:open",
        channelId: "translateX",
      })
      expect(queue[0]?.overrideTrackId).toBe("drawer:open")
      expect(queue[0]?.overrideChannelId).toBe("translateX")

      // Reset with null
      queue = setTileOverride(queue, "tile-1", null)
      expect(queue[0]?.overrideTrackId).toBeUndefined()
      expect(queue[0]?.overrideChannelId).toBeUndefined()
    })

    it("reorderCompareQueue reorders items cleanly with boundary safety", () => {
      let queue = stageCurveToCompare([], expoOut, "tile-1")
      queue = stageCurveToCompare(queue, snappySpring, "tile-2")

      queue = reorderCompareQueue(queue, 0, 1)
      expect(queue[0]?.id).toBe("tile-2")
      expect(queue[1]?.id).toBe("tile-1")

      // Out of bounds no-ops safely
      const unchanged = reorderCompareQueue(queue, -1, 5)
      expect(unchanged[0]?.id).toBe("tile-2")
    })

    it("stageVariantsForCompare stages multiple curves sequentially", () => {
      const queue = stageVariantsForCompare(
        [],
        [expoOut, snappySpring, bounceSpring]
      )
      expect(queue).toHaveLength(3)
      expect(queue[0]?.curve.id).toBe("expo-out")
      expect(queue[1]?.curve.id).toBe("snappy-spring")
      expect(queue[2]?.curve.id).toBe("super-bouncy")
    })
  })

  // ==========================================================================
  // 4. Framework Independence & Purity
  // ==========================================================================
  describe("Purity & Framework Independence", () => {
    it("has zero react, react-dom, or DOM imports in core/state/*.ts", () => {
      const files = [
        "curve-tree-reducers.ts",
        "track-reducers.ts",
        "compare-reducers.ts",
      ]

      for (const file of files) {
        const content = readFileSync(
          resolve(__dirname, "../../core/state", file),
          "utf-8"
        )
        expect(content).not.toMatch(/from\s+["']react["']/)
        expect(content).not.toMatch(/from\s+["']react-dom["']/)
        expect(content).not.toMatch(/document\./)
        expect(content).not.toMatch(/window\./)
        expect(content).not.toMatch(/localStorage/)
        expect(content).not.toMatch(/sessionStorage/)
      }
    })
  })
})
