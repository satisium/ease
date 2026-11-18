/**
 * @file core/store/create-ease-store.ts
 * @description Framework-agnostic vanilla Zustand store orchestrator composing Satisium Ease state slices.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero React imports, zero browser globals.
 * - Composes Workspace, Track/Channel, Library (2-tier Git tree), Compare, and Persistence slices.
 * - Strict Duration Integrity Law: channel.durationMs and savedBezierDurationMs are channel-owned.
 * - Integrates with TrackConductor at 120fps with mid-flight C1 interruption retargeting.
 */

import { createStore } from "zustand/vanilla"

import type {
  CompareItem,
  DraftCurveState,
  MotionEngine,
  StudioMode,
  ViewportPreset,
} from "../schema"
import { DEFAULT_CUSTOM_CURVES } from "../presets/index"
import { trackRegistry } from "../registry/tracks"
import type { ExporterId, ExportFormatScope } from "../registry/exporters"
import { TrackConductor } from "../clock/track-conductor"
import {
  cloneCurve,
  findCurveInCustomTree,
  NavStackState,
  startDraft as startDraftReducer,
} from "../state/curve-tree-reducers"
import { createInitialTrackBindings } from "../state/track-reducers"
import type { CompareGlobalTarget } from "../state/compare-reducers"
import { deserializeEaseStorage } from "../codec/storage"
import {
  getChannelEffectiveDurationMs,
  getTrackTotalDurationMs,
} from "../math/evaluator"

import type {
  CreateEaseStoreOptions,
  DraftScope,
  EaseStore,
  EaseStoreState,
  SliceContext,
  StorageAdapter,
} from "./types"
import { DEFAULT_STORAGE_KEY } from "./types"

import { createWorkspaceSlice } from "./slices/workspace-slice"
import { createTrackSlice } from "./slices/track-slice"
import { createLibrarySlice } from "./slices/library-slice"
import { createCompareSlice } from "./slices/compare-slice"
import { createPersistenceSlice } from "./slices/persistence-slice"

export type {
  CreateEaseStoreOptions,
  DraftScope,
  EaseStore,
  EaseStoreState,
  SliceContext,
  StorageAdapter,
}
export { DEFAULT_STORAGE_KEY }

