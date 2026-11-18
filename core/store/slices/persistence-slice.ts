/**
 * @file core/store/slices/persistence-slice.ts
 * @description Persistence, export compilation, and URL hash serialization slice builder.
 */

import type { SpringDurationMode } from "../../schema"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../../presets/index"
import {
  compileEaseOnly,
  compileEaseSnippet,
  compileTrackExport,
} from "../../registry/exporters"
import { decodeEaseHash, encodeEaseHash } from "../../codec/url-hash"
import { findCurveInCustomTree } from "../../state/curve-tree-reducers"
import {
  applyCurveToChannel,
  createInitialTrackBindings,
} from "../../state/track-reducers"
import { trackRegistry } from "../../registry/tracks"
import {
  deserializeEaseStorage,
  serializeEaseStorage,
} from "../../codec/storage"
import { DEFAULT_STORAGE_KEY, EaseStoreState, SliceContext } from "../types"

export function createPersistenceSlice(
  ctx: SliceContext
): Pick<
  EaseStoreState,
  | "getActiveExportCode"
  | "getShareUrlHash"
  | "applyUrlHash"
  | "hydrateFromStorage"
  | "persist"
> {
  return {
    getActiveExportCode: (exporterId, scope, curveOverride) => {
      const state = ctx.get()
      const expId = exporterId ?? state.preferredExporter
      const sc = scope ?? state.exportScope
      const targetCurve = curveOverride ?? state.getActiveCurve()
      const ch = state.getFocusedChannel()
      const dur = ch?.durationMs ?? targetCurve.suggestedDurationMs
      const sMode: SpringDurationMode =
        ch?.springMode ??
        (state.focusedTrackId === "primitives:all" ? "natural" : "fit")

      if (sc === "ease") {
        return compileEaseOnly(expId, targetCurve, dur, sMode)
      }
      if (sc === "track") {
        const track = state.getFocusedTrack()
        const finalTrack = curveOverride
          ? {
              ...track,
              channels: track.channels.map((c) =>
                state.focusedChannelId === "all" ||
                state.focusedChannelId === c.id
                  ? { ...c, curve: curveOverride }
                  : c
              ),
            }
          : track
        return compileTrackExport(expId, finalTrack)
      }
      return compileEaseSnippet(expId, targetCurve, dur, sMode)
    },

    getShareUrlHash: () => {
      const state = ctx.get()
      const ch = state.getFocusedChannel()
      const curve = ch?.curve ?? DEFAULT_FALLBACK_CURVE
      return encodeEaseHash({
        trackId: state.focusedTrackId,
        channelId:
          state.focusedChannelId === "all"
            ? (ch?.id ?? "scale")
            : state.focusedChannelId,
        curveId: curve.id,
        engine: curve.engine,
        bezier: curve.bezier,
        spring: curve.spring,
        durationMs: ch?.durationMs ?? curve.suggestedDurationMs,
        springMode: ch?.springMode ?? "fit",
      })
    },

    applyUrlHash: (hashOrUrl) => {
      const payload = decodeEaseHash(hashOrUrl)
      if (!payload) return false
      const state = ctx.get()
      state.focusTrack(payload.trackId)
      state.focusChannel(payload.channelId)

      let curve =
        getCanonicalPresetById(payload.curveId ?? "") ??
        findCurveInCustomTree(state.customCurves, payload.curveId ?? "")?.node
      if (!curve && (payload.bezier || payload.spring)) {
        curve = {
          id: `url-shared-${Date.now().toString(36)}`,
          name: "Shared Curve",
          engine: payload.engine,
          bezier: payload.bezier ?? {
            p1: { x: 0.16, y: 1 },
            p2: { x: 0.3, y: 1 },
          },
          spring: payload.spring ?? {
            mass: 1,
            stiffness: 400,
            damping: 32,
            velocity: 0,
          },
          suggestedDurationMs: payload.durationMs ?? 300,
        }
      }
      if (curve) {
        state.selectCurveForFocused(curve.id)
        if (curve.id.startsWith("url-shared")) {
          ctx.set({
            trackBindings: applyCurveToChannel(
              ctx.get().trackBindings,
              payload.trackId,
              payload.channelId,
              curve
            ),
          })
        }
      }
      if (payload.durationMs) state.setFocusedDurationMs(payload.durationMs)
      if (payload.springMode) state.setFocusedSpringMode(payload.springMode)
      return true
    },

    hydrateFromStorage: (rawJson?: string | null) => {
      let raw = rawJson
      if (raw === undefined && ctx.storage) {
        raw = ctx.storage.getItem(ctx.storageKey)
        if (!raw && ctx.storageKey === DEFAULT_STORAGE_KEY) {
          raw =
            ctx.storage.getItem("satisium-ease-v2") ??
            ctx.storage.getItem("ease_v2_store")
        }
      }
      if (!raw) return

      const freshDefaults = createInitialTrackBindings(trackRegistry.list())
      const p = deserializeEaseStorage(raw, freshDefaults)

      ctx.conductor.setLoopDelayMs(p.loopDelayMs)
      ctx.conductor.setSoloActive(false)
      ctx.conductor.setPinned(false)
      ctx.conductor.setSpeed(1)
      ctx.conductor.setLooping(false)
      ctx.conductor.pause()
      ctx.conductor.seek(0)

      ctx.set({
        customCurves: p.customCurves,
        draftCurve: p.draftCurve,
        trackBindings: p.trackBindings,
        compareQueue: p.compareQueue,
        globalCompareTarget: p.globalCompareTarget,
        mode: p.mode,
        customizePreviewMode: p.customizePreviewMode,
        focusedTrackId: p.focusedTrackId,
        focusedChannelId: p.focusedChannelId,
        stashedComponentTrackId: p.stashedComponentTrackId,
        stashedComponentChannelId: p.stashedComponentChannelId,
        navStack: p.navStack,
        activeLibraryTab: p.activeLibraryTab,
        viewport: p.viewport,
        preferredExporter: p.preferredExporter,
        exportScope: p.exportScope,
        loopDelayMs: p.loopDelayMs,
        // Diagnostic lenses calm defaults
        isPlaying: false,
        playbackState: "idle",
        isSolo: false,
        isPinned: false,
        speed: 1,
        isReducedMotion: false,
        isLooping: false,
        isExportOpen: false,
        searchQuery: "",
      })

      ctx.syncDuration()
    },

    persist: () => {
      if (!ctx.storage) return
      try {
        const state = ctx.get()
        const payload = serializeEaseStorage({
          customCurves: state.customCurves,
          draftCurve: state.draftCurve,
          trackBindings: state.trackBindings,
          compareQueue: state.compareQueue,
          globalCompareTarget: state.globalCompareTarget,
          mode: state.mode,
          customizePreviewMode: state.customizePreviewMode,
          focusedTrackId: state.focusedTrackId,
          focusedChannelId: state.focusedChannelId,
          stashedComponentTrackId: state.stashedComponentTrackId,
          stashedComponentChannelId: state.stashedComponentChannelId,
          navStack: state.navStack,
          activeLibraryTab: state.activeLibraryTab,
          viewport: state.viewport,
          preferredExporter: state.preferredExporter,
          exportScope: state.exportScope,
          loopDelayMs: state.loopDelayMs,
          activeTrackId:
            state.customizePreviewMode === "primitives" &&
            state.stashedComponentTrackId
              ? state.stashedComponentTrackId
              : state.focusedTrackId,
          activeChannelId:
            state.customizePreviewMode === "primitives" &&
            state.stashedComponentChannelId
              ? state.stashedComponentChannelId
              : state.focusedChannelId === "all"
                ? "scale"
                : state.focusedChannelId,
        })
        ctx.storage.setItem(ctx.storageKey, payload)
      } catch {
        // safe fallback
      }
    },
  }
}
