/**
 * @file core/store/create-ease-store.ts
 * @description Framework-agnostic vanilla Zustand store orchestrating all Satisium Ease state slices.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero React imports, zero browser globals.
 * - Composes Workspace, Track/Channel, Library (2-tier Git tree), and Compare slices.
 * - Strict Duration Integrity Law: channel.durationMs and savedBezierDurationMs are channel-owned.
 * - Integrates with TrackConductor at 120fps with mid-flight C1 interruption retargeting.
 */

import { createStore } from "zustand/vanilla"
import type { StoreApi } from "zustand/vanilla"

import {
  ChannelBinding,
  CompareItem,
  DraftCurveState,
  EaseCurve,
  MotionEngine,
  SpringDurationMode,
  StudioMode,
  TrackFrameResult,
  TransitionTrackPlugin,
  ViewportPreset,
} from "../schema"
import {
  DEFAULT_CUSTOM_CURVES,
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../presets/index"
import { getPairedTrackId, trackRegistry } from "../registry/tracks"
import {
  compileEaseOnly,
  compileEaseSnippet,
  compileTrackExport,
  ExporterId,
  ExportFormatScope,
} from "../registry/exporters"
import {
  PlaybackSpeed,
  PlaybackState,
  TrackConductor,
} from "../clock/track-conductor"
import {
  cloneCurve,
  commitDraft as commitDraftReducer,
  deleteCurveNode,
  findCurveInCustomTree,
  forkAsVariant as forkAsVariantReducer,
  forkPresetToRoot as forkPresetToRootReducer,
  getVariantsForDuel,
  NavStackState,
  promoteVariantToRoot,
  renameCurveNode,
  revertDraft as revertDraftReducer,
  startDraft as startDraftReducer,
  updateDraftMath,
} from "../state/curve-tree-reducers"
import {
  applyCurveToChannel,
  createInitialTrackBindings,
  resetTrackChannels,
  setChannelDelayMs,
  setChannelDurationMs,
  setChannelSpringMode,
  TrackChannelMap,
} from "../state/track-reducers"
import {
  CompareGlobalTarget,
  reorderCompareQueue as reorderCompareQueueReducer,
  removeFromCompare as removeFromCompareReducer,
  setTileOverride as setTileOverrideReducer,
  stageCurveToCompare as stageCurveToCompareReducer,
  stageVariantsForCompare as stageVariantsForCompareReducer,
  toggleCompareVisibility as toggleCompareVisibilityReducer,
} from "../state/compare-reducers"
import {
  deserializeEaseStorage,
  serializeEaseStorage,
  StorageAdapter,
} from "../codec/storage"
import { decodeEaseHash, encodeEaseHash } from "../codec/url-hash"
import { parseCurveString } from "../math/parser"
import {
  ChannelInterruptSnapshot,
  evaluateChannelAtTime,
  evaluateCompareTileFrame,
  getChannelEffectiveDurationMs,
  getTrackTotalDurationMs,
} from "../math/evaluator"

export type { StorageAdapter }
export type DraftScope = DraftCurveState["sourceScope"]

export interface CreateEaseStoreOptions {
  conductor?: TrackConductor
  storage?: StorageAdapter
  storageKey?: string
  initialHash?: string
}

export interface EaseStoreState {
  // 1. Workspace Slice
  mode: StudioMode
  customizePreviewMode: "component" | "primitives"
  stashedComponentTrackId: string | null
  stashedComponentChannelId: string | null
  viewport: ViewportPreset
  navStack: NavStackState
  isExportOpen: boolean
  exportScope: ExportFormatScope
  preferredExporter: ExporterId
  isReducedMotion: boolean
  searchQuery: string

  // Low-frequency conductor mirror (Zero 120fps re-render guarantee)
  playbackState: PlaybackState
  isPlaying: boolean
  isLooping: boolean
  loopDelayMs: number
  speed: PlaybackSpeed
  totalDurationMs: number

  setMode: (mode: StudioMode) => void
  enterCustomize: () => void
  exitCustomize: () => void
  enterCompare: () => void
  exitCompare: () => void
  setCustomizePreviewMode: (mode: "component" | "primitives") => void
  setViewport: (viewport: ViewportPreset) => void
  setNavStack: (navStack: NavStackState) => void
  drillIntoCurve: (curveId: string) => void
  backToPresets: () => void
  setExportOpen: (open: boolean) => void
  setExportScope: (scope: ExportFormatScope | "channel" | "track") => void
  setPreferredExporter: (exporter: ExporterId) => void
  setReducedMotion: (reduced: boolean) => void
  setSearchQuery: (query: string) => void

  playScoped: () => void
  pauseScoped: () => void
  togglePlayback: () => void
  seekScoped: (elapsedMs: number) => void
  setLooping: (loop: boolean) => void
  setLoopDelayMs: (ms: number) => void
  setSpeed: (speed: PlaybackSpeed) => void

  // 2. Track & Channel Slice
  focusedTrackId: string
  focusedChannelId: string | "all"
  isPinned: boolean
  isSolo: boolean
  trackBindings: TrackChannelMap

  getFocusedTrack: () => TransitionTrackPlugin
  getFocusedChannel: () => ChannelBinding | null
  getActiveCurve: () => EaseCurve

  focusTrack: (trackId: string) => void
  focusChannel: (channelIdOrAll: string | "all") => void
  setPinned: (pinned: boolean) => void
  toggleSolo: () => void
  selectCurveForFocused: (curveId: string) => void
  setFocusedDurationMs: (ms: number) => void
  setFocusedDelayMs: (ms: number) => void
  setFocusedSpringMode: (mode: SpringDurationMode) => void
  resetFocusedTrack: () => void
  triggerLive: (trackId: string) => void
  interruptActive: () => void

  // 3. Library & 2-Tier Git Tree Slice
  customCurves: EaseCurve[]
  activeLibraryTab: MotionEngine
  draftCurve: DraftCurveState | null

  setActiveLibraryTab: (engine: MotionEngine) => void
  updateDraft: (
    patch: Partial<
      Pick<
        EaseCurve,
        "name" | "engine" | "bezier" | "spring" | "suggestedDurationMs"
      >
    >
  ) => void
  revertActiveDraft: () => void
  commitActiveDraft: () => {
    committedCurve: EaseCurve
    nextDraft: DraftCurveState
  }
  forkActiveDraftToRoot: (name?: string) => EaseCurve | null
  forkActiveDraftAsVariant: (rootId: string, name?: string) => EaseCurve | null
  forkPresetToCustom: (
    presetId: string,
    customName?: string
  ) => EaseCurve | null
  addVariantToRoot: (
    rootId: string,
    sourceCurve?: EaseCurve,
    variantName?: string
  ) => EaseCurve | null
  promoteVariant: (
    rootId: string,
    variantId: string,
    newName?: string
  ) => EaseCurve | null
  renameCurve: (id: string, newName: string) => void
  deleteCurve: (id: string) => void
  importCurveString: (raw: string) => EaseCurve | null

  // 4. Compare Slice
  compareQueue: CompareItem[]
  globalCompareTarget: CompareGlobalTarget

  stageActiveCurveToCompare: () => void
  stageVariantsToCompare: (rootId: string) => void
  removeCompareItem: (itemId: string) => void
  toggleCompareItemVisibility: (itemId: string) => void
  reorderCompareItems: (fromIndex: number, toIndex: number) => void
  setGlobalCompareTarget: (target: Partial<CompareGlobalTarget>) => void
  setCompareTileOverride: (
    itemId: string,
    override: { trackId?: string; channelId?: string } | null
  ) => void
  applyCompareWinner: (itemId: string) => void
  evaluateCompareItemFrame: (
    itemId: string,
    elapsedMs?: number
  ) => TrackFrameResult | null

  // 5. Export, Persistence & URL Hash
  hydrateFromStorage: (rawJson?: string | null) => void
  getActiveExportCode: (
    exporterId?: ExporterId,
    scope?: ExportFormatScope | "channel" | "track",
    curveOverride?: EaseCurve
  ) => string
  getShareUrlHash: () => string
  applyUrlHash: (hashOrUrl: string) => boolean
  persist: () => void
}

export type EaseStore = StoreApi<EaseStoreState> & {
  conductor: TrackConductor
}

const DEFAULT_STORAGE_KEY = "satisium-ease-v3"

export function createEaseStore(options?: CreateEaseStoreOptions): EaseStore {
  const conductor = options?.conductor ?? new TrackConductor()
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY

  const defaultBindings = createInitialTrackBindings(trackRegistry.list())

  let initialCustomCurves = DEFAULT_CUSTOM_CURVES.map(cloneCurve)
  let initialDraftCurve: DraftCurveState | null = null
  let initialBindings = defaultBindings
  let initialCompareQueue: CompareItem[] = []
  let initialGlobalCompareTarget: CompareGlobalTarget = {
    trackId: "dialog:open",
    channelId: "all",
  }
  let initialMode: StudioMode = "preview"
  let initialCustomizePreviewMode: "component" | "primitives" = "component"
  let initialTrackId = "dialog:open"
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

    return {
      // 1. Workspace Slice
      mode: initialMode,
      customizePreviewMode: initialCustomizePreviewMode,
      stashedComponentTrackId: initialStashedComponentTrackId,
      stashedComponentChannelId: initialStashedComponentChannelId,
      viewport: initialViewport,
      navStack: initialNavStack,
      isExportOpen: false,
      exportScope: initialExportScope,
      preferredExporter: initialExporter,
      isReducedMotion: false,
      searchQuery: "",

      // Low-frequency conductor mirror (Zero 120fps re-render guarantee)
      playbackState: conductor.getSnapshot().playbackState,
      isPlaying:
        conductor.getSnapshot().interactionMode === "scrub" &&
        (conductor.getSnapshot().playbackState === "playing" ||
          conductor.getSnapshot().playbackState === "resting"),
      isLooping: conductor.getSnapshot().isLooping,
      loopDelayMs: conductor.getSnapshot().loopDelayMs,
      speed: conductor.getSnapshot().speed,
      totalDurationMs: conductor.getSnapshot().totalDurationMs,

      setMode: (mode) => {
        set({ mode })
        syncDuration()
        get().persist()
      },
      enterCustomize: () => {
        const state = get()
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
            set({ focusedChannelId: targetChannelId })
          }
        }
        const curve = get().getActiveCurve()
        const inTree = findCurveInCustomTree(get().customCurves, curve.id)
        const scope: DraftScope = inTree ? inTree.scope : "preset"
        set({
          mode: "customize",
          draftCurve: startDraftReducer(curve, scope),
          activeLibraryTab: curve.engine,
        })
        syncDuration()
        get().persist()
      },
      exitCustomize: () => {
        set({ mode: "preview", draftCurve: null })
        syncDuration()
        get().persist()
      },
      enterCompare: () => {
        set({ mode: "compare" })
        syncDuration()
        get().persist()
      },
      exitCompare: () => {
        set({ mode: "preview" })
        syncDuration()
        get().persist()
      },
      setCustomizePreviewMode: (mode) => {
        const state = get()
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

          set({
            customizePreviewMode: "primitives",
            stashedComponentTrackId: stashedTrack,
            stashedComponentChannelId: stashedChannel,
            focusedTrackId: "primitives:all",
            focusedChannelId: "all",
            isSolo: false,
            trackBindings: nextBindings,
          })
          conductor.setSoloActive(false)
          conductor.focusTrack("primitives:all", computeDuration())
          syncDuration()
          get().persist()
        } else {
          const targetTrackId = state.stashedComponentTrackId ?? "dialog:open"
          let targetChannelId = state.stashedComponentChannelId ?? "all"
          if (targetChannelId === "all" || !targetChannelId) {
            const tr = trackRegistry.get(targetTrackId)
            if (tr) {
              const nonOpacity = tr.channels.find(
                (c) => c.property !== "opacity"
              )
              targetChannelId = nonOpacity?.id ?? tr.channels[0]?.id ?? "all"
            }
          }
          set({
            customizePreviewMode: "component",
            stashedComponentTrackId: null,
            stashedComponentChannelId: null,
            focusedTrackId: targetTrackId,
            focusedChannelId: targetChannelId,
            isSolo: false,
          })
          conductor.setSoloActive(false)
          conductor.focusTrack(targetTrackId, computeDuration())
          syncDuration()
          get().persist()
        }
      },
      setViewport: (viewport) => set({ viewport }),
      setNavStack: (navStack) => {
        set({ navStack })
        get().persist()
      },
      drillIntoCurve: (curveId) => {
        set({ navStack: { level: 1, curveId } })
        get().persist()
      },
      backToPresets: () => {
        set({ navStack: { level: 0 } })
        get().persist()
      },
      setExportOpen: (isExportOpen) => set({ isExportOpen }),
      setExportScope: (exportScope) => {
        const normalized: ExportFormatScope =
          exportScope === "snippet" || exportScope === "track"
            ? "snippet"
            : "ease"
        set({ exportScope: normalized })
      },
      setPreferredExporter: (preferredExporter) => {
        set({ preferredExporter })
        get().persist()
      },
      setReducedMotion: (isReducedMotion) => {
        set({ isReducedMotion })
        syncDuration()
      },
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      playScoped: () => conductor.playScoped(computeDuration()),
      pauseScoped: () => conductor.pause(),
      togglePlayback: () => conductor.togglePlay(computeDuration()),
      seekScoped: (elapsedMs) => {
        const state = get()
        if (state.mode !== "compare" && state.focusedChannelId !== "all") {
          const channels = state.trackBindings[state.focusedTrackId] ?? []
          const channelDuration = getTrackTotalDurationMs(
            { channels },
            state.isReducedMotion,
            state.focusedChannelId
          )
          if (conductor.getSnapshot().totalDurationMs !== channelDuration) {
            conductor.setTotalDurationMs(channelDuration)
            if (get().totalDurationMs !== channelDuration) {
              set({ totalDurationMs: channelDuration })
            }
          }
        }
        const maxDuration = conductor.getSnapshot().totalDurationMs
        const clamped = Math.max(0, Math.min(elapsedMs, maxDuration))
        conductor.seek(clamped)
      },
      setLooping: (isLooping) => conductor.setLooping(isLooping),
      setLoopDelayMs: (ms) => {
        conductor.setLoopDelayMs(ms)
        get().persist()
      },
      setSpeed: (speed) => conductor.setSpeed(speed),

      // 2. Track & Channel Slice
      focusedTrackId: initialTrackId,
      focusedChannelId: initialChannelId,
      isPinned: false,
      isSolo: false,
      trackBindings: initialBindings,

      getFocusedTrack: () => {
        const { focusedTrackId, trackBindings } = get()
        const base =
          trackRegistry.get(focusedTrackId) ?? trackRegistry.list()[0]
        return {
          ...base,
          channels: trackBindings[focusedTrackId] ?? base.channels,
        }
      },
      getFocusedChannel: () => {
        const { focusedTrackId, focusedChannelId, trackBindings } = get()
        const channels = trackBindings[focusedTrackId] ?? []
        if (focusedChannelId !== "all") {
          return channels.find((c) => c.id === focusedChannelId) ?? null
        }
        return channels[0] ?? null
      },
      getActiveCurve: () => {
        return get().getFocusedChannel()?.curve ?? DEFAULT_FALLBACK_CURVE
      },

      focusTrack: (trackId) => {
        set({ focusedTrackId: trackId, focusedChannelId: "all", isSolo: false })
        conductor.setSoloActive(false)
        conductor.focusTrack(trackId, computeDuration())
      },
      focusChannel: (channelIdOrAll) => {
        const resetSolo = channelIdOrAll === "all"
        set({
          focusedChannelId: channelIdOrAll,
          isSolo: resetSolo ? false : get().isSolo,
        })
        if (resetSolo) conductor.setSoloActive(false)
        syncDuration()
      },
      setPinned: (isPinned) => {
        set({ isPinned })
        conductor.setPinned(isPinned)
      },
      toggleSolo: () => {
        if (get().focusedChannelId === "all") return
        const nextSolo = !get().isSolo
        set({ isSolo: nextSolo })
        conductor.setSoloActive(nextSolo)
        syncDuration()
      },
      selectCurveForFocused: (curveId) => {
        const {
          focusedTrackId,
          focusedChannelId,
          customCurves,
          mode,
          trackBindings,
        } = get()
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

        set({
          trackBindings: nextBindings,
          draftCurve:
            mode === "customize"
              ? startDraftReducer(curve, scope)
              : get().draftCurve,
          activeLibraryTab: curve.engine,
        })
        syncDuration()
        get().persist()
      },
      setFocusedDurationMs: (ms) => {
        const { focusedTrackId, focusedChannelId, trackBindings } = get()
        const target =
          focusedChannelId === "all"
            ? trackBindings[focusedTrackId]?.[0]?.id
            : focusedChannelId
        if (!target) return
        set({
          trackBindings: setChannelDurationMs(
            trackBindings,
            focusedTrackId,
            target,
            ms
          ),
        })
        syncDuration()
        get().persist()
      },
      setFocusedDelayMs: (ms) => {
        const { focusedTrackId, focusedChannelId, trackBindings } = get()
        const target =
          focusedChannelId === "all"
            ? trackBindings[focusedTrackId]?.[0]?.id
            : focusedChannelId
        if (!target) return
        set({
          trackBindings: setChannelDelayMs(
            trackBindings,
            focusedTrackId,
            target,
            ms
          ),
        })
        syncDuration()
        get().persist()
      },
      setFocusedSpringMode: (mode) => {
        const { focusedTrackId, focusedChannelId, trackBindings } = get()
        const target =
          focusedChannelId === "all"
            ? trackBindings[focusedTrackId]?.[0]?.id
            : focusedChannelId
        if (!target) return
        set({
          trackBindings: setChannelSpringMode(
            trackBindings,
            focusedTrackId,
            target,
            mode
          ),
        })
        syncDuration()
        get().persist()
      },
      resetFocusedTrack: () => {
        const { focusedTrackId, trackBindings } = get()
        const base = trackRegistry.get(focusedTrackId)
        if (!base) return
        set({
          trackBindings: resetTrackChannels(
            trackBindings,
            focusedTrackId,
            base
          ),
        })
        syncDuration()
        get().persist()
      },
      triggerLive: (trackId) => {
        if (!get().isPinned) {
          set({
            focusedTrackId: trackId,
            focusedChannelId: "all",
            isSolo: false,
          })
          conductor.setSoloActive(false)
        }
        conductor.triggerLive(trackId, computeDuration())
      },
      interruptActive: () => {
        const state = get()
        const elapsed = conductor.getSnapshot().elapsedMs

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
                conductor.getSnapshot().interruptions[`${item.id}:${ch.id}`] ??
                conductor.getSnapshot().interruptions[ch.id]

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
            set({
              globalCompareTarget: {
                ...state.globalCompareTarget,
                trackId: nextTrackId,
              },
            })
          }

          const nextDuration = computeDuration()
          conductor.interrupt({
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
            interruption: conductor.getSnapshot().interruptions[ch.id],
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

        set({
          focusedTrackId: nextTrackId,
          focusedChannelId: "all",
          isSolo: false,
        })
        conductor.setSoloActive(false)
        const nextDuration = computeDuration()
        conductor.interrupt({
          nextTrackId,
          nextDurationMs: nextDuration,
          snapshots,
        })
      },

      // 3. Library & 2-Tier Git Tree Slice
      customCurves: initialCustomCurves,
      activeLibraryTab: initialActiveLibraryTab,
      draftCurve: initialDraftCurve,

      setActiveLibraryTab: (activeLibraryTab) => set({ activeLibraryTab }),
      updateDraft: (patch) => {
        const { draftCurve, focusedTrackId, focusedChannelId, trackBindings } =
          get()
        if (!draftCurve) return
        const nextDraft = updateDraftMath(draftCurve, patch)
        let nextBindings = applyCurveToChannel(
          trackBindings,
          focusedTrackId,
          focusedChannelId,
          nextDraft.workingCurve
        )
        if (focusedTrackId === "primitives:all") {
          const primChannels = nextBindings["primitives:all"] ?? []
          nextBindings = {
            ...nextBindings,
            "primitives:all": primChannels.map((ch) => ({
              ...ch,
              durationMs: nextDraft.workingCurve.suggestedDurationMs,
              springMode: (nextDraft.workingCurve.engine === "spring"
                ? "natural"
                : "fit") as SpringDurationMode,
            })),
          }
        }
        set({
          draftCurve: nextDraft,
          trackBindings: nextBindings,
          activeLibraryTab: nextDraft.workingCurve.engine,
        })
        syncDuration()
      },
      revertActiveDraft: () => {
        const { draftCurve, focusedTrackId, focusedChannelId, trackBindings } =
          get()
        if (!draftCurve) return
        const reverted = revertDraftReducer(draftCurve)
        let nextBindings = applyCurveToChannel(
          trackBindings,
          focusedTrackId,
          focusedChannelId,
          reverted.workingCurve
        )
        if (focusedTrackId === "primitives:all") {
          const primChannels = nextBindings["primitives:all"] ?? []
          nextBindings = {
            ...nextBindings,
            "primitives:all": primChannels.map((ch) => ({
              ...ch,
              durationMs: reverted.workingCurve.suggestedDurationMs,
              springMode: (reverted.workingCurve.engine === "spring"
                ? "natural"
                : "fit") as SpringDurationMode,
            })),
          }
        }
        set({
          draftCurve: reverted,
          trackBindings: nextBindings,
          activeLibraryTab: reverted.workingCurve.engine,
        })
        syncDuration()
      },
      commitActiveDraft: () => {
        const { customCurves, draftCurve } = get()
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
          set({ customCurves: result.customCurves, draftCurve: nextDraft })
          get().persist()
          return { committedCurve: cloneCurve(result.created), nextDraft }
        }
        const result = commitDraftReducer(customCurves, draftCurve)
        set({ customCurves: result.customCurves, draftCurve: result.nextDraft })
        get().persist()
        return {
          committedCurve: result.committedCurve,
          nextDraft: result.nextDraft,
        }
      },
      forkActiveDraftToRoot: (name) => {
        const { customCurves, draftCurve } = get()
        if (!draftCurve) return null
        const result = forkPresetToRootReducer(
          customCurves,
          draftCurve.workingCurve,
          name
        )
        const nextDraft = startDraftReducer(result.created, "custom-root")
        set({ customCurves: result.customCurves, draftCurve: nextDraft })
        get().persist()
        return result.created
      },
      forkActiveDraftAsVariant: (rootId, name) => {
        const { customCurves, draftCurve } = get()
        if (!draftCurve) return null
        const result = forkAsVariantReducer(
          customCurves,
          rootId,
          draftCurve.workingCurve,
          name
        )
        if (result.created) {
          const nextDraft = startDraftReducer(result.created, "custom-variant")
          set({ customCurves: result.customCurves, draftCurve: nextDraft })
          get().persist()
        }
        return result.created
      },
      forkPresetToCustom: (presetId, customName) => {
        const source =
          getCanonicalPresetById(presetId) ??
          findCurveInCustomTree(get().customCurves, presetId)?.node
        if (!source) return null
        const result = forkPresetToRootReducer(
          get().customCurves,
          source,
          customName
        )
        set({ customCurves: result.customCurves })
        get().persist()
        return result.created
      },
      addVariantToRoot: (rootId, sourceCurve, variantName) => {
        const root = get().customCurves.find((c) => c.id === rootId)
        if (!root) return null
        const base = sourceCurve ?? root
        const result = forkAsVariantReducer(
          get().customCurves,
          rootId,
          base,
          variantName
        )
        if (!result.created) return null
        set({ customCurves: result.customCurves })
        get().persist()
        return result.created
      },
      promoteVariant: (rootId, variantId, newName) => {
        const { customCurves } = get()
        const result = promoteVariantToRoot(
          customCurves,
          rootId,
          variantId,
          newName
        )
        set({ customCurves: result.customCurves })
        get().persist()
        return result.promoted
      },
      renameCurve: (id, newName) => {
        const { customCurves, draftCurve } = get()
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
        set({ customCurves: updated, draftCurve: nextDraft })
        get().persist()
      },
      deleteCurve: (id) => {
        const { customCurves, draftCurve, navStack } = get()
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
        set({
          customCurves: result.customCurves,
          navStack: result.nextNavStack,
          draftCurve: nextDraft,
        })
        get().persist()
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
        set({ customCurves: [created, ...get().customCurves] })
        get().selectCurveForFocused(created.id)
        get().persist()
        return created
      },

      // 4. Compare Slice
      compareQueue: initialCompareQueue,
      globalCompareTarget: initialGlobalCompareTarget,

      stageActiveCurveToCompare: () => {
        const curve = get().getActiveCurve()
        set({
          compareQueue: stageCurveToCompareReducer(get().compareQueue, curve),
        })
        syncDuration()
      },
      stageVariantsToCompare: (rootId) => {
        const curves = getVariantsForDuel(get().customCurves, rootId)
        set({
          compareQueue: stageVariantsForCompareReducer(
            get().compareQueue,
            curves
          ),
          mode: "compare",
        })
        syncDuration()
      },
      removeCompareItem: (itemId) => {
        set({
          compareQueue: removeFromCompareReducer(get().compareQueue, itemId),
        })
        syncDuration()
      },
      toggleCompareItemVisibility: (itemId) => {
        set({
          compareQueue: toggleCompareVisibilityReducer(
            get().compareQueue,
            itemId
          ),
        })
        syncDuration()
      },
      reorderCompareItems: (fromIndex: number, toIndex: number) => {
        set({
          compareQueue: reorderCompareQueueReducer(
            get().compareQueue,
            fromIndex,
            toIndex
          ),
        })
      },
      setGlobalCompareTarget: (target) => {
        set({
          globalCompareTarget: { ...get().globalCompareTarget, ...target },
        })
        syncDuration()
      },
      setCompareTileOverride: (itemId, override) => {
        set({
          compareQueue: setTileOverrideReducer(
            get().compareQueue,
            itemId,
            override
          ),
        })
        syncDuration()
      },
      applyCompareWinner: (itemId) => {
        const winner = get().compareQueue.find(
          (i) => i.id === itemId || i.curve.id === itemId
        )
        if (winner) {
          get().selectCurveForFocused(winner.curve.id)
        }
        set({ mode: "preview" })
        syncDuration()
      },
      evaluateCompareItemFrame: (itemId, elapsedMs) => {
        const state = get()
        const item = state.compareQueue.find((i) => i.id === itemId)
        if (!item) return null

        const effectiveElapsed =
          elapsedMs !== undefined
            ? elapsedMs
            : conductor.getSnapshot().elapsedMs
        const trackId =
          item.overrideTrackId ?? state.globalCompareTarget.trackId
        const track = trackRegistry.get(trackId) ?? trackRegistry.list()[0]
        const channels = state.trackBindings[track.id] ?? track.channels
        const targetChannelId =
          item.overrideChannelId ?? state.globalCompareTarget.channelId

        const conductorSnap = conductor.getSnapshot()
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

      // 5. Export, Persistence & URL Hash
      getActiveExportCode: (exporterId, scope, curveOverride) => {
        const state = get()
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
        const state = get()
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
        const state = get()
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
            set({
              trackBindings: applyCurveToChannel(
                get().trackBindings,
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
        if (raw === undefined && options?.storage) {
          raw = options.storage.getItem(storageKey)
          if (!raw && storageKey === DEFAULT_STORAGE_KEY) {
            raw =
              options.storage.getItem("satisium-ease-v2") ??
              options.storage.getItem("ease_v2_store")
          }
        }
        if (!raw) return

        const freshDefaults = createInitialTrackBindings(trackRegistry.list())
        const p = deserializeEaseStorage(raw, freshDefaults)

        conductor.setLoopDelayMs(p.loopDelayMs)
        conductor.setSoloActive(false)
        conductor.setPinned(false)
        conductor.setSpeed(1)
        conductor.setLooping(false)
        conductor.pause()
        conductor.seek(0)

        set({
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

        syncDuration()
      },
      persist: () => {
        if (!options?.storage) return
        try {
          const state = get()
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
          options.storage.setItem(storageKey, payload)
        } catch {
          // safe fallback
        }
      },
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
  conductor.setTotalDurationMs(initialDuration)
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