export function createEaseStore(options?: CreateEaseStoreOptions): EaseStore {
  const conductor = options?.conductor ?? new TrackConductor()
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY

  const defaultBindings = createInitialTrackBindings(trackRegistry.list())

  let initialCustomCurves = DEFAULT_CUSTOM_CURVES.map(cloneCurve)
  let initialDraftCurve: DraftCurveState | null = null
  let initialBindings = defaultBindings
  let initialCompareQueue: CompareItem[] = []
  let initialGlobalCompareTarget: CompareGlobalTarget = {
    trackId: "primitives:all",
    channelId: "all",
  }
  let initialMode: StudioMode = "preview"
  let initialCustomizePreviewMode: "component" | "primitives" = "primitives"
  let initialTrackId = "primitives:all"
  let initialChannelId: string | "all" = "all"
  let initialStashedComponentTrackId: string | null = null
  let initialStashedComponentChannelId: string | null = null
  let initialNavStack: NavStackState = { level: 0 }
  let initialActiveLibraryTab: MotionEngine = "bezier"
  let initialViewport: ViewportPreset = "desktop"
  let initialExporter: ExporterId = "tailwind"
  let initialExportScope: ExportFormatScope = "ease"

  if (options?.storage) {
    try {
      let raw = options.storage.getItem(storageKey)
      if (!raw && storageKey === DEFAULT_STORAGE_KEY) {
        raw =
          options.storage.getItem("satisium-ease-v2") ??
          options.storage.getItem("ease_v2_store")
      }
      if (raw) {
        const persisted = deserializeEaseStorage(raw, defaultBindings)
        initialCustomCurves = persisted.customCurves
        initialDraftCurve = persisted.draftCurve
        initialBindings = persisted.trackBindings
        initialCompareQueue = persisted.compareQueue
        initialGlobalCompareTarget = persisted.globalCompareTarget
        initialMode = persisted.mode
        initialCustomizePreviewMode = persisted.customizePreviewMode
        initialTrackId = persisted.focusedTrackId
        initialChannelId = persisted.focusedChannelId
        initialStashedComponentTrackId = persisted.stashedComponentTrackId
        initialStashedComponentChannelId = persisted.stashedComponentChannelId
        initialNavStack = persisted.navStack
        initialActiveLibraryTab = persisted.activeLibraryTab
        initialViewport = persisted.viewport
        initialExporter = persisted.preferredExporter
        initialExportScope = persisted.exportScope
        conductor.setLoopDelayMs(persisted.loopDelayMs)
      }
    } catch {
      // safe fallback
    }
  }

  const store = createStore<EaseStoreState>((set, get) => {
    function computeDuration(): number {
      const state = get()
      if (state.mode === "compare") {
        const visible = state.compareQueue.filter((i) => i.visible)
        if (visible.length === 0) return 0
        const durations = visible.map((item) => {
          const trackId =
            item.overrideTrackId ?? state.globalCompareTarget.trackId
          const track = trackRegistry.get(trackId) ?? trackRegistry.list()[0]
          const channels = state.trackBindings[track.id] ?? track.channels
          const targetCh =
            item.overrideChannelId ?? state.globalCompareTarget.channelId

          if (targetCh === "all") {
            return Math.max(
              0,
              ...channels.map(
                (c) =>
                  c.delayMs +
                  getChannelEffectiveDurationMs(
                    { ...c, curve: item.curve },
                    state.isReducedMotion
                  )
              )
            )
          }

          const ch = channels.find((c) => c.id === targetCh) ?? channels[0]
          return ch
            ? ch.delayMs +
                getChannelEffectiveDurationMs(
                  { ...ch, curve: item.curve },
                  state.isReducedMotion
                )
            : 0
        })
        return Math.max(0, ...durations)
      }

      const channels = state.trackBindings[state.focusedTrackId] ?? []
      const isScrubbing = conductor.getSnapshot().playbackState === "scrubbing"
      const soloId =
        (state.isSolo || isScrubbing) && state.focusedChannelId !== "all"
          ? state.focusedChannelId
          : null
      return getTrackTotalDurationMs(
        { channels },
        state.isReducedMotion,
        soloId
      )
    }

    function syncDuration(): void {
      const nextDuration = computeDuration()
      conductor.setTotalDurationMs(nextDuration)
      if (get().totalDurationMs !== nextDuration) {
        set({ totalDurationMs: nextDuration })
      }
    }

    const ctx: SliceContext = {
      set,
      get,
      conductor,
      computeDuration,
      syncDuration,
      storage: options?.storage,
      storageKey,
    }

    return {
      ...createWorkspaceSlice(ctx, {
        mode: initialMode,
        customizePreviewMode: initialCustomizePreviewMode,
        stashedComponentTrackId: initialStashedComponentTrackId,
        stashedComponentChannelId: initialStashedComponentChannelId,
        viewport: initialViewport,
        navStack: initialNavStack,
        exportScope: initialExportScope,
        preferredExporter: initialExporter,
      }),
      ...createTrackSlice(ctx, {
        focusedTrackId: initialTrackId,
        focusedChannelId: initialChannelId,
        trackBindings: initialBindings,
      }),
      ...createLibrarySlice(ctx, {
        customCurves: initialCustomCurves,
        activeLibraryTab: initialActiveLibraryTab,
        draftCurve: initialDraftCurve,
      }),
      ...createCompareSlice(ctx, {
        compareQueue: initialCompareQueue,
        globalCompareTarget: initialGlobalCompareTarget,
      }),
      ...createPersistenceSlice(ctx),
    }
  })

  const fullStore = store as EaseStore
  fullStore.conductor = conductor

  // Mirror low-frequency conductor state changes into Zustand store (zero 120fps re-render overhead)
  let prevPlaybackState = conductor.getSnapshot().playbackState
  let prevInteractionMode = conductor.getSnapshot().interactionMode
  let prevIsLooping = conductor.getSnapshot().isLooping
  let prevLoopDelayMs = conductor.getSnapshot().loopDelayMs
  let prevSpeed = conductor.getSnapshot().speed
  let prevTotalDurationMs = conductor.getSnapshot().totalDurationMs

  conductor.subscribe((snap) => {
    if (
      snap.playbackState !== prevPlaybackState ||
      snap.interactionMode !== prevInteractionMode ||
      snap.isLooping !== prevIsLooping ||
      snap.loopDelayMs !== prevLoopDelayMs ||
      snap.speed !== prevSpeed ||
      snap.totalDurationMs !== prevTotalDurationMs
    ) {
      prevPlaybackState = snap.playbackState
      prevInteractionMode = snap.interactionMode
      prevIsLooping = snap.isLooping
      prevLoopDelayMs = snap.loopDelayMs
      prevSpeed = snap.speed
      prevTotalDurationMs = snap.totalDurationMs

      store.setState({
        playbackState: snap.playbackState,
        isPlaying:
          snap.interactionMode === "scrub" &&
          (snap.playbackState === "playing" ||
            snap.playbackState === "resting"),
        isLooping: snap.isLooping,
        loopDelayMs: snap.loopDelayMs,
        speed: snap.speed,
        totalDurationMs: snap.totalDurationMs,
      })
    }
  })

  // Apply initial hash if supplied
  if (options?.initialHash) {
    fullStore.getState().applyUrlHash(options.initialHash)
  }

  // If initial mode is customize, initialize draftCurve and sync
  if (initialMode === "customize") {
    const st = fullStore.getState()
    if (!st.draftCurve) {
      let targetCh = st.focusedChannelId
      if (targetCh === "all" && st.focusedTrackId !== "primitives:all") {
        const tr = st.getFocusedTrack()
        const nonOpacity = tr.channels.find((c) => c.property !== "opacity")
        targetCh = nonOpacity?.id ?? tr.channels[0]?.id ?? "all"
        if (targetCh !== "all") {
          fullStore.setState({ focusedChannelId: targetCh })
        }
      }
      const curve = fullStore.getState().getActiveCurve()
      const inTree = findCurveInCustomTree(
        fullStore.getState().customCurves,
        curve.id
      )
      const scope: DraftScope = inTree ? inTree.scope : "preset"
      const draft = startDraftReducer(curve, scope)
      fullStore.setState({
        mode: "customize",
        draftCurve: draft,
        activeLibraryTab: curve.engine,
      })
    }

    if (initialCustomizePreviewMode === "primitives") {
      fullStore.getState().setCustomizePreviewMode("primitives")
    }
  }

  // Initial duration sync
  const finalState = fullStore.getState()
  const initialDuration = getTrackTotalDurationMs(
    { channels: finalState.trackBindings[finalState.focusedTrackId] ?? [] },
    finalState.isReducedMotion
  )
  conductor.focusTrack(finalState.focusedTrackId, initialDuration)
  fullStore.setState({ totalDurationMs: initialDuration })

  // Single-subscriber persistence watcher (ignores 120fps clock/playback/lens ticks)
  if (options?.storage) {
    let prevSnapshot = {
      customCurves: fullStore.getState().customCurves,
      draftCurve: fullStore.getState().draftCurve,
      trackBindings: fullStore.getState().trackBindings,
      compareQueue: fullStore.getState().compareQueue,
      globalCompareTarget: fullStore.getState().globalCompareTarget,
      mode: fullStore.getState().mode,
      customizePreviewMode: fullStore.getState().customizePreviewMode,
      focusedTrackId: fullStore.getState().focusedTrackId,
      focusedChannelId: fullStore.getState().focusedChannelId,
      stashedComponentTrackId: fullStore.getState().stashedComponentTrackId,
      stashedComponentChannelId: fullStore.getState().stashedComponentChannelId,
      navStack: fullStore.getState().navStack,
      activeLibraryTab: fullStore.getState().activeLibraryTab,
      viewport: fullStore.getState().viewport,
      preferredExporter: fullStore.getState().preferredExporter,
      exportScope: fullStore.getState().exportScope,
      loopDelayMs: fullStore.getState().loopDelayMs,
    }

    fullStore.subscribe((state) => {
      if (
        state.customCurves !== prevSnapshot.customCurves ||
        state.draftCurve !== prevSnapshot.draftCurve ||
        state.trackBindings !== prevSnapshot.trackBindings ||
        state.compareQueue !== prevSnapshot.compareQueue ||
        state.globalCompareTarget !== prevSnapshot.globalCompareTarget ||
        state.mode !== prevSnapshot.mode ||
        state.customizePreviewMode !== prevSnapshot.customizePreviewMode ||
        state.focusedTrackId !== prevSnapshot.focusedTrackId ||
        state.focusedChannelId !== prevSnapshot.focusedChannelId ||
        state.stashedComponentTrackId !==
          prevSnapshot.stashedComponentTrackId ||
        state.stashedComponentChannelId !==
          prevSnapshot.stashedComponentChannelId ||
        state.navStack !== prevSnapshot.navStack ||
        state.activeLibraryTab !== prevSnapshot.activeLibraryTab ||
        state.viewport !== prevSnapshot.viewport ||
        state.preferredExporter !== prevSnapshot.preferredExporter ||
        state.exportScope !== prevSnapshot.exportScope ||
        state.loopDelayMs !== prevSnapshot.loopDelayMs
      ) {
        prevSnapshot = {
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
        }
        state.persist()
      }
    })
  }

  return fullStore
}
