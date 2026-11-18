/**
 * @file core/store/slices/compare-slice.ts
 * @description Compare slice builder for multi-candidate queue, dual-axis tiles, and winner promotion.
 */

import type { CompareItem } from "../../schema"
import {
  CompareGlobalTarget,
  reorderCompareQueue as reorderCompareQueueReducer,
  removeFromCompare as removeFromCompareReducer,
  setTileOverride as setTileOverrideReducer,
  stageCurveToCompare as stageCurveToCompareReducer,
  stageVariantsForCompare as stageVariantsForCompareReducer,
  toggleCompareVisibility as toggleCompareVisibilityReducer,
} from "../../state/compare-reducers"
import { getVariantsForDuel } from "../../state/curve-tree-reducers"
import { trackRegistry } from "../../registry/tracks"
import {
  ChannelInterruptSnapshot,
  evaluateCompareTileFrame,
} from "../../math/evaluator"
import type { EaseStoreState, SliceContext } from "../types"

export interface InitialCompareState {
  compareQueue: CompareItem[]
  globalCompareTarget: CompareGlobalTarget
}

export function createCompareSlice(
  ctx: SliceContext,
  initial: InitialCompareState
): Pick<
  EaseStoreState,
  | "compareQueue"
  | "globalCompareTarget"
  | "stageActiveCurveToCompare"
  | "stageVariantsToCompare"
  | "removeCompareItem"
  | "toggleCompareItemVisibility"
  | "reorderCompareItems"
  | "setGlobalCompareTarget"
  | "setCompareTileOverride"
  | "applyCompareWinner"
  | "evaluateCompareItemFrame"
> {
  return {
    compareQueue: initial.compareQueue,
    globalCompareTarget: initial.globalCompareTarget,

    stageActiveCurveToCompare: () => {
      const curve = ctx.get().getActiveCurve()
      ctx.set({
        compareQueue: stageCurveToCompareReducer(ctx.get().compareQueue, curve),
      })
      ctx.syncDuration()
    },

    stageVariantsToCompare: (rootId) => {
      const curves = getVariantsForDuel(ctx.get().customCurves, rootId)
      ctx.set({
        compareQueue: stageVariantsForCompareReducer(
          ctx.get().compareQueue,
          curves
        ),
        mode: "compare",
      })
      ctx.syncDuration()
    },

    removeCompareItem: (itemId) => {
      ctx.set({
        compareQueue: removeFromCompareReducer(ctx.get().compareQueue, itemId),
      })
      ctx.syncDuration()
    },

    toggleCompareItemVisibility: (itemId) => {
      ctx.set({
        compareQueue: toggleCompareVisibilityReducer(
          ctx.get().compareQueue,
          itemId
        ),
      })
      ctx.syncDuration()
    },

    reorderCompareItems: (fromIndex: number, toIndex: number) => {
      ctx.set({
        compareQueue: reorderCompareQueueReducer(
          ctx.get().compareQueue,
          fromIndex,
          toIndex
        ),
      })
    },

    setGlobalCompareTarget: (target) => {
      ctx.set({
        globalCompareTarget: { ...ctx.get().globalCompareTarget, ...target },
      })
      ctx.syncDuration()
    },

    setCompareTileOverride: (itemId, override) => {
      ctx.set({
        compareQueue: setTileOverrideReducer(
          ctx.get().compareQueue,
          itemId,
          override
        ),
      })
      ctx.syncDuration()
    },

    applyCompareWinner: (itemId) => {
      const winner = ctx
        .get()
        .compareQueue.find((i) => i.id === itemId || i.curve.id === itemId)
      if (winner) {
        ctx.get().selectCurveForFocused(winner.curve.id)
      }
      ctx.set({ mode: "preview" })
      ctx.syncDuration()
    },

    evaluateCompareItemFrame: (itemId, elapsedMs) => {
      const state = ctx.get()
      const item = state.compareQueue.find((i) => i.id === itemId)
      if (!item) return null

      const effectiveElapsed =
        elapsedMs !== undefined
          ? elapsedMs
          : ctx.conductor.getSnapshot().elapsedMs
      const trackId = item.overrideTrackId ?? state.globalCompareTarget.trackId
      const track = trackRegistry.get(trackId) ?? trackRegistry.list()[0]
      const channels = state.trackBindings[track.id] ?? track.channels
      const targetChannelId =
        item.overrideChannelId ?? state.globalCompareTarget.channelId

      const conductorSnap = ctx.conductor.getSnapshot()
      const itemInterrupts: Record<string, ChannelInterruptSnapshot> = {}
      for (const ch of channels) {
        const snap =
          conductorSnap.interruptions[`${item.id}:${ch.id}`] ??
          conductorSnap.interruptions[ch.id]
        if (snap) {
          itemInterrupts[ch.id] = snap
        }
      }

      return evaluateCompareTileFrame({
        itemCurve: item.curve,
        track: { phase: track.phase, channels },
        targetChannelId,
        elapsedMs: effectiveElapsed,
        soloChannelId: null,
        isReducedMotion: state.isReducedMotion,
        interruptions: itemInterrupts,
      })
    },
  }
}
