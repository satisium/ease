/**
 * @file core/store/slices/library-slice.ts
 * @description Library & 2-tier Git tree slice builder for custom curves, variants, and draft states.
 */

import type {
  DraftCurveState,
  EaseCurve,
  MotionEngine,
  SpringDurationMode,
} from "../../schema"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../../presets/index"
import {
  applyCurveToChannel,
  setChannelSpringMode,
} from "../../state/track-reducers"
import {
  cloneCurve,
  commitDraft as commitDraftReducer,
  deleteCurveNode,
  findCurveInCustomTree,
  forkAsVariant as forkAsVariantReducer,
  forkPresetToRoot as forkPresetToRootReducer,
  promoteVariantToRoot,
  renameCurveNode,
  revertDraft as revertDraftReducer,
  startDraft as startDraftReducer,
  updateDraftMath,
} from "../../state/curve-tree-reducers"
import { parseCurveString } from "../../math/parser"
import type { DraftScope, EaseStoreState, SliceContext } from "../types"

export interface InitialLibraryState {
  customCurves: EaseCurve[]
  activeLibraryTab: MotionEngine
  draftCurve: DraftCurveState | null
}

export function createLibrarySlice(
  ctx: SliceContext,
  initial: InitialLibraryState
): Pick<
  EaseStoreState,
  | "customCurves"
  | "activeLibraryTab"
  | "draftCurve"
  | "setActiveLibraryTab"
  | "updateDraft"
  | "revertActiveDraft"
  | "commitActiveDraft"
  | "forkActiveDraftToRoot"
  | "forkActiveDraftAsVariant"
  | "forkPresetToCustom"
  | "addVariantToRoot"
  | "promoteVariant"
  | "renameCurve"
  | "deleteCurve"
  | "importCurveString"
