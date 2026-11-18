/**
 * @file core/store/slices/track-slice.ts
 * @description Track & Channel slice builder for active bindings, focus targeting, and interruption.
 */

import type { SpringDurationMode } from "../../schema"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../../presets/index"
import { getPairedTrackId, trackRegistry } from "../../registry/tracks"
import {
  applyCurveToChannel,
  resetTrackChannels,
  setChannelDelayMs,
  setChannelDurationMs,
  setChannelSpringMode,
  TrackChannelMap,
} from "../../state/track-reducers"
import {
  findCurveInCustomTree,
  startDraft as startDraftReducer,
} from "../../state/curve-tree-reducers"
import {
  ChannelInterruptSnapshot,
  evaluateChannelAtTime,
} from "../../math/evaluator"
import type { DraftScope, EaseStoreState, SliceContext } from "../types"

export interface InitialTrackState {
  focusedTrackId: string
  focusedChannelId: string | "all"
  trackBindings: TrackChannelMap
}

export function createTrackSlice(
  ctx: SliceContext,
  initial: InitialTrackState
): Pick<
  EaseStoreState,
  | "focusedTrackId"
  | "focusedChannelId"
  | "isPinned"
  | "isSolo"
  | "trackBindings"
  | "getFocusedTrack"
  | "getFocusedChannel"
  | "getActiveCurve"
  | "focusTrack"
  | "focusChannel"
  | "setPinned"
  | "toggleSolo"
  | "selectCurveForFocused"
  | "setFocusedDurationMs"
  | "setFocusedDelayMs"
  | "setFocusedSpringMode"
  | "resetTrack"
  | "resetFocusedTrack"
  | "triggerLive"
  | "interruptActive"
