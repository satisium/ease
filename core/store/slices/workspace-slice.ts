/**
 * @file core/store/slices/workspace-slice.ts
 * @description Workspace slice builder for studio mode, preview settings, playback, and navigation.
 */

import type { ExportFormatScope, ExporterId } from "../../registry/exporters"
import type {
  SpringDurationMode,
  StudioMode,
  ViewportPreset,
} from "../../schema"
import { trackRegistry } from "../../registry/tracks"
import {
  cloneCurve,
  findCurveInCustomTree,
  NavStackState,
  startDraft as startDraftReducer,
} from "../../state/curve-tree-reducers"
import { getTrackTotalDurationMs } from "../../math/evaluator"
import type { DraftScope, EaseStoreState, SliceContext } from "../types"

export interface InitialWorkspaceState {
  mode: StudioMode
  customizePreviewMode: "component" | "primitives"
  stashedComponentTrackId: string | null
  stashedComponentChannelId: string | null
  viewport: ViewportPreset
  navStack: NavStackState
  exportScope: ExportFormatScope
  preferredExporter: ExporterId
}

export function createWorkspaceSlice(
  ctx: SliceContext,
  initial: InitialWorkspaceState
): Pick<
  EaseStoreState,
  | "mode"
  | "customizePreviewMode"
  | "stashedComponentTrackId"
  | "stashedComponentChannelId"
  | "viewport"
  | "navStack"
  | "isExportOpen"
  | "exportScope"
  | "preferredExporter"
  | "isReducedMotion"
  | "searchQuery"
  | "playbackState"
  | "isPlaying"
  | "isLooping"
  | "loopDelayMs"
  | "speed"
  | "totalDurationMs"
  | "setMode"
  | "enterCustomize"
  | "exitCustomize"
  | "enterCompare"
  | "exitCompare"
  | "setCustomizePreviewMode"
  | "setViewport"
  | "setNavStack"
  | "drillIntoCurve"
  | "backToPresets"
  | "setExportOpen"
  | "setExportScope"
  | "setPreferredExporter"
  | "setReducedMotion"
  | "setSearchQuery"
  | "playScoped"
  | "pauseScoped"
  | "togglePlayback"
  | "seekScoped"
  | "setLooping"
  | "setLoopDelayMs"
  | "setSpeed"