> {
  return {
    customCurves: initial.customCurves,
    activeLibraryTab: initial.activeLibraryTab,
    draftCurve: initial.draftCurve,

    setActiveLibraryTab: (activeLibraryTab) => ctx.set({ activeLibraryTab }),

    updateDraft: (patch) => {
      const { draftCurve, focusedTrackId, focusedChannelId, trackBindings } =
        ctx.get()
      if (!draftCurve) return
      const nextDraft = updateDraftMath(draftCurve, patch)
      let nextBindings = applyCurveToChannel(
        trackBindings,
        focusedTrackId,
        focusedTrackId === "primitives:all" ? "all" : focusedChannelId,
        nextDraft.workingCurve
      )
      if (focusedTrackId === "primitives:all") {
        if (patch.engine && patch.engine !== draftCurve.workingCurve.engine) {
          const nextSpringMode: SpringDurationMode =
            patch.engine === "spring" ? "natural" : "fit"
          nextBindings = setChannelSpringMode(
            nextBindings,
            "primitives:all",
            "all",
            nextSpringMode
          )
        }
      }
      ctx.set({
        draftCurve: nextDraft,
        trackBindings: nextBindings,
        activeLibraryTab: nextDraft.workingCurve.engine,
      })
      ctx.syncDuration()
    },

    revertActiveDraft: () => {
      const { draftCurve, focusedTrackId, focusedChannelId, trackBindings } =
        ctx.get()
      if (!draftCurve) return
      const reverted = revertDraftReducer(draftCurve)
      let nextBindings = applyCurveToChannel(
        trackBindings,
        focusedTrackId,
        focusedTrackId === "primitives:all" ? "all" : focusedChannelId,
        reverted.workingCurve
      )
      if (focusedTrackId === "primitives:all") {
        if (reverted.workingCurve.engine !== draftCurve.workingCurve.engine) {
          const nextSpringMode: SpringDurationMode =
            reverted.workingCurve.engine === "spring" ? "natural" : "fit"
          nextBindings = setChannelSpringMode(
            nextBindings,
            "primitives:all",
            "all",
            nextSpringMode
          )
        }
      }
      ctx.set({
        draftCurve: reverted,
        trackBindings: nextBindings,
        activeLibraryTab: reverted.workingCurve.engine,
      })
      ctx.syncDuration()
    },

    commitActiveDraft: () => {
      const { customCurves, draftCurve } = ctx.get()
      if (!draftCurve) {
        return {
          committedCurve: DEFAULT_FALLBACK_CURVE,
          nextDraft: startDraftReducer(DEFAULT_FALLBACK_CURVE, "preset"),
        }
      }
      if (draftCurve.sourceScope === "preset") {
        const customName = `${draftCurve.workingCurve.name} (Custom)`
        const result = forkPresetToRootReducer(
          customCurves,
          draftCurve.workingCurve,
          customName
        )
        const nextDraft = startDraftReducer(result.created, "custom-root")
        ctx.set({ customCurves: result.customCurves, draftCurve: nextDraft })
        ctx.get().persist()
        return { committedCurve: cloneCurve(result.created), nextDraft }
      }
      const result = commitDraftReducer(customCurves, draftCurve)
      ctx.set({
        customCurves: result.customCurves,
        draftCurve: result.nextDraft,
      })
      ctx.get().persist()
      return {
        committedCurve: result.committedCurve,
        nextDraft: result.nextDraft,
      }
    },

    forkActiveDraftToRoot: (name) => {
      const { customCurves, draftCurve } = ctx.get()
      if (!draftCurve) return null
      const result = forkPresetToRootReducer(
        customCurves,
        draftCurve.workingCurve,
        name
      )
      const nextDraft = startDraftReducer(result.created, "custom-root")
      ctx.set({ customCurves: result.customCurves, draftCurve: nextDraft })
      ctx.get().persist()
      return result.created
    },

    forkActiveDraftAsVariant: (rootId, name) => {
      const { customCurves, draftCurve } = ctx.get()
      if (!draftCurve) return null
      const result = forkAsVariantReducer(
        customCurves,
        rootId,
        draftCurve.workingCurve,
        name
      )
      if (result.created) {
        const nextDraft = startDraftReducer(result.created, "custom-variant")
        ctx.set({ customCurves: result.customCurves, draftCurve: nextDraft })
        ctx.get().persist()
      }
      return result.created
    },

    forkPresetToCustom: (presetId, customName) => {
      const source =
        getCanonicalPresetById(presetId) ??
        findCurveInCustomTree(ctx.get().customCurves, presetId)?.node
      if (!source) return null
      const result = forkPresetToRootReducer(
        ctx.get().customCurves,
        source,
        customName
      )
      ctx.set({ customCurves: result.customCurves })
      ctx.get().persist()
      return result.created
    },

    addVariantToRoot: (rootId, sourceCurve, variantName) => {
      const root = ctx.get().customCurves.find((c) => c.id === rootId)
      if (!root) return null
      const base = sourceCurve ?? root
      const result = forkAsVariantReducer(
        ctx.get().customCurves,
        rootId,
        base,
        variantName
      )
      if (!result.created) return null
      ctx.set({ customCurves: result.customCurves })
      ctx.get().persist()
      return result.created
    },

    promoteVariant: (rootId, variantId, newName) => {
      const { customCurves } = ctx.get()
      const result = promoteVariantToRoot(
        customCurves,
        rootId,
        variantId,
        newName
      )
      ctx.set({ customCurves: result.customCurves })
      ctx.get().persist()
      return result.promoted
    },

    renameCurve: (id, newName) => {
      const { customCurves, draftCurve } = ctx.get()
      const updated = renameCurveNode(customCurves, id, newName)
      let nextDraft = draftCurve
      if (
        draftCurve &&
        (draftCurve.workingCurve.id === id || draftCurve.sourceCurveId === id)
      ) {
        const trimmed = newName.trim()
        if (trimmed) {
          nextDraft = {
            ...draftCurve,
            workingCurve: { ...draftCurve.workingCurve, name: trimmed },
            parentCurve: { ...draftCurve.parentCurve, name: trimmed },
          }
        }
      }
      ctx.set({ customCurves: updated, draftCurve: nextDraft })
      ctx.get().persist()
    },

    deleteCurve: (id) => {
      const { customCurves, draftCurve, navStack } = ctx.get()
      const activeId = draftCurve?.workingCurve.id ?? ""
      const result = deleteCurveNode(customCurves, id, activeId, navStack)
      let nextDraft = draftCurve
      if (activeId === id) {
        const fallback =
          findCurveInCustomTree(result.customCurves, result.fallbackCurveId)
            ?.node ??
          getCanonicalPresetById(result.fallbackCurveId) ??
          DEFAULT_FALLBACK_CURVE
        const scope: DraftScope = findCurveInCustomTree(
          result.customCurves,
          fallback.id
        )
          ? "custom-root"
          : "preset"
        nextDraft = startDraftReducer(fallback, scope)
      }
      ctx.set({
        customCurves: result.customCurves,
        navStack: result.nextNavStack,
        draftCurve: nextDraft,
      })
      ctx.get().persist()
    },

    importCurveString: (raw) => {
      const parsed = parseCurveString(raw)
      if (!parsed) return null
      const defaultBezier = { p1: { x: 0.16, y: 1 }, p2: { x: 0.3, y: 1 } }
      const defaultSpring = {
        mass: 1,
        stiffness: 400,
        damping: 32,
        velocity: 0,
      }
      const created: EaseCurve = {
        id: `custom-imported-${Date.now().toString(36)}`,
        name: "Imported Curve",
        engine: parsed.engine,
        bezier: parsed.bezier ?? defaultBezier,
        spring: parsed.spring ?? defaultSpring,
        suggestedDurationMs: 300,
        isCustom: true,
        variants: [],
      }
      ctx.set({ customCurves: [created, ...ctx.get().customCurves] })
      ctx.get().selectCurveForFocused(created.id)
      ctx.get().persist()
      return created
    },
  }
}