> {
  return {
    focusedTrackId: initial.focusedTrackId,
    focusedChannelId: initial.focusedChannelId,
    isPinned: false,
    isSolo: false,
    trackBindings: initial.trackBindings,

    getFocusedTrack: () => {
      const { focusedTrackId, trackBindings } = ctx.get()
      const base = trackRegistry.get(focusedTrackId) ?? trackRegistry.list()[0]
      return {
        ...base,
        channels: trackBindings[focusedTrackId] ?? base.channels,
      }
    },

    getFocusedChannel: () => {
      const { focusedTrackId, focusedChannelId, trackBindings } = ctx.get()
      const channels = trackBindings[focusedTrackId] ?? []
      if (focusedChannelId !== "all") {
        return channels.find((c) => c.id === focusedChannelId) ?? null
      }
      return channels[0] ?? null
    },

    getActiveCurve: () => {
      return ctx.get().getFocusedChannel()?.curve ?? DEFAULT_FALLBACK_CURVE
    },

    focusTrack: (trackId) => {
      ctx.set({
        focusedTrackId: trackId,
        focusedChannelId: "all",
        isSolo: false,
      })
      ctx.conductor.setSoloActive(false)
      ctx.conductor.focusTrack(trackId, ctx.computeDuration())
    },

    focusChannel: (channelIdOrAll) => {
      const resetSolo = channelIdOrAll === "all"
      ctx.set({
        focusedChannelId: channelIdOrAll,
        isSolo: resetSolo ? false : ctx.get().isSolo,
      })
      if (resetSolo) ctx.conductor.setSoloActive(false)
      ctx.syncDuration()
    },

    setPinned: (isPinned) => {
      ctx.set({ isPinned })
      ctx.conductor.setPinned(isPinned)
    },

    toggleSolo: () => {
      if (ctx.get().focusedChannelId === "all") return
      const nextSolo = !ctx.get().isSolo
      ctx.set({ isSolo: nextSolo })
      ctx.conductor.setSoloActive(nextSolo)
      ctx.syncDuration()
    },

    selectCurveForFocused: (curveId) => {
      const {
        focusedTrackId,
        focusedChannelId,
        customCurves,
        mode,
        trackBindings,
      } = ctx.get()
      const curve =
        getCanonicalPresetById(curveId) ??
        findCurveInCustomTree(customCurves, curveId)?.node
      if (!curve) return

      let nextBindings = applyCurveToChannel(
        trackBindings,
        focusedTrackId,
        focusedChannelId,
        curve
      )

      if (focusedTrackId === "primitives:all") {
        const primChannels = nextBindings["primitives:all"] ?? []
        nextBindings = {
          ...nextBindings,
          "primitives:all": primChannels.map((ch) => ({
            ...ch,
            durationMs: curve.suggestedDurationMs,
            springMode: (curve.engine === "spring"
              ? "natural"
              : "fit") as SpringDurationMode,
          })),
        }
      }

      const inTree = findCurveInCustomTree(customCurves, curve.id)
      const scope: DraftScope = inTree ? inTree.scope : "preset"

      ctx.set({
        trackBindings: nextBindings,
        draftCurve:
          mode === "customize"
            ? startDraftReducer(curve, scope)
            : ctx.get().draftCurve,
        activeLibraryTab: curve.engine,
      })
      ctx.syncDuration()
      ctx.get().persist()
    },

    setFocusedDurationMs: (ms) => {
      const { focusedTrackId, focusedChannelId, trackBindings } = ctx.get()
      const target =
        focusedTrackId === "primitives:all"
          ? "all"
          : focusedChannelId === "all"
            ? trackBindings[focusedTrackId]?.[0]?.id
            : focusedChannelId
      if (!target) return
      ctx.set({
        trackBindings: setChannelDurationMs(
          trackBindings,
          focusedTrackId,
          target,
          ms
        ),
      })
      ctx.syncDuration()
      ctx.get().persist()
    },

    setFocusedDelayMs: (ms) => {
      const { focusedTrackId, focusedChannelId, trackBindings } = ctx.get()
      const target =
        focusedTrackId === "primitives:all"
          ? "all"
          : focusedChannelId === "all"
            ? trackBindings[focusedTrackId]?.[0]?.id
            : focusedChannelId
      if (!target) return
      ctx.set({
        trackBindings: setChannelDelayMs(
          trackBindings,
          focusedTrackId,
          target,
          ms
        ),
      })
      ctx.syncDuration()
      ctx.get().persist()
    },

    setFocusedSpringMode: (mode) => {
      const { focusedTrackId, focusedChannelId, trackBindings } = ctx.get()
      const target =
        focusedTrackId === "primitives:all" || focusedChannelId === "all"
          ? "all"
          : focusedChannelId
      if (!target) return
      ctx.set({
        trackBindings: setChannelSpringMode(
          trackBindings,
          focusedTrackId,
          target,
          mode
        ),
      })
      ctx.syncDuration()
      ctx.get().persist()
    },

    resetTrack: (trackId) => {
      const targetId = trackId ?? ctx.get().focusedTrackId
      const base = trackRegistry.get(targetId)
      if (!base) return

      let nextBindings = resetTrackChannels(
        ctx.get().trackBindings,
        targetId,
        base
      )

      const pairedId = getPairedTrackId(targetId)
      if (pairedId && pairedId !== targetId) {
        const pairedBase = trackRegistry.get(pairedId)
        if (pairedBase) {
          nextBindings = resetTrackChannels(nextBindings, pairedId, pairedBase)
        }
      }

      ctx.set({ trackBindings: nextBindings })
      ctx.syncDuration()
      if (ctx.conductor.getSnapshot().playbackState === "idle") {
        ctx.conductor.seek(0)
      }
      ctx.get().persist()
    },

    resetFocusedTrack: () => {
      ctx.get().resetTrack()
    },

    triggerLive: (trackId) => {
      if (!ctx.get().isPinned) {
        ctx.set({
          focusedTrackId: trackId,
          focusedChannelId: "all",
          isSolo: false,
        })
        ctx.conductor.setSoloActive(false)
        ctx.syncDuration()
      }
      ctx.conductor.triggerLive(trackId, ctx.computeDuration())
    },

    interruptActive: () => {
      const state = ctx.get()
      const elapsed = ctx.conductor.getSnapshot().elapsedMs

      if (state.mode === "compare") {
        const visible = state.compareQueue.filter((i) => i.visible)
        const pairedTrackId = getPairedTrackId(
          state.globalCompareTarget.trackId
        )
        const isInversePair =
          pairedTrackId !== null &&
          pairedTrackId !== state.globalCompareTarget.trackId
        const nextTrackId = pairedTrackId ?? state.globalCompareTarget.trackId

        const snapshots: Record<string, ChannelInterruptSnapshot> = {}

        for (const item of visible) {
          const trackId =
            item.overrideTrackId ?? state.globalCompareTarget.trackId
          const track = trackRegistry.get(trackId) ?? trackRegistry.list()[0]
          const channels = state.trackBindings[track.id] ?? track.channels
          const targetCh =
            item.overrideChannelId ?? state.globalCompareTarget.channelId

          for (const ch of channels) {
            const effectiveCurve =
              targetCh === "all" || targetCh === ch.id ? item.curve : ch.curve
            const evalCh = { ...ch, curve: effectiveCurve }
            const prevSnap =
              ctx.conductor.getSnapshot().interruptions[
                `${item.id}:${ch.id}`
              ] ?? ctx.conductor.getSnapshot().interruptions[ch.id]

            const evalRes = evaluateChannelAtTime(evalCh, elapsed, {
              isReducedMotion: state.isReducedMotion,
              interruption: prevSnap,
            })

            const scopedKey = `${item.id}:${ch.id}`
            if (isInversePair) {
              snapshots[scopedKey] = {
                x0: 1 - evalRes.progress,
                v0: -evalRes.velocityPerSec,
              }
            } else {
              snapshots[scopedKey] = {
                x0: evalRes.progress,
                v0: evalRes.velocityPerSec,
              }
            }
          }
        }

        if (isInversePair) {
          ctx.set({
            globalCompareTarget: {
              ...state.globalCompareTarget,
              trackId: nextTrackId,
            },
          })
        }

        const nextDuration = ctx.computeDuration()
        ctx.conductor.interrupt({
          nextTrackId,
          nextDurationMs: nextDuration,
          snapshots,
        })
        return
      }

      const channels = state.trackBindings[state.focusedTrackId] ?? []
      const snapshots: Record<string, ChannelInterruptSnapshot> = {}

      const pairedTrackId = getPairedTrackId(state.focusedTrackId)
      const isInversePair =
        pairedTrackId !== null && pairedTrackId !== state.focusedTrackId
      const nextTrackId = pairedTrackId ?? state.focusedTrackId

      for (const ch of channels) {
        const evalRes = evaluateChannelAtTime(ch, elapsed, {
          isReducedMotion: state.isReducedMotion,
          interruption: ctx.conductor.getSnapshot().interruptions[ch.id],
        })

        if (isInversePair) {
          snapshots[ch.id] = {
            x0: 1 - evalRes.progress,
            v0: -evalRes.velocityPerSec,
          }
        } else {
          snapshots[ch.id] = {
            x0: evalRes.progress,
            v0: evalRes.velocityPerSec,
          }
        }
      }

      ctx.set({
        focusedTrackId: nextTrackId,
        focusedChannelId: "all",
        isSolo: false,
      })
      ctx.conductor.setSoloActive(false)
      const nextDuration = ctx.computeDuration()
      ctx.conductor.interrupt({
        nextTrackId,
        nextDurationMs: nextDuration,
        snapshots,
      })
    },
  }
}