> {
  return {
    mode: initial.mode,
    customizePreviewMode: initial.customizePreviewMode,
    stashedComponentTrackId: initial.stashedComponentTrackId,
    stashedComponentChannelId: initial.stashedComponentChannelId,
    viewport: initial.viewport,
    navStack: initial.navStack,
    isExportOpen: false,
    exportScope: initial.exportScope,
    preferredExporter: initial.preferredExporter,
    isReducedMotion: false,
    searchQuery: "",

    playbackState: ctx.conductor.getSnapshot().playbackState,
    isPlaying:
      ctx.conductor.getSnapshot().interactionMode === "scrub" &&
      (ctx.conductor.getSnapshot().playbackState === "playing" ||
        ctx.conductor.getSnapshot().playbackState === "resting"),
    isLooping: ctx.conductor.getSnapshot().isLooping,
    loopDelayMs: ctx.conductor.getSnapshot().loopDelayMs,
    speed: ctx.conductor.getSnapshot().speed,
    totalDurationMs: ctx.conductor.getSnapshot().totalDurationMs,

    setMode: (mode) => {
      ctx.set({ mode })
      ctx.syncDuration()
      ctx.get().persist()
    },

    enterCustomize: () => {
      const state = ctx.get()
      let targetChannelId = state.focusedChannelId
      if (
        targetChannelId === "all" &&
        state.focusedTrackId !== "primitives:all"
      ) {
        const currentTrack = state.getFocusedTrack()
        const nonOpacity = currentTrack.channels.find(
          (c) => c.property !== "opacity"
        )
        targetChannelId =
          nonOpacity?.id ?? currentTrack.channels[0]?.id ?? "all"
        if (targetChannelId !== "all") {
          ctx.set({ focusedChannelId: targetChannelId })
        }
      }
      const curve = ctx.get().getActiveCurve()
      const inTree = findCurveInCustomTree(ctx.get().customCurves, curve.id)
      const scope: DraftScope = inTree ? inTree.scope : "preset"
      ctx.set({
        mode: "customize",
        draftCurve: startDraftReducer(curve, scope),
        activeLibraryTab: curve.engine,
      })
      ctx.syncDuration()
      ctx.get().persist()
    },

    exitCustomize: () => {
      ctx.set({ mode: "preview", draftCurve: null })
      ctx.syncDuration()
      ctx.get().persist()
    },

    enterCompare: () => {
      ctx.set({ mode: "compare" })
      ctx.syncDuration()
      ctx.get().persist()
    },

    exitCompare: () => {
      ctx.set({ mode: "preview" })
      ctx.syncDuration()
      ctx.get().persist()
    },

    setCustomizePreviewMode: (mode) => {
      const state = ctx.get()
      if (mode === "primitives") {
        const stashedTrack =
          state.focusedTrackId !== "primitives:all"
            ? state.focusedTrackId
            : (state.stashedComponentTrackId ?? "dialog:open")
        const stashedChannel =
          state.focusedTrackId !== "primitives:all"
            ? state.focusedChannelId
            : (state.stashedComponentChannelId ?? "all")

        const workingCurve = state.draftCurve
          ? state.draftCurve.workingCurve
          : state.getActiveCurve()

        const basePrimitives =
          state.trackBindings["primitives:all"] ??
          trackRegistry.get("primitives:all")?.channels ??
          []
        const updatedPrimitivesChannels = basePrimitives.map((ch) => ({
          ...ch,
          curve: cloneCurve(workingCurve),
          durationMs: workingCurve.suggestedDurationMs,
          springMode: (workingCurve.engine === "spring"
            ? "natural"
            : "fit") as SpringDurationMode,
        }))

        const nextBindings = {
          ...state.trackBindings,
          "primitives:all": updatedPrimitivesChannels,
        }

        ctx.set({
          customizePreviewMode: "primitives",
          stashedComponentTrackId: stashedTrack,
          stashedComponentChannelId: stashedChannel,
          focusedTrackId: "primitives:all",
          focusedChannelId: "all",
          isSolo: false,
          trackBindings: nextBindings,
        })
        ctx.conductor.setSoloActive(false)
        ctx.conductor.focusTrack("primitives:all", ctx.computeDuration())
        ctx.syncDuration()
        ctx.get().persist()
      } else {
        const targetTrackId = state.stashedComponentTrackId ?? "dialog:open"
        let targetChannelId = state.stashedComponentChannelId ?? "all"
        if (targetChannelId === "all" || !targetChannelId) {
          const tr = trackRegistry.get(targetTrackId)
          if (tr) {
            const nonOpacity = tr.channels.find((c) => c.property !== "opacity")
            targetChannelId = nonOpacity?.id ?? tr.channels[0]?.id ?? "all"
          }
        }
        ctx.set({
          customizePreviewMode: "component",
          stashedComponentTrackId: null,
          stashedComponentChannelId: null,
          focusedTrackId: targetTrackId,
          focusedChannelId: targetChannelId,
          isSolo: false,
        })
        ctx.conductor.setSoloActive(false)
        ctx.conductor.focusTrack(targetTrackId, ctx.computeDuration())
        ctx.syncDuration()
        ctx.get().persist()
      }
    },

    setViewport: (viewport) => ctx.set({ viewport }),

    setNavStack: (navStack) => {
      ctx.set({ navStack })
      ctx.get().persist()
    },

    drillIntoCurve: (curveId) => {
      ctx.set({ navStack: { level: 1, curveId } })
      ctx.get().persist()
    },

    backToPresets: () => {
      ctx.set({ navStack: { level: 0 } })
      ctx.get().persist()
    },

    setExportOpen: (isExportOpen) => ctx.set({ isExportOpen }),

    setExportScope: (exportScope) => {
      const normalized: ExportFormatScope =
        exportScope === "snippet" || exportScope === "track"
          ? "snippet"
          : "ease"
      ctx.set({ exportScope: normalized })
    },

    setPreferredExporter: (preferredExporter) => {
      ctx.set({ preferredExporter })
      ctx.get().persist()
    },

    setReducedMotion: (isReducedMotion) => {
      ctx.set({ isReducedMotion })
      ctx.syncDuration()
    },

    setSearchQuery: (searchQuery) => ctx.set({ searchQuery }),

    playScoped: () => ctx.conductor.playScoped(ctx.computeDuration()),
    pauseScoped: () => ctx.conductor.pause(),
    togglePlayback: () => ctx.conductor.togglePlay(ctx.computeDuration()),

    seekScoped: (elapsedMs) => {
      const state = ctx.get()
      if (state.mode !== "compare" && state.focusedChannelId !== "all") {
        const channels = state.trackBindings[state.focusedTrackId] ?? []
        const channelDuration = getTrackTotalDurationMs(
          { channels },
          state.isReducedMotion,
          state.focusedChannelId
        )
        if (ctx.conductor.getSnapshot().totalDurationMs !== channelDuration) {
          ctx.conductor.setTotalDurationMs(channelDuration)
          if (ctx.get().totalDurationMs !== channelDuration) {
            ctx.set({ totalDurationMs: channelDuration })
          }
        }
      }
      const maxDuration = ctx.conductor.getSnapshot().totalDurationMs
      const clamped = Math.max(0, Math.min(elapsedMs, maxDuration))
      ctx.conductor.seek(clamped)
    },

    setLooping: (isLooping) => ctx.conductor.setLooping(isLooping),

    setLoopDelayMs: (ms) => {
      ctx.conductor.setLoopDelayMs(ms)
      ctx.get().persist()
    },

    setSpeed: (speed) => ctx.conductor.setSpeed(speed),
  }
}
