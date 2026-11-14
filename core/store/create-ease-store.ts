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
  TransitionTrackPlugin,
  ViewportPreset,
} from "../schema"
import {
  DEFAULT_CUSTOM_CURVES,
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../presets/index"
import { trackRegistry } from "../registry/tracks"
import {
  compileChannelExport,
  compileTrackExport,
  ExporterId,
} from "../registry/exporters"
import { TrackConductor } from "../clock/track-conductor"
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
  viewport: ViewportPreset
  navStack: NavStackState
  isExportOpen: boolean
  exportScope: "channel" | "track"
  preferredExporter: ExporterId
  isReducedMotion: boolean
  searchQuery: string

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
  setExportScope: (scope: "channel" | "track") => void
  setPreferredExporter: (exporter: ExporterId) => void
  setReducedMotion: (reduced: boolean) => void
  setSearchQuery: (query: string) => void

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

  // 5. Export, Persistence & URL Hash
  getActiveExportCode: (
    exporterId?: ExporterId,
    scope?: "channel" | "track"
  ) => string
  getShareUrlHash: () => string
  applyUrlHash: (hashOrUrl: string) => boolean
  persist: () => void
}

export type EaseStore = StoreApi<EaseStoreState> & {
  conductor: TrackConductor
}

const DEFAULT_STORAGE_KEY = "ease_v2_store"

function getPairedTrackId(trackId: string): string | null {
  const [component, phase] = trackId.split(":")
  if (!component || !phase) return null
  const opposites: Record<string, string> = {
    open: "close",
    close: "open",
    enter: "exit",
    exit: "enter",
    press: "release",
    release: "press",
  }
  const opposite = opposites[phase]
  if (!opposite) return null
  const candidate = `${component}:${opposite}`
  return trackRegistry.has(candidate) ? candidate : null
}

export function createEaseStore(options?: CreateEaseStoreOptions): EaseStore {
  const conductor = options?.conductor ?? new TrackConductor()
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY

  let initialCustomCurves = DEFAULT_CUSTOM_CURVES.map(cloneCurve)
  let initialExporter: ExporterId = "tailwind"
  let initialTrackId = "dialog:open"
  const initialChannelId: string | "all" = "all"

  if (options?.storage) {
    try {
      const raw = options.storage.getItem(storageKey)
      if (raw) {
        const persisted = deserializeEaseStorage(raw)
        initialCustomCurves = persisted.customCurves
        initialExporter = persisted.preferredExporter
        initialTrackId = persisted.activeTrackId
      }
    } catch {
      // safe fallback
    }
  }

  const initialBindings = createInitialTrackBindings(trackRegistry.list())

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
      const soloId =
        state.isSolo && state.focusedChannelId !== "all"
          ? state.focusedChannelId
          : null
      return getTrackTotalDurationMs(
        { channels },
        state.isReducedMotion,
        soloId
      )
    }

    function syncDuration(): void {
      conductor.setTotalDurationMs(computeDuration())
    }

    return {
      // 1. Workspace Slice
      mode: "preview",
      customizePreviewMode: "component",
      viewport: "desktop",
      navStack: { level: 0 },
      isExportOpen: false,
      exportScope: "channel",
      preferredExporter: initialExporter,
      isReducedMotion: false,
      searchQuery: "",

      setMode: (mode) => {
        set({ mode })
        syncDuration()
      },
      enterCustomize: () => {
        const curve = get().getActiveCurve()
        const inTree = findCurveInCustomTree(get().customCurves, curve.id)
        const scope: DraftScope = inTree ? inTree.scope : "preset"
        set({
          mode: "customize",
          draftCurve: startDraftReducer(curve, scope),
          activeLibraryTab: curve.engine,
        })
        syncDuration()
      },
      exitCustomize: () => {
        set({ mode: "preview", draftCurve: null })
        syncDuration()
      },
      enterCompare: () => {
        set({ mode: "compare" })
        syncDuration()
      },
      exitCompare: () => {
        set({ mode: "preview" })
        syncDuration()
      },
      setCustomizePreviewMode: (mode) => set({ customizePreviewMode: mode }),
      setViewport: (viewport) => set({ viewport }),
      setNavStack: (navStack) => set({ navStack }),
      drillIntoCurve: (curveId) => set({ navStack: { level: 1, curveId } }),
      backToPresets: () => set({ navStack: { level: 0 } }),
      setExportOpen: (isExportOpen) => set({ isExportOpen }),
      setExportScope: (exportScope) => set({ exportScope }),
      setPreferredExporter: (preferredExporter) => {
        set({ preferredExporter })
        get().persist()
      },
      setReducedMotion: (isReducedMotion) => {
        set({ isReducedMotion })
        syncDuration()
      },
      setSearchQuery: (searchQuery) => set({ searchQuery }),

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

        const nextBindings = applyCurveToChannel(
          trackBindings,
          focusedTrackId,
          focusedChannelId,
          curve
        )
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
      activeLibraryTab: "bezier",
      draftCurve: null,

      setActiveLibraryTab: (activeLibraryTab) => set({ activeLibraryTab }),
      updateDraft: (patch) => {
        const { draftCurve, focusedTrackId, focusedChannelId, trackBindings } =
          get()
        if (!draftCurve) return
        const nextDraft = updateDraftMath(draftCurve, patch)
        const nextBindings = applyCurveToChannel(
          trackBindings,
          focusedTrackId,
          focusedChannelId,
          nextDraft.workingCurve
        )
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
        const nextBindings = applyCurveToChannel(
          trackBindings,
          focusedTrackId,
          focusedChannelId,
          reverted.workingCurve
        )
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
      compareQueue: [],
      globalCompareTarget: { trackId: "dialog:open", channelId: "all" },

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

      // 5. Export, Persistence & URL Hash
      getActiveExportCode: (exporterId, scope) => {
        const state = get()
        const expId = exporterId ?? state.preferredExporter
        const sc = scope ?? state.exportScope
        if (sc === "channel") {
          const ch = state.getFocusedChannel()
          return ch ? compileChannelExport(expId, ch) : ""
        }
        return compileTrackExport(expId, state.getFocusedTrack())
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
      persist: () => {
        if (!options?.storage) return
        try {
          const state = get()
          const payload = serializeEaseStorage({
            customCurves: state.customCurves,
            activeTrackId: state.focusedTrackId,
            activeChannelId:
              state.focusedChannelId === "all"
                ? "scale"
                : state.focusedChannelId,
            preferredExporter: state.preferredExporter,
            loopDelayMs: 400,
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

  // Apply initial hash if supplied
  if (options?.initialHash) {
    fullStore.getState().applyUrlHash(options.initialHash)
  }

  // Initial duration sync
  conductor.setTotalDurationMs(
    getTrackTotalDurationMs(
      { channels: fullStore.getState().trackBindings[initialTrackId] ?? [] },
      false
    )
  )

  return fullStore
}
